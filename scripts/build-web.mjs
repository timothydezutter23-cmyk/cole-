// Prepara la versión publicable como página web única (dist-web/):
// index.html con el CSS en línea y app.js como único script.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const css = readFileSync(`dist/assets/${assets.find((f) => f.endsWith('.css'))}`, 'utf8');
const js = readFileSync(`dist/assets/${assets.find((f) => f.endsWith('.js'))}`, 'utf8');
mkdirSync('dist-web', { recursive: true });
writeFileSync('dist-web/app.js', js);
writeFileSync('dist-web/index.html', `<title>Offgrid</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Una app diseñada para que la cierres: misiones fuera de la pantalla y un planeta que crece mientras descansas del móvil.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module" src="app.js"></script>
`);
console.log('dist-web listo:', (js.length / 1024).toFixed(0), 'KB de JS');
