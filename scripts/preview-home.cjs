const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../outputs/finance-pwa');
const staging = process.argv.includes('--staging');
const port = Number(process.env.PORT || (staging ? 4183 : 4180));
const stagingKey = process.env.NEKUMA_STAGING_PUBLISHABLE_KEY || '';
if (staging && !/^sb_publishable_[\w-]+$/.test(stagingKey)) {
  throw new Error('Set NEKUMA_STAGING_PUBLISHABLE_KEY to the staging project publishable key. Never use a secret key.');
}
const types = { '.html':'text/html; charset=utf-8', '.sql':'text/plain; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
http.createServer((request, response) => {
  let target;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (staging && pathname === '/supabase-config.js') {
      response.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-store' });
      response.end(`window.PONTE_SUPABASE_CONFIG = ${JSON.stringify({
        url: 'https://ycqyoctdzotqxdlzcgzv.supabase.co', anonKey: stagingKey, enableSignup: true
      })};`);
      return;
    }
    if (staging && pathname === '/service-worker.js') {
      response.writeHead(404, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
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
    response.end(staging && pathname === '/app.html' ? content.toString('utf8').replace('<title>', '<title>[STAGING] ') : content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/${staging ? 'app.html' : 'index.html?home=1'}`));
