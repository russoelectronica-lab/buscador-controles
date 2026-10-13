import { buscarUsuarioPorDni, guardarSesion } from '../lib/db.js';
import { leerJson, manejar, nuevaSesion, olvidarSesionesDe, ponerCookieSesion, responder } from '../lib/http.js';

export default manejar(async (req, res) => {
  if (req.method !== 'POST') return responder(res, 405, { error: 'metodo_no_permitido' });

  const { dni: dniCrudo } = await leerJson(req);
  // Aceptamos "36.004.936" o "36 004 936": nos quedamos solo con los números.
  const dni = String(dniCrudo ?? '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 9) return responder(res, 400, { error: 'dni_invalido' });

  const usuario = await buscarUsuarioPorDni(dni);
  if (!usuario) return responder(res, 401, { error: 'dni_no_registrado' });
  if (usuario.activo === false) return responder(res, 403, { error: 'usuario_inactivo' });

  const sesion = nuevaSesion();
  await guardarSesion(dni, sesion.hash);
  olvidarSesionesDe(dni);
  ponerCookieSesion(req, res, sesion.token);
  responder(res, 200, { nombre: usuario.nombre });
});
