const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// --- CONFIGURATION ---
const ROOT_DIR = __dirname;
const TARGET_DIR = path.join(ROOT_DIR, 'chrome-extension');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const MANIFEST_SRC = path.join(ROOT_DIR, 'src', 'manifest.json');
const ZIP_NAME = 'writer-analytics-release.zip';

console.log("🚀 STARTING AUTOMATED RELEASE...");

try {
  // 1. BUILD THE PROJECT
  console.log("🛠  Compiling TypeScript (npm run build)...");
  execSync('npm run build', { stdio: 'inherit' });

  // 2. CLEAN THE PACKAGE FOLDER
  console.log("🧹 Cleaning old 'chrome-extension' folder...");
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR);

  // 3. COPY COMPILED FILES
  console.log("📦 Copying compiled code...");
  if (fs.existsSync(DIST_DIR)) {
    fs.cpSync(DIST_DIR, TARGET_DIR, { recursive: true });
  } else {
    throw new Error("'dist' folder missing. Build failed?");
  }

  // 4. COPY ASSETS
  if (fs.existsSync(ASSETS_DIR)) {
    console.log("🎨 Copying assets...");
    fs.cpSync(ASSETS_DIR, path.join(TARGET_DIR, 'assets'), { recursive: true });
  }

  // 5. COPY MANIFEST
  if (fs.existsSync(MANIFEST_SRC)) {
    console.log("📄 Copying manifest.json...");
    fs.copyFileSync(MANIFEST_SRC, path.join(TARGET_DIR, 'manifest.json'));
  } else {
    // Fallback: Check root if src/manifest doesn't exist
    if (fs.existsSync(path.join(ROOT_DIR, 'manifest.json'))) {
        fs.copyFileSync(path.join(ROOT_DIR, 'manifest.json'), path.join(TARGET_DIR, 'manifest.json'));
    }
  }

  // 6. CREATE ZIP FILE
  console.log(`🤐 Zipping into ${ZIP_NAME}...`);
  try {
    execSync(`zip -r "${ZIP_NAME}" chrome-extension`);
    console.log(`\n✅ SUCCESS! Release ready: ${ZIP_NAME}`);
  } catch (e) {
    console.log("\n✅ Folder ready, but manual zip needed (zip command missing).");
  }

} catch (error) {
  console.error("\n❌ FAILED:", error.message);
  process.exit(1);
}