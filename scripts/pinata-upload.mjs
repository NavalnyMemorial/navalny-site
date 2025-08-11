/** Upload a directory to Pinata using a JWT or API key/secret.
 * Usage: node scripts/pinata-upload.mjs ./dist */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node scripts/pinata-upload.mjs <folder>'); process.exit(1); }

const JWT = process.env.PINATA_JWT;
const API_KEY = process.env.PINATA_API_KEY;
const API_SECRET = process.env.PINATA_API_SECRET;
if (!JWT && !(API_KEY && API_SECRET)) {
  console.error('Set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET');
  process.exit(1);
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dirPath, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

const form = new FormData();
const files = walk(dir);
for (const file of files) {
  const rel = path.relative(dir, file);
  form.append('file', fs.createReadStream(file), { filepath: rel });
}
form.append('pinataMetadata', JSON.stringify({ name: 'navalny-memory-dist' }));
form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

const headers = { ...form.getHeaders() };
if (JWT) headers.Authorization = `Bearer ${JWT}`;
const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
try {
  const res = await axios.post(url, form, {
    maxContentLength: Infinity, maxBodyLength: Infinity,
    headers: JWT ? headers : { ...headers, pinata_api_key: API_KEY, pinata_secret_api_key: API_SECRET }
  });
  console.log('Pinned to IPFS:', res.data);
} catch (e) {
  console.error('Pinata error:', e.response?.data || e.message);
  process.exit(1);
}
