// Render PNG icons from icon.svg using the browser-free 'sharp'-less approach: resvg-js if present.
import { readFileSync, writeFileSync } from 'node:fs';
const { Resvg } = await import('@resvg/resvg-js');
const svg = readFileSync('public/icon.svg', 'utf8');
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(`public/${name}`, png);
}
console.log('icons written');
