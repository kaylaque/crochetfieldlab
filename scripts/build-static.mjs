import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const entries = ['index.html', 'styles.css', 'app.js', 'course-video.js', 'webmcp.js', 'vendor', 'workshop.html', 'workshop.css', 'workshop.js', 'rules.py', 'guide'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of entries) {
  await cp(new URL(`../${entry}`, import.meta.url), new URL(entry, output), { recursive: true });
}

console.log(`Built ${entries.length} static entries in dist/`);
