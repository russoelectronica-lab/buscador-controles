// Ayudas para las funciones de /api. Usan solo la API estándar de Node (req/res),
// así funcionan igual en Vercel, en el servidor local y en otro hosting con Node.

import { createHash, randomBytes } from 'node:crypto';
import { buscarUsuarioPorSesion } from './db.js';

const COOKIE = 'sesion';
const DURACION_SESION_S = 60 * 60 * 24 * 30; // 30 días

export function responder(res, status, datos) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(datos));
}

export function parametros(req) {
  return new URL(req.url, 'http://x').searchParams;
}

export async function leerJson(req) {
  // Vercel ya trae el body leído; en Node puro hay que leerlo del stream.
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  }
  let texto = '';
  for await (const parte of req) texto += parte;
  return texto ? JSON.parse(texto) : {};
}

export function nuevaSesion() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashear(token) };
}

// En la base se guarda solo el hash del token, nunca el token en sí.
function hashear(token) {
  return createHash('sha256').update(token).digest('hex');
}

function leerCookie(req) {
  const cookies = req.headers.cookie ?? '';
  const par = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : null;
}

function esHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.VERCEL);
}

export function ponerCookieSesion(req, res, token) {
  const seguro = esHttps(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DURACION_SESION_S}${seguro}`,
  );
}

export function borrarCookieSesion(req, res) {
  const seguro = esHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${seguro}`);
}

// Sesiones ya verificadas, guardadas en memoria unos segundos para que cada búsqueda no
// tenga que esperar una consulta a Supabase. Si la cuenta se abre en otro dispositivo, la
// sesión vieja deja de funcionar como mucho en SESION_EN_MEMORIA_MS.
const SESION_EN_MEMORIA_MS = 15 * 1000;
const sesionesVerificadas = new Map(); // hash -> { usuario, hasta }

export function olvidarSesionesDe(dni) {
  for (const [hash, s] of sesionesVerificadas) if (s.usuario.dni === dni) sesionesVerificadas.delete(hash);
}

// Devuelve el usuario logueado, o responde 401 y devuelve null.
// Si la cookie existe pero ya no coincide con la base, es porque la cuenta se abrió
// en otro dispositivo (el último login gana).
export async function requerirUsuario(req, res) {
  const token = leerCookie(req);
  if (!token) {
    responder(res, 401, { error: 'sin_sesion' });
    return null;
  }
  const hash = hashear(token);
  const enMemoria = sesionesVerificadas.get(hash);
  if (enMemoria && Date.now() < enMemoria.hasta) return enMemoria.usuario;

  const usuario = await buscarUsuarioPorSesion(hash);
  if (!usuario || usuario.activo === false) {
    sesionesVerificadas.delete(hash);
    borrarCookieSesion(req, res);
    responder(res, 401, { error: usuario ? 'usuario_inactivo' : 'otra_sesion' });
    return null;
  }
  if (sesionesVerificadas.size > 5000) sesionesVerificadas.clear();
  sesionesVerificadas.set(hash, { usuario, hasta: Date.now() + SESION_EN_MEMORIA_MS });
  return usuario;
}

// Envuelve un handler para que un error inesperado devuelva un 500 prolijo.
export function manejar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) responder(res, 500, { error: 'error_interno' });
    }
  };
}
