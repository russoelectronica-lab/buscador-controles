// App del cliente: una sola página con pantallas por "#" en la URL.
//   #inicio · #buscar · #catalogo · #reemplazos · #control/500

import { filtrarModelos, MIN_CARACTERES_BUSQUEDA, normalizarModelo } from '/busqueda.js';
import { icono } from '/iconos.js';

const WHATSAPP = '543415851441';
const vista = document.getElementById('vista');
let nombreCliente = '';

// ---------- Utilidades ----------

// Crea elementos sin usar innerHTML (así ningún dato puede romper la página).
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

function mostrar(...elementos) {
  vista.replaceChildren(...elementos);
  vista.classList.remove('entrada');
  void vista.offsetWidth; // reinicia la animación de entrada
  vista.classList.add('entrada');
}

async function api(ruta) {
  const res = await fetch(ruta);
  if (res.status === 401) {
    const { error } = await res.json().catch(() => ({}));
    location.replace(error === 'otra_sesion' ? '/?motivo=otra-sesion' : '/');
    throw new Error('sin sesión');
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

// Se pide cada vez (no se guarda): así cada pantalla confirma que la sesión sigue activa.
async function obtenerControles() {
  return (await api('/api/controles')).controles;
}

// Guardado en el navegador para comodidad (pestaña elegida, búsquedas recientes).
// Si el navegador no deja guardar, la app funciona igual.
const memoria = {
  leer(clave, porDefecto) {
    try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  },
};

function linkWhatsapp(texto) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

function botonWhatsapp(texto, mensaje, clase = '') {
  return h('a', { class: `boton whatsapp ${clase}`, href: linkWhatsapp(mensaje), target: '_blank', rel: 'noopener' },
    icono('whatsapp'), texto);
}

function mensajePedido(control, modelo) {
  const saludo = nombreCliente ? `Hola! Soy ${nombreCliente}.` : 'Hola!';
  return modelo
    ? `${saludo} Quiero pedir el control ${control.nombre} (para ${modelo.marca} ${modelo.modelo}).`
    : `${saludo} Quiero pedir el control ${control.nombre}.`;
}

// "LEONARDO NICOLAS RUSSO" -> "Leonardo"
function primerNombre(nombre) {
  const primero = String(nombre ?? '').trim().split(/\s+/)[0] ?? '';
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
}

function titulo(texto, nota) {
  return nota ? [h('h1', {}, texto), h('p', { class: 'nota' }, nota)] : [h('h1', {}, texto)];
}

function errorCarga() {
  return h('div', { class: 'vacio' },
    h('strong', {}, 'No pudimos cargar los datos'),
    'Revisá tu conexión a internet y volvé a intentar.',
    h('div', {}, h('button', { class: 'boton claro', type: 'button', onclick: navegar }, 'Reintentar')),
  );
}

function esqueletoGrilla(cantidad = 6) {
  return h('div', { class: 'grilla' }, Array.from({ length: cantidad }, () => h('div', { class: 'esqueleto cuadro' })));
}

// Foto del control, o un recuadro con el número si todavía no tiene foto cargada.
// `diferida`: la foto se baja recién cuando aparece en pantalla (para listas largas).
function fotoControl(c, { diferida = false } = {}) {
  const sinFoto = () =>
    h('div', { class: 'foto sin-foto', role: 'img', 'aria-label': `${c.nombre}, foto próximamente` },
      icono('camara'),
      h('strong', {}, c.nombre),
      h('span', {}, 'Foto próximamente'),
    );
  if (!c.foto) return sinFoto();
  const img = h('img', { class: 'foto', src: c.foto, alt: `Control ${c.nombre}`, loading: diferida ? 'lazy' : 'eager', decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(sinFoto()));
  return img;
}

function lineaReemplazos(control) {
  return h('p', { class: 'reemplazos-linea' },
    h('span', { class: 'titulo-linea' }, 'Reemplazos:'),
    control.reemplazos.length
      ? control.reemplazos.map((r) => h('a', { class: 'pastilla', href: `#control/${r.numero}` }, r.nombre))
      : h('span', { class: 'sin-dato' }, 'no tiene cargados'),
  );
}

function miniControl(c) {
  return h('a', { class: 'mini', href: `#control/${c.numero}` }, fotoControl(c), c.nombre);
}

// ---------- Visor de foto ampliada ----------

const visor = document.getElementById('visor');
function ampliarFoto(c) {
  document.getElementById('visorTitulo').textContent = c.nombre;
  const img = document.getElementById('visorImagen');
  img.src = c.foto;
  img.alt = `Control ${c.nombre}`;
  visor.showModal();
}
document.getElementById('visorCerrar').addEventListener('click', () => visor.close());
visor.addEventListener('click', (e) => { if (e.target.tagName === 'IMG') visor.close(); });

// ---------- Inicio ----------

function pantallaInicio() {
  const tarjeta = (href, nombreIcono, tituloTarjeta, texto) =>
    h('a', { class: 'tarjeta-menu', href },
      h('span', { class: 'circulo' }, icono(nombreIcono)),
      h('span', { class: 'texto' }, h('strong', {}, tituloTarjeta), h('span', { class: 'desc' }, texto)),
      h('span', { class: 'flecha' }, icono('derecha')),
    );

  mostrar(
    h('h1', { class: 'saludo' }, nombreCliente ? `Hola, ${primerNombre(nombreCliente)} 👋` : 'Hola 👋'),
    h('p', { class: 'nota' }, '¿Qué control estás buscando hoy?'),
    h('a', { class: 'buscador-falso', href: '#buscar' }, icono('buscar'), 'Escribí el modelo de la TV o del aire…'),
    h('div', { class: 'tarjetas' },
      tarjeta('#buscar', 'buscar', 'Buscar por modelo', 'Te decimos qué control lleva cada TV o aire.'),
      tarjeta('#catalogo', 'catalogo', 'Ver catálogo', 'Todos los controles de TV y de aire, con foto.'),
      tarjeta('#reemplazos', 'reemplazos', 'Reemplazos', 'Con qué control se puede reemplazar cada uno.'),
    ),
    h('div', { class: 'contacto' },
      h('div', {},
        h('p', {}, h('b', {}, '¿No encontrás un modelo?'), ' Escribinos y te ayudamos.'),
        h('p', { class: 'dato' }, 'Santiago 3462, Rosario · 341 585-1441'),
      ),
      botonWhatsapp('Escribir por WhatsApp', nombreCliente ? `Hola! Soy ${nombreCliente}. ` : 'Hola! '),
    ),
  );
}

// ---------- Buscar por modelo ----------

const MAX_SUGERENCIAS = 8;
const MAX_RECIENTES = 6;

// Resalta la parte del modelo que coincide con lo escrito ("EA50X6100" con "50x6" -> EA<mark>50X6</mark>100).
function resaltar(modelo, texto) {
  const q = normalizarModelo(texto);
  const posiciones = []; // posición en `modelo` de cada letra/número
  [...modelo].forEach((ch, i) => { if (/[A-Z0-9]/i.test(ch)) posiciones.push(i); });
  const desde = normalizarModelo(modelo).indexOf(q);
  if (!q || desde < 0) return [modelo];
  const a = posiciones[desde];
  const b = posiciones[desde + q.length - 1] + 1;
  return [modelo.slice(0, a), h('mark', {}, modelo.slice(a, b)), modelo.slice(b)];
}

function tarjetaResultado(r) {
  const c = r.control;
  return h('article', { class: 'resultado' },
    h('div', { class: 'resultado-cabecera' }, 'Control para ', h('b', {}, `${r.marca} ${r.modelo}`)),
    h('div', { class: 'resultado-cuerpo' },
      c.foto && h('a', { class: 'resultado-foto', href: `#control/${c.numero}`, 'aria-label': `Ver ${c.nombre}` }, fotoControl(c)),
      h('div', { class: 'resultado-datos' },
        h('span', { class: 'etiqueta-chica' }, 'Control equivalente'),
        h('a', { class: 'control-grande', href: `#control/${c.numero}` }, c.nombre),
        lineaReemplazos(c),
      ),
    ),
    h('div', { class: 'acciones' },
      botonWhatsapp('Pedir por WhatsApp', mensajePedido(c, r)),
      h('a', { class: 'boton claro', href: `#control/${c.numero}` }, 'Ver ficha'),
    ),
  );
}

function pantallaBuscar() {
  const input = h('input', {
    class: 'campo', type: 'search', id: 'buscador', autocomplete: 'off', autocapitalize: 'characters',
    autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search', placeholder: 'Ej: EA50X6100',
    'aria-label': 'Modelo de TV o aire', role: 'combobox', 'aria-autocomplete': 'list',
    'aria-controls': 'sugerencias', 'aria-expanded': 'false',
  });
  const limpiar = h('button', { class: 'boton-limpiar', type: 'button', 'aria-label': 'Borrar', hidden: true }, icono('cerrar'));
  const girando = h('span', { class: 'girando', hidden: true, 'aria-hidden': 'true' });
  const sugerencias = h('ul', { class: 'sugerencias', id: 'sugerencias', role: 'listbox', hidden: true });
  const resultados = h('div', { class: 'resultados', 'aria-live': 'polite' });

  // Lo último que trajo el servidor. Si vino completo, mientras el cliente siga escribiendo
  // (agregando letras a lo mismo) filtramos acá en el celular, sin esperar a nadie.
  let base = null;         // { q, resultados, completo }
  let lista = [];          // lo que se está mostrando
  let textoLista = '';
  let marcada = -1;        // sugerencia elegida con las flechas del teclado
  let temporizador = null;
  let temporizadorRegistro = null;
  let ultimaConsulta = 0;
  let ultimoRegistrado = '';

  // Guarda la búsqueda para las estadísticas (una sola vez por texto).
  function registrar(texto) {
    clearTimeout(temporizadorRegistro);
    const q = normalizarModelo(texto);
    if (q.length < MIN_CARACTERES_BUSQUEDA || q === ultimoRegistrado) return;
    ultimoRegistrado = q;
    fetch(`/api/buscar?q=${encodeURIComponent(texto)}&registrar=1`).catch(() => {});
  }

  function guardarReciente(modelo) {
    const recientes = memoria.leer('recientes', []).filter((m) => m !== modelo);
    memoria.guardar('recientes', [modelo, ...recientes].slice(0, MAX_RECIENTES));
  }

  function cerrarSugerencias() {
    sugerencias.hidden = true;
    sugerencias.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    marcada = -1;
  }

  function sinResultados(texto) {
    return h('div', { class: 'vacio' },
      h('strong', {}, `No encontramos "${texto.toUpperCase()}"`),
      'Revisá que esté bien escrito o probá con una parte del modelo. Si no aparece, consultanos:',
      h('div', {}, botonWhatsapp('Consultar por WhatsApp', `Hola! Busco el control para el modelo ${texto.toUpperCase()}.`)),
    );
  }

  function pantallaVacia() {
    const recientes = memoria.leer('recientes', []);
    return [
      recientes.length > 0 && h('div', { class: 'recientes' },
        h('h2', {}, 'Buscados recientemente'),
        h('div', { class: 'chips' }, recientes.map((m) =>
          h('button', { class: 'chip', type: 'button', onclick: () => buscarReciente(m) }, icono('reloj'), m))),
      ),
      h('div', { class: 'consejos' },
        h('b', {}, 'Consejos para encontrarlo rápido'),
        h('ul', {},
          h('li', {}, 'Escribí ', h('b', {}, 'solo el modelo'), ', sin la marca.'),
          h('li', {}, 'Con ', h('b', {}, '4 letras o números'), ' ya te mostramos opciones.'),
          h('li', {}, 'No importan mayúsculas, espacios ni guiones.'),
          h('li', {}, 'El modelo está en la etiqueta de atrás de la TV o del aire.'),
        ),
      ),
    ];
  }

  function pintarSugerencias() {
    resultados.replaceChildren();
    if (!lista.length) {
      cerrarSugerencias();
      resultados.replaceChildren(sinResultados(textoLista));
      return;
    }
    const items = lista.slice(0, MAX_SUGERENCIAS).map((r, i) =>
      h('li', {
        role: 'option', id: `sug-${i}`, 'aria-selected': String(i === marcada),
        class: i === marcada ? 'marcada' : null,
        // pointerdown en vez de click: así el teclado del celular no se cierra antes de elegir
        onpointerdown: (e) => { e.preventDefault(); elegir(r); },
      },
        h('span', { class: 'sug-texto' },
          h('span', { class: 'sug-modelo' }, resaltar(r.modelo, textoLista)),
          h('span', { class: 'sug-marca' }, r.marca),
        ),
        h('span', { class: 'sug-control' }, r.control.nombre),
      ),
    );
    if (lista.length > MAX_SUGERENCIAS) {
      items.push(h('li', { class: 'sug-todos', onpointerdown: (e) => { e.preventDefault(); verTodos(); } },
        `Ver los ${lista.length}${base?.completo === false ? ' primeros' : ''} resultados`));
    }
    sugerencias.replaceChildren(...items);
    sugerencias.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (marcada >= 0) input.setAttribute('aria-activedescendant', `sug-${marcada}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function elegir(r) {
    input.value = r.modelo;
    limpiar.hidden = false;
    registrar(textoLista);
    guardarReciente(r.modelo);
    cerrarSugerencias();
    resultados.replaceChildren(tarjetaResultado(r));
    input.blur(); // cierra el teclado del celular
  }

  function verTodos() {
    registrar(textoLista);
    cerrarSugerencias();
    resultados.replaceChildren(...(lista.length ? lista.map(tarjetaResultado) : [sinResultados(textoLista)]));
    input.blur();
  }

  // Muestra lo que corresponde a lo escrito. Devuelve true cuando la lista quedó al día.
  async function actualizar() {
    const texto = input.value.trim();
    const q = normalizarModelo(texto);
    limpiar.hidden = !input.value;

    if (q.length < MIN_CARACTERES_BUSQUEDA) {
      ++ultimaConsulta;
      girando.hidden = true;
      lista = [];
      textoLista = '';
      cerrarSugerencias();
      const faltan = MIN_CARACTERES_BUSQUEDA - q.length;
      resultados.replaceChildren(...(q.length
        ? [h('p', { class: 'ayuda-busqueda' }, `Seguí escribiendo… ${faltan === 1 ? 'falta 1 letra o número' : `faltan ${faltan} letras o números`}`)]
        : pantallaVacia()));
      return false;
    }

    // Instantáneo: filtramos en el celular lo que ya trajo el servidor.
    if (base?.completo && q.startsWith(base.q)) {
      ++ultimaConsulta;
      girando.hidden = true;
      lista = filtrarModelos(base.resultados, texto);
      textoLista = texto;
      marcada = -1;
      pintarSugerencias();
      return true;
    }

    const consulta = ++ultimaConsulta;
    girando.hidden = false;
    try {
      const datos = await api(`/api/buscar?q=${encodeURIComponent(texto)}`);
      if (consulta !== ultimaConsulta) return false; // ya escribió otra cosa
      base = { q, resultados: datos.resultados, completo: datos.completo };
      girando.hidden = true;
      // Mientras esperábamos pudo haber seguido escribiendo: lo resolvemos con lo que llegó.
      if (input.value.trim() !== texto) return actualizar();
      lista = datos.resultados;
      textoLista = texto;
      marcada = -1;
      pintarSugerencias();
      return true;
    } catch {
      if (consulta === ultimaConsulta) {
        girando.hidden = true;
        cerrarSugerencias();
        resultados.replaceChildren(errorCarga());
      }
      return false;
    }
  }

  async function buscarReciente(modelo) {
    input.value = modelo;
    if (!(await actualizar())) return;
    const exacto = lista.find((r) => r.modelo === modelo);
    if (exacto) elegir(exacto);
  }

  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    clearTimeout(temporizadorRegistro);
    const q = normalizarModelo(input.value);
    const puedeSerLocal = base?.completo && q.startsWith(base.q);
    // Si se puede filtrar acá, o justo llegó a 4 caracteres, no esperamos nada.
    if (puedeSerLocal || q.length <= MIN_CARACTERES_BUSQUEDA) actualizar();
    else temporizador = setTimeout(actualizar, 120);
    // Si deja de escribir 2 segundos, guardamos la búsqueda (para estadísticas).
    temporizadorRegistro = setTimeout(() => registrar(input.value.trim()), 2000);
  });

  input.addEventListener('keydown', async (e) => {
    const visibles = Math.min(lista.length, MAX_SUGERENCIAS);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !sugerencias.hidden && visibles) {
      e.preventDefault();
      marcada = e.key === 'ArrowDown' ? (marcada + 1) % visibles : (marcada - 1 + visibles) % visibles;
      pintarSugerencias();
    } else if (e.key === 'Escape') {
      cerrarSugerencias();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(temporizador);
      if (marcada >= 0 && !sugerencias.hidden) return elegir(lista[marcada]);
      if (input.value.trim() !== textoLista && !(await actualizar())) return;
      if (lista.length === 1) return elegir(lista[0]);
      verTodos();
    }
  });

  limpiar.addEventListener('click', () => {
    input.value = '';
    actualizar();
    input.focus();
  });

  input.addEventListener('blur', () => setTimeout(cerrarSugerencias, 150));
  input.addEventListener('focus', () => {
    if (lista.length && input.value.trim() === textoLista && !resultados.querySelector('.resultado')) pintarSugerencias();
  });

  mostrar(
    ...titulo('Buscar por modelo'),
    h('div', { class: 'caja-busqueda' }, icono('buscar'), input, girando, limpiar),
    h('p', { class: 'ayuda-busqueda' }, 'Escribí el modelo, sin la marca. Desde 4 letras o números.'),
    sugerencias,
    resultados,
  );
  resultados.replaceChildren(...pantallaVacia());
  input.focus();
}

// ---------- Catálogo ----------

async function pantallaCatalogo() {
  const encabezado = titulo('Catálogo de controles', 'Tocá un control para verlo grande y ver sus reemplazos.');
  mostrar(...encabezado, esqueletoGrilla());
  let controles;
  try {
    controles = await obtenerControles();
  } catch {
    return mostrar(...encabezado, errorCarga());
  }

  let tipo = memoria.leer('catalogoTipo', 'LCD') === 'AR' ? 'AR' : 'LCD';
  const cantidad = (t) => controles.filter((c) => c.tipo === t).length;
  const grilla = h('div', { class: 'grilla' });
  const contador = h('p', { class: 'contador' });
  const filtro = h('input', {
    class: 'campo', type: 'search', inputmode: 'numeric', placeholder: 'Buscar por número, ej: 500',
    'aria-label': 'Buscar control por número',
  });
  const pestana = (valor, texto) =>
    h('button', { type: 'button', role: 'tab', 'data-tipo': valor, 'aria-selected': String(valor === tipo), onclick: () => elegir(valor) },
      texto, h('small', {}, `${cantidad(valor)} controles`));
  const pestanas = h('div', { class: 'segmentado', role: 'tablist' },
    pestana('LCD', 'TV LCD · LED · Smart'),
    pestana('AR', 'Aire acondicionado'),
  );

  function elegir(valor) {
    tipo = valor;
    memoria.guardar('catalogoTipo', valor);
    for (const b of pestanas.children) b.setAttribute('aria-selected', String(b.dataset.tipo === tipo));
    pintar();
  }

  function pintar() {
    const f = filtro.value.replace(/\D/g, '');
    const lista = controles.filter((c) => c.tipo === tipo && String(c.numero).includes(f));
    contador.textContent = f ? `${lista.length} de ${cantidad(tipo)} controles` : '';
    grilla.replaceChildren(
      ...(lista.length
        ? lista.map((c) =>
            h('a', { class: 'control-boton', href: `#control/${c.numero}`, 'aria-label': c.nombre },
              fotoControl(c, { diferida: true }),
              h('strong', {}, c.nombre),
            ))
        : [h('div', { class: 'vacio' }, h('strong', {}, 'No hay controles para mostrar'), f ? 'Probá con otro número.' : 'Todavía no hay controles cargados en esta sección.')]),
    );
  }

  filtro.addEventListener('input', pintar);
  mostrar(...encabezado, pestanas, h('div', { class: 'filtro' }, icono('buscar'), filtro), contador, grilla);
  pintar();
}

// ---------- Reemplazos ----------

async function pantallaReemplazos() {
  const encabezado = titulo('Reemplazos', 'Tocá un control para ver con cuáles se puede reemplazar.');
  mostrar(...encabezado, h('div', { class: 'lista-reemplazos' }, Array.from({ length: 5 }, () => h('div', { class: 'esqueleto fila' }))));
  let controles;
  try {
    controles = (await obtenerControles()).filter((c) => c.reemplazos.length);
  } catch {
    return mostrar(...encabezado, errorCarga());
  }

  const lista = h('div', { class: 'lista-reemplazos' });
  const filtro = h('input', {
    class: 'campo', type: 'search', inputmode: 'numeric', placeholder: 'Buscar por número, ej: 500',
    'aria-label': 'Buscar control por número',
  });
  const abierto = memoria.leer('reemplazoAbierto', null);

  function pintar() {
    const f = filtro.value.replace(/\D/g, '');
    const visibles = controles.filter((c) => String(c.numero).includes(f));
    lista.replaceChildren(
      ...(visibles.length
        ? visibles.map((c) => {
            const detalle = h('details', { open: c.numero === abierto },
              h('summary', {},
                h('span', { class: 'miniatura' }, fotoControl(c, { diferida: true })),
                h('span', { class: 'nombre' }, c.nombre,
                  h('span', { class: 'cantidad' }, c.reemplazos.length === 1 ? '1 reemplazo' : `${c.reemplazos.length} reemplazos`)),
                icono('derecha'),
              ),
              h('div', { class: 'cuerpo' },
                h('p', { class: 'nota' }, `El ${c.nombre} se puede reemplazar por:`),
                h('div', { class: 'mini-grilla' }, c.reemplazos.map(miniControl)),
              ),
            );
            detalle.addEventListener('toggle', () => {
              if (detalle.open) memoria.guardar('reemplazoAbierto', c.numero);
            });
            return detalle;
          })
        : [h('div', { class: 'vacio' }, h('strong', {}, 'Sin resultados'), 'No hay controles con reemplazos para ese número.')]),
    );
  }

  filtro.addEventListener('input', pintar);
  mostrar(...encabezado, h('div', { class: 'filtro' }, icono('buscar'), filtro), lista);
  pintar();
}

// ---------- Ficha de un control ----------

function botonVolver() {
  return h('button', {
    class: 'volver', type: 'button',
    onclick: () => (history.length > 1 ? history.back() : (location.hash = '#catalogo')),
  }, icono('izquierda'), 'Volver');
}

async function pantallaControl(numero) {
  mostrar(botonVolver(), h('div', { class: 'ficha' }, h('div', { class: 'esqueleto cuadro' })));
  let c;
  try {
    c = await api(`/api/controles?n=${encodeURIComponent(numero)}`);
  } catch {
    return mostrar(botonVolver(), h('div', { class: 'vacio' }, h('strong', {}, `No encontramos el control ${numero}`), 'Puede que todavía no esté cargado.'));
  }

  const foto = c.foto
    ? h('button', { class: 'ficha-foto', type: 'button', onclick: () => ampliarFoto(c), 'aria-label': `Ampliar foto del ${c.nombre}` },
        fotoControl(c), h('span', { class: 'lupa' }, icono('lupa'), 'Ampliar'))
    : h('div', { class: 'ficha-foto' }, fotoControl(c));

  mostrar(
    botonVolver(),
    h('article', { class: 'ficha' },
      foto,
      h('span', { class: 'etiqueta-chica' }, c.tipo === 'AR' ? 'Control de aire acondicionado' : 'Control de TV LCD · LED · Smart'),
      h('h1', {}, c.nombre),
      h('h2', {}, 'Se puede reemplazar por'),
      c.reemplazos.length
        ? h('div', { class: 'mini-grilla' }, c.reemplazos.map(miniControl))
        : h('p', { class: 'sin-dato' }, 'Este control no tiene reemplazos cargados.'),
      h('div', { class: 'acciones' }, botonWhatsapp('Pedir por WhatsApp', mensajePedido(c), 'ancho')),
    ),
  );
}

// ---------- Navegación ----------

function marcarPestana(ruta) {
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.ruta === ruta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function navegar() {
  const [ruta, param] = location.hash.replace(/^#/, '').split('/');
  if (visor.open) visor.close();
  window.scrollTo(0, 0);
  marcarPestana(ruta === 'control' ? null : ['buscar', 'catalogo', 'reemplazos'].includes(ruta) ? ruta : 'inicio');
  switch (ruta) {
    case 'buscar': return pantallaBuscar();
    case 'catalogo': return pantallaCatalogo();
    case 'reemplazos': return pantallaReemplazos();
    case 'control': return pantallaControl(param);
    default: return pantallaInicio();
  }
}

// Íconos fijos del HTML (barra de arriba y de abajo).
for (const el of document.querySelectorAll('[data-icono]')) el.append(icono(el.dataset.icono));

document.getElementById('botonSalir').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' }).catch(() => {});
  location.replace('/?motivo=salir');
});

// Si la cuenta se abre en otro dispositivo, avisamos apenas el cliente vuelve a esta pestaña.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') api('/api/yo').catch(() => {});
});

(async () => {
  const yo = await api('/api/yo');
  nombreCliente = yo.nombre ?? '';
  window.addEventListener('hashchange', navegar);
  navegar();
})().catch(() => {});
