import { borrarSesion } from '../lib/db.js';
import { borrarCookieSesion, manejar, olvidarSesionesDe, requerirUsuario, responder } from '../lib/http.js';

export default manejar(async (req, res) => {
  if (req.method !== 'POST') return responder(res, 405, { error: 'metodo_no_permitido' });
  const usuario = await requerirUsuario(req, res);
  if (!usuario) return;
  await borrarSesion(usuario.dni);
  olvidarSesionesDe(usuario.dni);
  borrarCookieSesion(req, res);
  responder(res, 200, { ok: true });
});
