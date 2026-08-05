import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

if (manifest.manifest_version !== 3) throw new Error("Manifest V3 is required");
if (JSON.stringify(manifest.permissions) !== JSON.stringify(["storage"])) {
  throw new Error("The public extension should request only the storage permission");
}

const requiredFiles = [
  "manifest.json",
  "content.css",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "LICENSE",
  "NOTICE.md"
];

for (const file of requiredFiles) {
  if (!(await stat(new URL(file, root))).isFile()) throw new Error(`Missing ${file}`);
}

const prohibitedFontExtensions = /\.(?:ttf|otf|woff2?)$/i;
const remoteFontUrl = /url\(\s*["']?https?:\/\//i;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (prohibitedFontExtensions.test(entry.name)) {
      throw new Error(`Public repository contains a font binary: ${relative(root.pathname, path)}`);
    }
  }
}

await walk(root.pathname);

const css = await readFile(new URL("content.css", root), "utf8");
if (remoteFontUrl.test(css)) throw new Error("Remote font URLs are not allowed");
if (!css.includes("CGPT Anthropic Mono")) throw new Error("Anthropic Mono rule is missing");
if (!css.includes("KaTeX_Main")) throw new Error("KaTeX preservation rule is missing");

console.log("Extension validation passed");
