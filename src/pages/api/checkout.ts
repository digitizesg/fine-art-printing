import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../lib/supabase-server";
import { listPapers } from "../../lib/papers";
import { listCanvases } from "../../lib/canvases";
import { listFloatFrames } from "../../lib/float-frames";
import { quotePaperPrint } from "../../data/pricing/paper";
import { SHOP_ARTWORK_BASE_SGD } from "../../data/pricing/shop";
import {
  quoteCanvasPrint,
  type FloatFrameColour,
  type StretchingChoice,
} from "../../data/pricing/canvas";

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

const DELIVERY_LOCAL_SGD = 30;
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

  const priced: PricedLine[] = [];
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const line of body.lines) {
    const qty = Math.max(1, Math.min(20, Math.floor(line.quantity || 1)));
    if (!Number.isFinite(line.widthCm) || !Number.isFinite(line.heightCm)) {
      return bad(`Invalid dimensions on "${line.artworkTitle}".`);
    }

    let unitSGD = 0;
    let descriptionParts: string[] = [];
    const config: Record<string, unknown> = {};

    if (line.substrate === "paper") {
      const paper = papers.find((p) => p.slug === line.paperSlug);
      if (!paper) return bad(`Paper not found: ${line.paperSlug}`);
      const border = Math.max(0, Number(line.borderCm) || 0);
      const result = quotePaperPrint({
        paper: {
          id: paper.slug,
          name: paper.name,
          sellPricePerSqm: paper.sellPricePerSqm,
          maxPrintWidthCm: paper.maxPrintWidthCm,
          maxPrintLengthCm: paper.maxPrintLengthCm,
        },
        widthCm: line.widthCm + border * 2,
        heightCm: line.heightCm + border * 2,
        quantity: 1,
      });
      if (!result.ok) return bad(`${line.artworkTitle}: ${result.message}`);
      // Match the shop-page calculation: engine total + flat artwork
      // base fee. Without this the cart shows S$X but Stripe charges
      // S$X-10 per print — direct revenue loss.
      unitSGD = result.grandTotal + SHOP_ARTWORK_BASE_SGD;
      descriptionParts.push(`${line.widthCm} × ${line.heightCm} cm`, paper.name);
      if (border > 0) descriptionParts.push(`${border}cm border`);
      config.paperSlug = paper.slug;
      config.paperName = paper.name;
      if (border > 0) config.borderCm = border;
    } else if (line.substrate === "canvas") {
      const canvas = canvases.find((c) => c.slug === line.canvasSlug);
      if (!canvas) return bad(`Canvas not found: ${line.canvasSlug}`);
      const finishing = line.finishing ?? "none";
      const futureMargin = !!line.futureMargin;

      let stretching: StretchingChoice = "none";
      let floatFrame: FloatFrameColour | null = null;
      if (finishing === "1in") stretching = "1in";
      else if (finishing === "1.5in") stretching = "1.5in";
      else if (finishing === "float") {
        stretching = "1in";
        const ff = floatFrames.find((f) => f.slug === line.floatFrameSlug);
        if (!ff) return bad(`Float frame not found: ${line.floatFrameSlug}`);
        floatFrame = { id: ff.slug, label: ff.label, costPerFoot: ff.costPerFoot };
        config.floatFrameSlug = ff.slug;
        config.floatFrameLabel = ff.label;
      }
      const marginCm = finishing === "none" && futureMargin ? 3.81 : 0;
      const result = quoteCanvasPrint({
        canvas: {
          id: canvas.slug,
          name: canvas.name,
          sellPricePerSqm: canvas.sellPricePerSqm,
          maxPrintWidthCm: canvas.maxPrintWidthCm,
          maxPrintLengthCm: canvas.maxPrintLengthCm,
        },
        widthCm: line.widthCm + marginCm * 2,
        heightCm: line.heightCm + marginCm * 2,
        stretching,
        floatFrame,
        delivery: "self",
      });
      if (!result.ok) return bad(`${line.artworkTitle}: ${result.message}`);
      unitSGD = result.grandTotal + SHOP_ARTWORK_BASE_SGD;
      descriptionParts.push(`${line.widthCm} × ${line.heightCm} cm`, canvas.name);
      if (finishing === "1in") descriptionParts.push('1" stretching');
      else if (finishing === "1.5in") descriptionParts.push('1.5" stretching');
      else if (finishing === "float" && floatFrame) {
        descriptionParts.push(`Float frame (${floatFrame.label})`);
      } else if (finishing === "none") {
        descriptionParts.push(futureMargin ? "Rolled + 1.5\" stretching margin" : "Rolled");
        if (line.wrapType) descriptionParts.push(`Wrap: ${line.wrapType}`);
      }
      config.canvasSlug = canvas.slug;
      config.canvasName = canvas.name;
      config.finishing = finishing;
      if (futureMargin) config.futureMargin = true;
      if (line.wrapType) config.wrapType = line.wrapType;
    } else {
      return bad(`Unknown substrate on "${line.artworkTitle}".`);
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

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems,
      shipping_address_collection:
        body.delivery === "local"
          ? { allowed_countries: ["SG"] }
          : undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        delivery: body.delivery,
      },
    });
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
