import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredStoreFiles = [
  "store/README.md",
  "store/listing.md",
  "store/demo/fictional-library-article.html",
  "store/assets/promo/small-promo-tile.svg",
  "store/assets/promo/small-promo-tile.png",
  "store/assets/promo/marquee-promo.svg",
  "store/assets/promo/marquee-promo.png",
  "store/assets/screenshots/lede-lens-analysis.png",
];

await Promise.all(requiredStoreFiles.map((file) => access(file)));

async function pngDimensions(path) {
  const bytes = await readFile(path);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${path} must be a PNG.`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

assert.deepEqual(
  await pngDimensions("store/assets/promo/small-promo-tile.png"),
  { width: 440, height: 280 },
);
assert.deepEqual(
  await pngDimensions("store/assets/promo/marquee-promo.png"),
  { width: 1400, height: 560 },
);
assert.deepEqual(
  await pngDimensions("store/assets/screenshots/lede-lens-analysis.png"),
  { width: 1280, height: 800 },
);

console.log("Chrome Web Store asset checks passed.");
