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

// "500.jpg" -> 500. Las fotos se llaman solo con el número del control.
export function numeroDeFoto(nombreArchivo) {
  const m = /^(\d+)\.(jpe?g|png|webp)$/i.exec(String(nombreArchivo ?? '').trim());
  return m ? Number(m[1]) : null;
}

// Arma el índice en memoria a partir de las filas de las tablas `modelos` y `reemplazos`,
// y de las fotos disponibles (Map: número de control -> URL de la foto).
export function armarCatalogo(filasModelos, filasReemplazos, fotos = new Map()) {
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

  return { modelos, reemplazosPorControl, fotos };
}

function infoControl(catalogo, numero) {
  return {
    numero,
    nombre: nombreControl(numero),
    tipo: tipoControl(numero),
    foto: catalogo.fotos.get(numero) ?? null,
    reemplazos: (catalogo.reemplazosPorControl.get(numero) ?? []).map((r) => ({
      numero: r,
      nombre: nombreControl(r),
      foto: catalogo.fotos.get(r) ?? null,
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

// Lista de todos los controles conocidos: los que tienen modelos, reemplazos, son
// reemplazo de otro o tienen foto. No incluye los modelos: esa info no se muestra al cliente.
export function listarControles(catalogo) {
  const numeros = new Set(catalogo.modelos.map((m) => m.control));
  for (const [control, lista] of catalogo.reemplazosPorControl) {
    numeros.add(control);
    lista.forEach((r) => numeros.add(r));
  }
  for (const numero of catalogo.fotos.keys()) numeros.add(numero);

  return [...numeros].sort((a, b) => a - b).map((numero) => infoControl(catalogo, numero));
}

export function detalleControl(catalogo, numero) {
  const existe = listarControles(catalogo).some((c) => c.numero === numero);
  return existe ? infoControl(catalogo, numero) : null;
}
