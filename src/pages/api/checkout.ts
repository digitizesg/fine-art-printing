import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../lib/supabase-server";
import { idempotencyKey } from "../../lib/stripe-idem";
import { listPapers } from "../../lib/papers";
import { listCanvases } from "../../lib/canvases";
import { listFloatFrames } from "../../lib/float-frames";
import { DELIVERY_LOCAL_SELL } from "../../data/pricing/canvas";
import { priceShopLine, type ShopCatalog } from "../../lib/shop-pricing";

export const prerender = false;

interface IncomingLine {
  id: string;
  artworkId: string;
  artworkSlug: string;
  artworkTitle: string;
  artworkArtist?: string | null;
  artworkImageUrl: string;
  substrate: "paper" | "canvas";
  widthCm: number;
  heightCm: number;
  quantity: number;
  paperSlug?: string;
  borderCm?: number;
  canvasSlug?: string;
  finishing?: "none" | "1in" | "1.5in" | "float";
  floatFrameSlug?: string | null;
  futureMargin?: boolean;
  wrapType?: "mirror" | "gallery" | "colour";
}

interface CheckoutBody {
  lines: IncomingLine[];
  delivery: "self" | "local";
}

interface PricedLine {
  artworkId: string;
  artworkSlug: string;
  artworkTitle: string;
  artworkArtist?: string | null;
  artworkImageUrl: string;
  substrate: "paper" | "canvas";
  widthCm: number;
  heightCm: number;
  quantity: number;
  unitPriceSGD: number;
  description: string;
  /** Server-resolved configuration (slugs as the customer chose). */
  config: Record<string, unknown>;
}

const DELIVERY_LOCAL_SGD = DELIVERY_LOCAL_SELL;
const DELIVERY_LOCAL_CENTS = DELIVERY_LOCAL_SGD * 100;

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, url }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return bad(
      "Checkout is not yet configured on this environment. Add STRIPE_SECRET_KEY in Vercel and redeploy.",
      503,
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return bad("Invalid JSON body.");
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return bad("Cart is empty.");
  }

  // Re-resolve catalog data server-side. Never trust the client's price.
  const [papers, canvases, floatFrames] = await Promise.all([
    listPapers(),
    listCanvases(),
    listFloatFrames(),
  ]);
  const catalog: ShopCatalog = {
    papers: papers.map((p) => ({
      id: p.slug,
      name: p.name,
      sellPricePerSqm: p.sellPricePerSqm,
      maxPrintWidthCm: p.maxPrintWidthCm,
      maxPrintLengthCm: p.maxPrintLengthCm,
    })),
    canvases: canvases.map((c) => ({
      id: c.slug,
      name: c.name,
      sellPricePerSqm: c.sellPricePerSqm,
      maxPrintWidthCm: c.maxPrintWidthCm,
      maxPrintLengthCm: c.maxPrintLengthCm,
    })),
    floatFrames: floatFrames.map((f) => ({ id: f.slug, label: f.label, sellPerM: f.sellPerM })),
  };

  const priced: PricedLine[] = [];
  const stripeLineItems: NonNullable<
    Stripe.Checkout.SessionCreateParams["line_items"]
  >[number][] = [];

  for (const line of body.lines) {
    const qty = Math.max(1, Math.min(20, Math.floor(line.quantity || 1)));
    if (!Number.isFinite(line.widthCm) || !Number.isFinite(line.heightCm)) {
      return bad(`Invalid dimensions on "${line.artworkTitle}".`);
    }

    let unitSGD = 0;
    let descriptionParts: string[] = [];
    const config: Record<string, unknown> = {};

    const result = priceShopLine(line, catalog);
    if (!result.ok) {
      if (result.reason === "unknown-substrate") {
        return bad(`Unknown substrate on "${line.artworkTitle}".`);
      }
      if (result.reason === "quote") return bad(`${line.artworkTitle}: ${result.message}`);
      return bad(result.message);
    }
    unitSGD = result.unitPriceSGD;

    if (result.substrate === "paper") {
      const { paper, borderCm: border } = result;
      descriptionParts.push(`${line.widthCm} × ${line.heightCm} cm`, paper.name);
      if (border > 0) descriptionParts.push(`${border}cm border`);
      config.paperSlug = paper.id;
      config.paperName = paper.name;
      if (border > 0) config.borderCm = border;
    } else {
      const { canvas, finishing, futureMargin, floatFrame } = result;
      if (floatFrame) {
        config.floatFrameSlug = floatFrame.id;
        config.floatFrameLabel = floatFrame.label;
      }
      descriptionParts.push(`${line.widthCm} × ${line.heightCm} cm`, canvas.name);
      if (finishing === "1in") descriptionParts.push('1" stretching');
      else if (finishing === "1.5in") descriptionParts.push('1.5" stretching');
      else if (finishing === "float" && floatFrame) {
        descriptionParts.push(`Float frame (${floatFrame.label})`);
      } else if (finishing === "none") {
        descriptionParts.push(futureMargin ? "Rolled + 1.5\" stretching margin" : "Rolled");
        if (line.wrapType) descriptionParts.push(`Wrap: ${line.wrapType}`);
      }
      config.canvasSlug = canvas.id;
      config.canvasName = canvas.name;
      config.finishing = finishing;
      if (futureMargin) config.futureMargin = true;
      if (line.wrapType) config.wrapType = line.wrapType;
    }

    const description = descriptionParts.join(" · ");
    priced.push({
      artworkId: line.artworkId,
      artworkSlug: line.artworkSlug,
      artworkTitle: line.artworkTitle,
      artworkArtist: line.artworkArtist ?? null,
      artworkImageUrl: line.artworkImageUrl,
      substrate: line.substrate,
      widthCm: line.widthCm,
      heightCm: line.heightCm,
      quantity: qty,
      unitPriceSGD: unitSGD,
      description,
      config,
    });

    stripeLineItems.push({
      quantity: qty,
      price_data: {
        currency: "sgd",
        unit_amount: Math.round(unitSGD * 100),
        product_data: {
          name: line.artworkTitle,
          description,
          images: line.artworkImageUrl ? [line.artworkImageUrl] : undefined,
        },
      },
    });
  }

  if (body.delivery === "local") {
    stripeLineItems.push({
      quantity: 1,
      price_data: {
        currency: "sgd",
        unit_amount: DELIVERY_LOCAL_CENTS,
        product_data: { name: "Local Singapore delivery" },
      },
    });
  }

  const subtotalSGD = priced.reduce((s, l) => s + l.unitPriceSGD * l.quantity, 0);
  const deliverySGD = body.delivery === "local" ? DELIVERY_LOCAL_SGD : 0;
  const totalSGD = subtotalSGD + deliverySGD;

  const stripe = new Stripe(stripeKey);
  const origin = url.origin;

  // Idempotency key derived from the priced cart + delivery so a
  // double-clicked "checkout" button returns the same Stripe session
  // instead of creating duplicate pending orders.
  const idemKey = idempotencyKey("shop", { priced, delivery: body.delivery });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: stripeLineItems,
        shipping_address_collection:
          body.delivery === "local"
            ? { allowed_countries: ["SG"] }
            : undefined,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart`,
        metadata: {
          source: "fineartprinting",
          delivery: body.delivery,
        },
      },
      { idempotencyKey: idemKey },
    );
  } catch (e: any) {
    return bad(`Stripe error: ${e?.message ?? String(e)}`, 502);
  }

  // Best-effort: write a pending order row so we can correlate the
  // webhook back to a known cart snapshot. If the insert fails (e.g.
  // Supabase down) we still let checkout proceed; the webhook will
  // create the row from session data on completion.
  try {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from("orders").insert({
        stripe_session_id: session.id,
        status: "pending",
        delivery_method: body.delivery,
        subtotal_sgd: subtotalSGD,
        delivery_sgd: deliverySGD,
        total_sgd: totalSGD,
        line_items: priced,
      });
    }
  } catch (e) {
    console.error("[checkout] failed to insert pending order:", e);
  }

  return new Response(
    JSON.stringify({ url: session.url, id: session.id }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
