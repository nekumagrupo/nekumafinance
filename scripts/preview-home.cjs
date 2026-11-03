const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../outputs/finance-pwa');
const port = Number(process.env.PORT || 4180);
const types = { '.html':'text/html; charset=utf-8', '.sql':'text/plain; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
http.createServer((request, response) => {
  let target;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/__preview/wise-card') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(require('./wise-preview.cjs')());
      return;
    }
    if (pathname.startsWith('/api/')) {
      response.writeHead(503, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
      response.end(JSON.stringify({ error: 'A previa local nao executa as funcoes do Cloudflare. A consulta Wise requer publicacao e configuracao do token no servidor.' }));
      return;
    }
    target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root + path.sep)) throw new Error('Invalid path');
    const content = fs.readFileSync(target);
    response.writeHead(200, { 'Content-Type':types[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/index.html?home=1`));
