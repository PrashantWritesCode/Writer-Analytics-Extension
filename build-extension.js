// build-extension.js
import fs from "fs-extra";
import path from "path";
import archiver from "archiver";

const SRC_DIR = path.resolve("./dist"); // ✅ use built files
const DIST_DIR = path.resolve("./chrome-extension");
const ZIP_FILE = path.resolve("./chrome-extension.zip");

async function build() {
  console.log("🧩 Building Writer Analytics Chrome Extension...");

  // 1. Clean old build
  await fs.remove(DIST_DIR);
  await fs.remove(ZIP_FILE);
  await fs.mkdirp(DIST_DIR);

  // 2. Copy built files from /dist
  const filesToCopy = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "background.js",
    "content.js",
    "icon.png"
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(DIST_DIR, file);
    if (fs.existsSync(srcPath)) {
      await fs.copy(srcPath, destPath);
      console.log(`✅ Copied ${file}`);
    } else {
      console.warn(`⚠️  Missing file skipped: ${file}`);
    }
  }

  // 3. Copy assets folder
  const assetsSrc = path.join(SRC_DIR, "assets");
  const assetsDest = path.join(DIST_DIR, "assets");
  if (fs.existsSync(assetsSrc)) {
    await fs.copy(assetsSrc, assetsDest);
    console.log("✅ Copied assets/");
  }

  // 4. Create a ZIP file
  const output = fs.createWriteStream(ZIP_FILE);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(DIST_DIR, false);
  await archive.finalize();

  console.log("\n🎁 Packaging complete!");
  console.log(`📦 Folder: ${DIST_DIR}`);
  console.log(`🗜️  Zip File: ${ZIP_FILE}`);
  console.log("🚀 Writer Analytics is ready for Chrome deployment!\n");
}

build().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
