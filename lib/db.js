// Acceso a datos. En producción (Vercel) habla con Supabase por su API REST usando la
// service role key, que SOLO vive en el servidor (variables de entorno de Vercel).
// Si no hay variables de Supabase configuradas, usa data/demo.json en memoria para
// poder probar la app localmente con `npm run dev`.

import { readdirSync, readFileSync } from 'node:fs';
import { armarCatalogo, numeroDeFoto } from './catalogo.js';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
export const MODO_LOCAL = !SUPABASE_URL || !SUPABASE_KEY;

// El catálogo se guarda en memoria para no consultar la base en cada búsqueda.
// Pasado DURACION_CACHE_MS se renueva "por detrás": la búsqueda que lo nota responde
// al instante con el catálogo anterior y la siguiente ya usa el nuevo.
const DURACION_CACHE_MS = 60 * 1000;
let cache = { catalogo: null, hasta: 0, cargando: null };

function recargarCatalogo() {
  cache.cargando ??= Promise.all([
    leerTabla('modelos', 'marca,modelo,control'),
    leerTabla('reemplazos', 'control,reemplazos'),
    listarFotos(),
  ])
    .then(([modelos, reemplazos, fotos]) => {
      cache.catalogo = armarCatalogo(modelos, reemplazos, fotos);
      cache.hasta = Date.now() + DURACION_CACHE_MS;
      return cache.catalogo;
    })
    .finally(() => { cache.cargando = null; });
  return cache.cargando;
}

export async function obtenerCatalogo() {
  if (!cache.catalogo) return recargarCatalogo();
  if (Date.now() >= cache.hasta) {
    recargarCatalogo().catch((err) => console.error('No se pudo renovar el catálogo:', err.message));
  }
  return cache.catalogo;
}

export async function buscarUsuarioPorDni(dni) {
  return primero(await consultar('usuarios', `dni=eq.${encodeURIComponent(dni)}`));
}

export async function buscarUsuarioPorSesion(sesionHash) {
  return primero(await consultar('usuarios', `session_hash=eq.${encodeURIComponent(sesionHash)}`));
}

// Guardar una sesión nueva pisa la anterior: así "el último login gana".
export async function guardarSesion(dni, sesionHash) {
  await actualizarUsuario(dni, { session_hash: sesionHash, ultimo_login: new Date().toISOString() });
}

export async function borrarSesion(dni) {
  await actualizarUsuario(dni, { session_hash: null });
}

export async function registrarBusqueda(dni, texto, encontrados) {
  const fila = { dni, texto, encontrados, fecha: new Date().toISOString() };
  if (MODO_LOCAL) {
    local().busquedas.push(fila);
    return;
  }
  await supabase('busquedas', { method: 'POST', body: fila });
}

// ---------- Fotos ----------

// Las fotos van en Supabase Storage, en el bucket público "fotos", con el número del control
// como nombre: 500.jpg, 812.webp... Devuelve Map: número -> URL.
// Si el bucket todavía no existe, la app sigue funcionando sin fotos.
const BUCKET_FOTOS = 'fotos';

async function listarFotos() {
  const fotos = new Map();
  if (MODO_LOCAL) {
    // En la computadora: archivos dentro de public/fotos/ (esa carpeta no se sube a GitHub).
    try {
      for (const nombre of readdirSync(new URL('../public/fotos/', import.meta.url))) {
        const numero = numeroDeFoto(nombre);
        if (numero !== null) fotos.set(numero, `/fotos/${encodeURIComponent(nombre)}`);
      }
    } catch { /* sin carpeta de fotos */ }
    return fotos;
  }

  try {
    const PAGINA = 1000;
    for (let desde = 0; ; desde += PAGINA) {
      const archivos = await supabase(`storage/v1/object/list/${BUCKET_FOTOS}`, {
        method: 'POST',
        body: { prefix: '', limit: PAGINA, offset: desde, sortBy: { column: 'name', order: 'asc' } },
        devolver: true,
      });
      for (const archivo of archivos) {
        const numero = numeroDeFoto(archivo.name);
        if (numero === null) continue;
        // ?v= cambia si reemplazás la foto, así los celulares no muestran la vieja guardada.
        const version = encodeURIComponent(archivo.updated_at ?? '');
        fotos.set(
          numero,
          `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${encodeURIComponent(archivo.name)}?v=${version}`,
        );
      }
      if (archivos.length < PAGINA) return fotos;
    }
  } catch (err) {
    console.error('No se pudieron listar las fotos:', err.message);
    return fotos;
  }
}

// ---------- Supabase (REST) ----------

// `ruta` es relativa a /rest/v1/, salvo que empiece con "storage/".
async function supabase(ruta, { method = 'GET', body, headers = {}, devolver = method === 'GET' } = {}) {
  const base = ruta.startsWith('storage/') ? SUPABASE_URL : `${SUPABASE_URL}/rest/v1`;
  const res = await fetch(`${base}/${ruta}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      // Las claves "legacy" (service_role, empiezan con eyJ) son JWT y van también en Authorization.
      // Las nuevas (sb_secret_...) van solo en apikey: Supabase rechaza un Bearer que no sea JWT.
      ...(SUPABASE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${ruta.split('?')[0]}: ${res.status} ${await res.text()}`);
  }
  return devolver ? res.json() : null;
}

// Supabase devuelve como máximo 1000 filas por pedido, así que pedimos por páginas.
async function leerTabla(tabla, columnas) {
  if (MODO_LOCAL) return local()[tabla];
  const PAGINA = 1000;
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = await supabase(`${tabla}?select=${columnas}&order=id`, {
      headers: { Range: `${desde}-${desde + PAGINA - 1}` },
    });
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

async function consultar(tabla, filtro) {
  if (MODO_LOCAL) {
    const [campo, valor] = filtro.replace('=eq.', '=').split('=');
    return local()[tabla].filter((f) => f[campo] != null && String(f[campo]) === decodeURIComponent(valor));
  }
  return supabase(`${tabla}?${filtro}&select=*&limit=1`);
}

async function actualizarUsuario(dni, cambios) {
  if (MODO_LOCAL) {
    const usuario = local().usuarios.find((u) => u.dni === dni);
    if (usuario) Object.assign(usuario, cambios);
    return;
  }
  await supabase(`usuarios?dni=eq.${encodeURIComponent(dni)}`, { method: 'PATCH', body: cambios });
}

function primero(filas) {
  return filas[0] ?? null;
}

// ---------- Modo local (sin Supabase) ----------

let datosLocales = null;
function local() {
  if (!datosLocales) {
    const ruta = new URL('../data/demo.json', import.meta.url);
    datosLocales = { busquedas: [], ...JSON.parse(readFileSync(ruta, 'utf8')) };
  }
  return datosLocales;
}
