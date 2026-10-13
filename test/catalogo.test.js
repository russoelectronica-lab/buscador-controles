import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  armarCatalogo,
  numeroDeFoto,
  buscarModelo,
  detalleControl,
  listarControles,
  nombreControl,
  normalizarModelo,
  parsearReemplazos,
} from '../lib/catalogo.js';

const catalogo = armarCatalogo(
  [
    { marca: 'noblex', modelo: 'EA50X6100', control: 500 },
    { marca: 'LG', modelo: '32LF565B', control: 477 },
    { marca: 'NOBLEX', modelo: 'LT32DR530', control: 446 },
    { marca: 'SAMSUNG', modelo: 'UN43J5320', control: 520 },
    { marca: 'SURREY', modelo: 'MSY-12HRDN1', control: 812 },
  ],
  [
    { control: 500, reemplazos: '522-553' },
    { control: 446, reemplazos: '452' },
    { control: 520, reemplazos: '589' },
  ],
  new Map([[500, '/fotos/500.jpg'], [522, '/fotos/522.webp'], [701, '/fotos/701.png']]),
);

test('normaliza modelos ignorando mayúsculas, espacios, guiones y puntos', () => {
  assert.equal(normalizarModelo(' ea-50 x6.100 '), 'EA50X6100');
});

test('acepta distintos separadores en los reemplazos', () => {
  for (const texto of ['522-553', '522, 553', '522 553', '522/553', '522;553']) {
    assert.deepEqual(parsearReemplazos(texto), [522, 553], texto);
  }
  assert.deepEqual(parsearReemplazos(''), []);
  assert.deepEqual(parsearReemplazos(452), [452]);
});

test('nombra LCD hasta el 799 y AR desde el 800', () => {
  assert.equal(nombreControl(500), 'LCD 500');
  assert.equal(nombreControl(812), 'AR 812');
});

test('busca el modelo exacto y devuelve control y reemplazos', () => {
  const [r, ...resto] = buscarModelo(catalogo, 'ea50x6100');
  assert.equal(resto.length, 0);
  assert.equal(r.marca, 'NOBLEX');
  assert.equal(r.modelo, 'EA50X6100');
  assert.equal(r.control.nombre, 'LCD 500');
  assert.deepEqual(r.control.reemplazos.map((x) => x.numero), [522, 553]);
});

test('encuentra coincidencias parciales', () => {
  assert.deepEqual(buscarModelo(catalogo, '32lf').map((r) => r.modelo), ['32LF565B']);
  assert.deepEqual(buscarModelo(catalogo, 'msy12').map((r) => r.control.nombre), ['AR 812']);
});

test('encuentra el modelo aunque el cliente escriba un sufijo de más', () => {
  const [r] = buscarModelo(catalogo, 'UN43J5320AGXZD');
  assert.equal(r.modelo, 'UN43J5320');
});

test('no busca con menos de 4 caracteres', () => {
  assert.deepEqual(buscarModelo(catalogo, 'ea5'), []);
  assert.deepEqual(buscarModelo(catalogo, '- -'), []);
});

test('para el predictivo, primero los modelos que empiezan con lo escrito', () => {
  const cat = armarCatalogo(
    [
      { marca: 'X', modelo: 'AB32LF', control: 401 },
      { marca: 'LG', modelo: '32LF565B', control: 477 },
      { marca: 'LG', modelo: '32LF550', control: 477 },
    ],
    [],
  );
  assert.deepEqual(buscarModelo(cat, '32lf').map((r) => r.modelo), ['32LF550', '32LF565B', 'AB32LF']);
});

test('los reemplazos van en un solo sentido', () => {
  assert.deepEqual(detalleControl(catalogo, 522).reemplazos, []);
  assert.equal(detalleControl(catalogo, 500).reemplazos.length, 2);
});

test('lista todos los controles, incluidos los que solo aparecen como reemplazo o tienen foto', () => {
  const lista = listarControles(catalogo);
  assert.deepEqual(lista.map((c) => c.numero), [446, 452, 477, 500, 520, 522, 553, 589, 701, 812]);
  assert.equal(lista.find((c) => c.numero === 500).foto, '/fotos/500.jpg');
  assert.equal(lista.find((c) => c.numero === 553).foto, null);
});

test('el detalle y la lista no exponen los modelos que usa cada control', () => {
  assert.equal('modelos' in detalleControl(catalogo, 500), false);
  assert.equal('cantidadModelos' in listarControles(catalogo)[0], false);
});

test('los reemplazos y los resultados de búsqueda traen la foto si existe', () => {
  const [r] = buscarModelo(catalogo, 'ea50x6100');
  assert.equal(r.control.foto, '/fotos/500.jpg');
  assert.deepEqual(r.control.reemplazos.map((x) => x.foto), ['/fotos/522.webp', null]);
});

test('reconoce fotos nombradas con el número del control', () => {
  assert.equal(numeroDeFoto('500.jpg'), 500);
  assert.equal(numeroDeFoto('800.WEBP'), 800);
  assert.equal(numeroDeFoto('500.jpeg'), 500);
  assert.equal(numeroDeFoto('control 500.jpg'), null);
  assert.equal(numeroDeFoto('.emptyFolderPlaceholder'), null);
});

test('detalle de un control inexistente devuelve null', () => {
  assert.equal(detalleControl(catalogo, 999), null);
});
