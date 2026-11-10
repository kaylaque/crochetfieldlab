import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const entries = ['index.html', 'styles.css', 'app.js', 'stitch-motion.js', 'stitch-renderer.js', 'webmcp.js', 'vendor'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of entries) {
  await cp(new URL(`../${entry}`, import.meta.url), new URL(entry, output), { recursive: true });
}

console.log(`Built ${entries.length} static entries in dist/`);
