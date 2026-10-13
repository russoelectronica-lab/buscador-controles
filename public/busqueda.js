// Reglas de búsqueda por modelo. Este archivo lo usan el servidor (lib/catalogo.js) y el
// navegador (app.js), así los dos ordenan y filtran exactamente igual.

export const MIN_CARACTERES_BUSQUEDA = 4;

// Para aceptar que el cliente escriba de más (ej. "UN43J5320AGXZD" cuando en la base
// está "UN43J5320"), el modelo cargado tiene que tener al menos esta cantidad de caracteres.
const MIN_LARGO_PREFIJO = 5;

// "EA-50 x6.100" -> "EA50X6100". Así no importan mayúsculas, espacios, guiones ni puntos.
export function normalizarModelo(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Qué tan bien coincide un modelo (ya normalizado) con lo buscado (ya normalizado).
// 0 exacto · 1 el cliente escribió un sufijo de más · 2 empieza igual · 3 lo contiene · null no coincide
export function prioridad(modeloNorm, q) {
  if (modeloNorm === q) return 0;
  if (modeloNorm.length >= MIN_LARGO_PREFIJO && q.startsWith(modeloNorm)) return 1;
  if (modeloNorm.startsWith(q)) return 2;
  if (modeloNorm.includes(q)) return 3;
  return null;
}

// Filtra y ordena una lista de objetos que tengan `modelo`. Devuelve una lista nueva.
// Si un modelo coincide con "EA50X6", también coincide con "EA50" (lo que se escribió antes):
// por eso el navegador puede seguir filtrando solo, sin volver a preguntarle al servidor.
export function filtrarModelos(lista, texto, limite = Infinity) {
  const q = normalizarModelo(texto);
  if (q.length < MIN_CARACTERES_BUSQUEDA) return [];
  const encontrados = [];
  for (const item of lista) {
    const p = prioridad(item.norm ?? normalizarModelo(item.modelo), q);
    if (p !== null) encontrados.push({ item, p });
  }
  encontrados.sort((a, b) => a.p - b.p || a.item.modelo.localeCompare(b.item.modelo));
  return encontrados.slice(0, limite).map((e) => e.item);
}
