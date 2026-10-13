// Lógica pura del catálogo: buscar y armar la info de cada control.
// No accede a la base de datos, así se puede probar fácil (ver test/catalogo.test.js).

import { filtrarModelos, MIN_CARACTERES_BUSQUEDA, normalizarModelo } from '../public/busqueda.js';

export { MIN_CARACTERES_BUSQUEDA, normalizarModelo };

// Los controles 800 en adelante son de aire acondicionado; el resto, LCD/LED/Smart.
export const PRIMER_CONTROL_AIRE = 800;

export function tipoControl(numero) {
  return numero >= PRIMER_CONTROL_AIRE ? 'AR' : 'LCD';
}

export function nombreControl(numero) {
  return `${tipoControl(numero)} ${numero}`;
}


// "522-553", "522, 553", "522 553" o "522/553" -> [522, 553]
export function parsearReemplazos(texto) {
  return String(texto ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
}

// Tope de resultados por búsqueda. Si una búsqueda trae todos (completo: true), el
// navegador sigue filtrando solo mientras el cliente escribe, sin volver a preguntar.
export const MAX_RESULTADOS = 300;

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

// Devuelve los modelos que coinciden (exactos primero, ver public/busqueda.js) y si la
// lista está completa o se cortó en MAX_RESULTADOS.
export function buscarModelo(catalogo, texto, limite = MAX_RESULTADOS) {
  const encontrados = filtrarModelos(catalogo.modelos, texto, limite + 1);
  return {
    completo: encontrados.length <= limite,
    resultados: encontrados.slice(0, limite).map((m) => ({
      marca: m.marca,
      modelo: m.modelo,
      control: infoControl(catalogo, m.control),
    })),
  };
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
