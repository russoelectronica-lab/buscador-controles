import { obtenerCatalogo } from '../lib/db.js';
import { manejar, requerirUsuario, responder } from '../lib/http.js';

// Lo usa la app para saber si la sesión sigue activa y mostrar el nombre del cliente.
export default manejar(async (req, res) => {
  const usuario = await requerirUsuario(req, res);
  if (!usuario) return;
  // Precarga: deja el catálogo listo en memoria antes de que el cliente empiece a buscar.
  obtenerCatalogo().catch((err) => console.error('Precarga del catálogo:', err.message));
  responder(res, 200, { nombre: usuario.nombre });
});
