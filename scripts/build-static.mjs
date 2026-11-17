import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
const entries = ['index.html', 'styles.css', 'app.js', 'stitch-motion.js', 'stitch-draw.js', 'stitch-renderer.js', 'webmcp.js', 'vendor', 'studio.html', 'studio.css', 'studio.js', 'stitch-scene.js', 'stitch-canvas.js', 'studio-editor.js'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['studio-three-entry.js'], bundle: true, format: 'iife', target: 'es2020', outfile: 'dist/studio-three.js' });
for (const entry of entries) await cp(entry, `dist/${entry}`, { recursive: true });
console.log(`Built ${entries.length} static entries and local studio-three.js in dist/`);
