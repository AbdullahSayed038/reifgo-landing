// Build-time script: embeds all FAQ questions with the same model the chat
// API uses at runtime, and writes data/faq-embeddings.json (id + vector).
// Run with `npm run embed` whenever data/faq.json changes, and commit the
// generated file so Vercel builds don't need to regenerate it.
import { pipeline, env } from "@xenova/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const faq = JSON.parse(readFileSync(join(root, "data", "faq.json"), "utf8"));

env.allowLocalModels = false;

console.log(`Embedding ${faq.length} FAQ questions with Xenova/all-MiniLM-L6-v2 (quantized)...`);
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
  quantized: true,
});

const out = [];
for (const item of faq) {
  const tensor = await embedder(item.question, { pooling: "mean", normalize: true });
  out.push({ id: item.id, vector: Array.from(tensor.data).map((v) => +v.toFixed(6)) });
  if (out.length % 40 === 0) console.log(`  ${out.length}/${faq.length}`);
}

const outPath = join(root, "data", "faq-embeddings.json");
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${out.length} vectors (${out[0].vector.length} dims) to ${outPath}`);
