#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const distPopupPath = path.join(distDir, "popup.html");
const srcPopupHtml = path.join(projectRoot, "src", "popup", "popup.html");
const srcPopupTs = path.join(projectRoot, "src", "popup", "popup.ts");

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return null;
  }
}

function extractAttributes(html, regex) {
  const matches = [];
  if (!html) return matches;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) matches.push(match[1]);
  }
  return matches;
}

function resolveDistPath(ref) {
  if (!ref || /^https?:/i.test(ref) || ref.startsWith("data:")) return null;
  let relative = ref.replace(/^\.\//, "").replace(/^\//, "");
  return path.join(distDir, relative);
}

function checkReferences(refs) {
  const missing = [];
  const results = refs.map((ref) => {
    const target = resolveDistPath(ref);
    const exists = target ? fs.existsSync(target) : false;
    if (!exists && target) missing.push({ ref, target });
    return { ref, target, exists };
  });
  return { results, missing };
}

function listDirRecursive(dir) {
  try {
    return fs.readdirSync(dir).map((item) => {
      const full = path.join(dir, item);
      const stats = fs.statSync(full);
      return stats.isDirectory() ? `${item}/` : item;
    });
  } catch (err) {
    return null;
  }
}

function reportImports(filePath, content) {
  const importRegex = /from\s+["']([^"']+chapter-analytics[^"']*)["']/g;
  const refs = extractAttributes(content, importRegex);
  return refs.map((rel) => {
    const withoutExt = rel.replace(/\.(ts|js)$/i, "");
    const srcTarget = path.resolve(path.dirname(filePath), `${withoutExt}.ts`);
    const distTarget = path.join(distDir, withoutExt.replace(/^\.\//, "").replace(/^\//, "")) + ".ts";
    return {
      importPath: rel,
      srcExists: fs.existsSync(srcTarget),
      distExists: fs.existsSync(distTarget),
      srcTarget,
      distTarget,
    };
  });
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

(function main() {
  console.log("Writer Analytics — Build Debug Report\n");

  const popupHtml = safeRead(distPopupPath);
  if (!popupHtml) {
    console.log("dist/popup.html not found. Run `npm run build` first.");
    process.exit(0);
  }

  const linkRefs = extractAttributes(popupHtml, /<link[^>]+href=["']([^"']+)["']/gi);
  const scriptRefs = extractAttributes(popupHtml, /<script[^>]+src=["']([^"']+)["']/gi);

  const linkCheck = checkReferences(linkRefs);
  const scriptCheck = checkReferences(scriptRefs);

  printSection("Popup <link> references");
  linkCheck.results.forEach((entry) => {
    console.log(`• ${entry.ref} -> ${entry.exists ? "OK" : "MISSING"}${entry.target ? ` (${entry.target})` : ""}`);
  });

  printSection("Popup <script> references");
  scriptCheck.results.forEach((entry) => {
    console.log(`• ${entry.ref} -> ${entry.exists ? "OK" : "MISSING"}${entry.target ? ` (${entry.target})` : ""}`);
  });

  const chapterDir = path.join(distDir, "chapter-analytics");
  const chapterStylesDir = path.join(chapterDir, "styles");

  printSection("dist/chapter-analytics contents");
  console.log(listDirRecursive(chapterDir) || "(missing)");

  printSection("dist/chapter-analytics/styles contents");
  console.log(listDirRecursive(chapterStylesDir) || "(missing)");

  const srcHtml = safeRead(srcPopupHtml) || "";
  const srcTs = safeRead(srcPopupTs) || "";
  const htmlImports = reportImports(srcPopupHtml, srcHtml);
  const tsImports = reportImports(srcPopupTs, srcTs);

  printSection("Chapter Analytics imports in src/popup/popup.html");
  htmlImports.forEach((entry) => {
    console.log(`• ${entry.importPath} -> src:${entry.srcExists ? "OK" : "NO"}, dist:${entry.distExists ? "OK" : "NO"}`);
  });

  printSection("Chapter Analytics imports in src/popup/popup.ts");
  tsImports.forEach((entry) => {
    console.log(`• ${entry.importPath} -> src:${entry.srcExists ? "OK" : "NO"}, dist:${entry.distExists ? "OK" : "NO"}`);
  });

  const missing = [...linkCheck.missing, ...scriptCheck.missing];
  printSection("Summary");
  if (!missing.length) {
    console.log("No missing files referenced by popup.html");
  } else {
    console.log("Missing references:");
    missing.forEach((entry) => console.log(`- ${entry.ref} (${entry.target})`));
  }
})();
