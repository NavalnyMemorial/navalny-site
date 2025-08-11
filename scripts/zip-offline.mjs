import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
const dist = "./dist";
const out = "./public/offline.zip";
if (!fs.existsSync(dist)) { console.error("dist/ not found. Run: npm run build"); process.exit(1); }
const zip = new AdmZip();
function addDir(p, base="") {
  const entries = fs.readdirSync(p, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(p, e.name);
    const rel = path.join(base, e.name);
    if (e.isDirectory()) addDir(full, rel);
    else zip.addLocalFile(full, base);
  }
}
addDir(dist);
zip.writeZip(out);
console.log("Created", out);
