// Servidor local para probar la app sin Vercel: `npm run dev` y abrir http://localhost:3000
// Sin variables de Supabase usa data/demo.json (DNI de prueba: 11111111).
// Con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno, usa la base real.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODO_LOCAL } from '../lib/db.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUBLICO = join(RAIZ, 'public');
const PUERTO = Number(process.env.PORT ?? 3000);
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');

  if (pathname.startsWith('/api/')) {
    const nombre = pathname.slice(5).replace(/[^a-z-]/g, '');
    try {
      const { default: handler } = await import(join(RAIZ, 'api', `${nombre}.js`));
      return handler(req, res);
    } catch {
      res.statusCode = 404;
      return res.end('No existe');
    }
  }

  // Igual que "cleanUrls" de Vercel: /app sirve app.html
  let archivo = pathname === '/' ? '/index.html' : pathname;
  if (!extname(archivo)) archivo += '.html';
  const ruta = normalize(join(PUBLICO, archivo));
  if (!ruta.startsWith(PUBLICO)) {
    res.statusCode = 403;
    return res.end();
  }
  try {
    const contenido = await readFile(ruta);
    res.setHeader('Content-Type', TIPOS[extname(ruta)] ?? 'application/octet-stream');
    res.end(contenido);
  } catch {
    res.statusCode = 404;
    res.end('No encontrado');
  }
}).listen(PUERTO, () => {
  console.log(`Controlados en http://localhost:${PUERTO}`);
  console.log(MODO_LOCAL ? 'Modo local: datos de data/demo.json (DNI de prueba 11111111)' : 'Usando Supabase');
});
