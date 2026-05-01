import { quotePaperPrint, formatSGD, PAPERS } from "../src/data/pricing/paper";

const cases = [
  { paper: "hahnemuhle-photo-rag", w: 50, h: 50, q: 1, label: "Photo Rag 50×50cm, 1 print" },
  { paper: "hahnemuhle-photo-rag", w: 80, h: 60, q: 1, label: "Photo Rag 80×60cm, 1 print" },
  { paper: "hahnemuhle-photo-rag", w: 100, h: 70, q: 2, label: "Photo Rag 100×70cm, qty 2" },
  { paper: "hahnemuhle-german-etching", w: 60, h: 90, q: 1, label: "German Etching 60×90cm" },
  { paper: "datajet-100-cotton-rag", w: 50, h: 50, q: 1, label: "100% Cotton Rag 50×50cm (value paper)" },
  { paper: "hahnemuhle-photo-silk-baryta", w: 120, h: 80, q: 1, label: "Silk Baryta 120×80cm" },
  { paper: "hahnemuhle-photo-rag", w: 200, h: 150, q: 1, label: "Photo Rag 200×150cm (oversize)" },
];

console.log("\n=== Featured papers in calculator ===");
for (const p of PAPERS) {
  console.log(`  ${p.shortName.padEnd(28)}  ${p.gsm}gsm ${p.finish.padEnd(11)}  ${formatSGD(p.sellPricePerSqm).padStart(10)}/sqm  max ${p.maxPrintWidthCm}cm`);
}
console.log();

for (const c of cases) {
  const r = quotePaperPrint({
    paperId: c.paper,
    widthCm: c.w,
    heightCm: c.h,
    quantity: c.q,
  });
  console.log(`\n— ${c.label}`);
  if (!r.ok) {
    console.log(`  NOT QUOTABLE: ${r.message}`);
    continue;
  }
  console.log(`  paper        ${r.paper.shortName}`);
  console.log(`  size         ${c.w} × ${c.h} cm  (sqm ${r.sqm.toFixed(4)})`);
  console.log(`  rate          ${formatSGD(r.paper.sellPricePerSqm)}/sqm`);
  for (const line of r.perPrintLines) {
    console.log(`    ${line.label.padEnd(24)} ${formatSGD(line.amount).padStart(12)}`);
  }
  console.log(`    ${"per-print total".padEnd(24)} ${formatSGD(r.perPrintTotal).padStart(12)}`);
  console.log(`    ${`× ${r.quantity} prints`.padEnd(24)}`);
  console.log(`    ${"GRAND TOTAL".padEnd(24)} ${formatSGD(r.grandTotal).padStart(12)}`);
}
