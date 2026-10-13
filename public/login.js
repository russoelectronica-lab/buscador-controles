import { icono } from '/iconos.js';

for (const el of document.querySelectorAll('[data-icono]')) el.append(icono(el.dataset.icono));

const form = document.getElementById('formLogin');
const inputDni = document.getElementById('dni');
const boton = document.getElementById('botonIngresar');
const mensaje = document.getElementById('mensaje');

const ERRORES = {
  dni_invalido: 'Revisá el DNI: tiene que tener entre 6 y 9 números, sin puntos.',
  dni_no_registrado: 'Ese DNI no está habilitado. Escribinos por WhatsApp para pedir acceso.',
  usuario_inactivo: 'Tu acceso está pausado. Escribinos por WhatsApp.',
};

const AVISOS = {
  'otra-sesion': 'Tu cuenta se abrió en otro dispositivo, por eso se cerró esta sesión. Ingresá de nuevo.',
  'salir': 'Cerraste la sesión.',
};

function mostrar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  mensaje.hidden = false;
}

// Si ya hay sesión abierta, ir directo a la app.
fetch('/api/yo').then((r) => { if (r.ok) location.replace('/app'); });

const motivo = new URLSearchParams(location.search).get('motivo');
if (AVISOS[motivo]) mostrar(AVISOS[motivo], 'aviso');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dni = inputDni.value.replace(/\D/g, '');
  if (dni.length < 6) {
    mostrar(ERRORES.dni_invalido, 'error');
    inputDni.focus();
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Ingresando…';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni }),
    });
    if (res.ok) {
      location.replace('/app');
      return;
    }
    const { error } = await res.json().catch(() => ({}));
    mostrar(ERRORES[error] ?? 'No pudimos ingresar. Probá de nuevo en un rato.', 'error');
  } catch {
    mostrar('Sin conexión. Revisá internet y probá de nuevo.', 'error');
  }
  boton.disabled = false;
  boton.textContent = 'Ingresar';
});
