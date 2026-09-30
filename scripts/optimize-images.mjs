import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = resolve(root, 'public/assets');
const originals = resolve(root, 'artifacts/original-images');
const archive = process.argv.includes('--archive-originals');
await mkdir(originals, { recursive: true });
const names = [...new Set([
  ...await readdir(assets), ...await readdir(originals),
])].filter((name) => name.endsWith('.png')).sort();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exists = (path) => stat(path).then(() => true, (error) => { if (error.code === 'ENOENT') return false; throw error; });
const widthFor = (name) => name.startsWith('intro-thumb-') ? 480
  : name.startsWith('booking-room-') ? 640
  : /^(around-|booking-option-|detail-option-)/.test(name) ? 800
  : /^room-\d/.test(name) ? 1000 : 1600;
const results = [];

for (const name of names) {
  const publicOriginal = resolve(assets, name);
  const backup = resolve(originals, name);
  const output = resolve(assets, name.replace(/\.png$/, '.webp'));
  // All file operations stay inside the two explicit project directories.
  if (dirname(publicOriginal) !== assets || dirname(output) !== assets || dirname(backup) !== originals) throw new Error('Invalid asset path');
  const source = await exists(publicOriginal) ? publicOriginal : backup;
  const originalBytes = await readFile(source);
  if (await exists(backup)) {
    if (hash(await readFile(backup)) !== hash(originalBytes)) throw new Error(`Original backup differs: ${name}`);
  } else {
    await copyFile(source, backup, constants.COPYFILE_EXCL);
    if (hash(await readFile(backup)) !== hash(originalBytes)) throw new Error(`Original backup failed: ${name}`);
  }
  const before = await sharp(originalBytes).metadata();
  const encoded = await sharp(originalBytes)
    .rotate()
    .resize({ width: widthFor(name), withoutEnlargement: true })
    .webp({ quality: 82, effort: 6, alphaQuality: 100 })
    .toBuffer();
  const after = await sharp(encoded).metadata();
  // Decode the complete output before writing or archiving an original.
  await sharp(encoded).raw().toBuffer();
  if (after.format !== 'webp' || !after.width || encoded.length >= originalBytes.length) throw new Error(`Invalid or larger WebP: ${name}`);
  await writeFile(output, encoded);
  results.push({ source: name, output: name.replace(/\.png$/, '.webp'), originalBytes: originalBytes.length, optimizedBytes: encoded.length, originalSize: [before.width, before.height], optimizedSize: [after.width, after.height] });
  console.log(`${name}: ${(originalBytes.length / 1000).toFixed(0)} KB → ${(encoded.length / 1000).toFixed(0)} KB (${after.width}×${after.height})`);
}

if (archive) {
  // Source references must be updated before public PNGs are removed.
  for (const file of ['src/App.jsx', 'src/SubPages.jsx', 'src/data.js', 'src/styles.css']) {
    if ((await readFile(join(root, file), 'utf8')).includes('.png')) throw new Error(`Update PNG references before archiving: ${file}`);
  }
  for (const name of names) {
    const publicOriginal = resolve(assets, name);
    if (await exists(publicOriginal)) await unlink(publicOriginal);
  }
}
const originalBytes = results.reduce((sum, row) => sum + row.originalBytes, 0);
const optimizedBytes = results.reduce((sum, row) => sum + row.optimizedBytes, 0);
await writeFile(join(root, 'artifacts/image-optimization.json'), JSON.stringify({ originalBytes, optimizedBytes, reductionPercent: 100 * (1 - optimizedBytes / originalBytes), images: results }, null, 2));
console.log(`TOTAL: ${(originalBytes / 1e6).toFixed(2)} MB → ${(optimizedBytes / 1e6).toFixed(2)} MB (${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}% smaller)`);
