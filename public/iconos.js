// Íconos de la app (SVG de trazo, 24x24). Son textos fijos escritos acá, no datos de la base.

const TRAZO = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const DIBUJOS = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  catalogo: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  reemplazos: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
  cerrar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  derecha: '<path d="m9 6 6 6-6 6"/>',
  izquierda: '<path d="m15 6-6 6 6 6"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6"/><path d="M8 11h6"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  control: '<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="6.5" r="1.3"/><path d="M10 11h.01M14 11h.01M10 14.5h.01M14 14.5h.01M10 18h.01M14 18h.01"/>',
};

// WhatsApp va relleno, no de trazo.
const WHATSAPP =
  '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

export function iconoHtml(nombre) {
  if (nombre === 'whatsapp') return WHATSAPP;
  return `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" ${TRAZO}>${DIBUJOS[nombre] ?? ''}</svg>`;
}

export function icono(nombre) {
  const t = document.createElement('template');
  t.innerHTML = iconoHtml(nombre);
  return t.content.firstElementChild;
}
