// Lógica pura del catálogo: normalizar modelos, buscar y armar la info de cada control.
// No accede a la base de datos, así se puede probar fácil (ver test/catalogo.test.js).

// Los controles 800 en adelante son de aire acondicionado; el resto, LCD/LED/Smart.
export const PRIMER_CONTROL_AIRE = 800;

export function tipoControl(numero) {
  return numero >= PRIMER_CONTROL_AIRE ? 'AR' : 'LCD';
}

export function nombreControl(numero) {
  return `${tipoControl(numero)} ${numero}`;
}

// "EA-50 x6100" -> "EA50X6100". Así no importan mayúsculas, espacios, guiones ni puntos.
export function normalizarModelo(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// "522-553", "522, 553", "522 553" o "522/553" -> [522, 553]
export function parsearReemplazos(texto) {
  return String(texto ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
}

export const MIN_CARACTERES_BUSQUEDA = 4;
const MAX_RESULTADOS = 50;
// Para aceptar que el cliente escriba de más (ej. "UN43J5320AGXZD" cuando en la base
// está "UN43J5320"), el modelo cargado tiene que tener al menos esta cantidad de caracteres.
const MIN_LARGO_PREFIJO = 5;

// Arma el índice en memoria a partir de las filas de las tablas `modelos` y `reemplazos`.
export function armarCatalogo(filasModelos, filasReemplazos) {
  const reemplazosPorControl = new Map();
  for (const fila of filasReemplazos) {
    const control = Number(fila.control);
    if (!Number.isFinite(control)) continue;
    const lista = reemplazosPorControl.get(control) ?? [];
    for (const r of parsearReemplazos(fila.reemplazos)) {
      if (r !== control && !lista.includes(r)) lista.push(r);
    }
    reemplazosPorControl.set(control, lista);
  }

  const modelos = [];
  for (const fila of filasModelos) {
    const control = Number(fila.control);
    const modelo = String(fila.modelo ?? '').trim();
    if (!modelo || !Number.isFinite(control)) continue;
    modelos.push({
      marca: String(fila.marca ?? '').trim().toUpperCase(),
      modelo: modelo.toUpperCase(),
      norm: normalizarModelo(modelo),
      control,
    });
  }

  return { modelos, reemplazosPorControl };
}

function infoControl(catalogo, numero) {
  return {
    numero,
    nombre: nombreControl(numero),
    tipo: tipoControl(numero),
    reemplazos: (catalogo.reemplazosPorControl.get(numero) ?? []).map((r) => ({
      numero: r,
      nombre: nombreControl(r),
    })),
  };
}

// Devuelve los modelos que coinciden, ordenados: exactos primero, después los que el
// cliente escribió con sufijo de más, después los que empiezan con lo escrito (para el
// predictivo) y por último los que lo contienen en el medio.
export function buscarModelo(catalogo, texto) {
  const q = normalizarModelo(texto);
  if (q.length < MIN_CARACTERES_BUSQUEDA) return [];

  const encontrados = [];
  for (const m of catalogo.modelos) {
    let prioridad;
    if (m.norm === q) prioridad = 0;
    else if (m.norm.length >= MIN_LARGO_PREFIJO && q.startsWith(m.norm)) prioridad = 1;
    else if (m.norm.startsWith(q)) prioridad = 2;
    else if (m.norm.includes(q)) prioridad = 3;
    else continue;
    encontrados.push({ m, prioridad });
  }

  encontrados.sort(
    (a, b) => a.prioridad - b.prioridad || a.m.modelo.localeCompare(b.m.modelo),
  );

  return encontrados.slice(0, MAX_RESULTADOS).map(({ m }) => ({
    marca: m.marca,
    modelo: m.modelo,
    control: infoControl(catalogo, m.control),
  }));
}

// Lista de todos los controles conocidos (los que tienen modelos, reemplazos o son reemplazo de otro).
export function listarControles(catalogo) {
  const cantidadModelos = new Map();
  for (const m of catalogo.modelos) {
    cantidadModelos.set(m.control, (cantidadModelos.get(m.control) ?? 0) + 1);
  }

  const numeros = new Set(cantidadModelos.keys());
  for (const [control, lista] of catalogo.reemplazosPorControl) {
    numeros.add(control);
    lista.forEach((r) => numeros.add(r));
  }

  return [...numeros]
    .sort((a, b) => a - b)
    .map((numero) => ({
      ...infoControl(catalogo, numero),
      cantidadModelos: cantidadModelos.get(numero) ?? 0,
    }));
}

export function detalleControl(catalogo, numero) {
  const modelos = catalogo.modelos
    .filter((m) => m.control === numero)
    .map((m) => ({ marca: m.marca, modelo: m.modelo }))
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo));

  const existe =
    modelos.length > 0 ||
    catalogo.reemplazosPorControl.has(numero) ||
    [...catalogo.reemplazosPorControl.values()].some((lista) => lista.includes(numero));
  if (!existe) return null;

  return { ...infoControl(catalogo, numero), modelos };
}
