import { buscarModelo, MIN_CARACTERES_BUSQUEDA, normalizarModelo } from '../lib/catalogo.js';
import { obtenerCatalogo, registrarBusqueda } from '../lib/db.js';
import { manejar, parametros, requerirUsuario, responder } from '../lib/http.js';

export default manejar(async (req, res) => {
  const usuario = await requerirUsuario(req, res);
  if (!usuario) return;

  const texto = (parametros(req).get('q') ?? '').slice(0, 60);
  if (normalizarModelo(texto).length < MIN_CARACTERES_BUSQUEDA) {
    return responder(res, 400, { error: 'busqueda_corta', minimo: MIN_CARACTERES_BUSQUEDA });
  }

  const { resultados, completo } = buscarModelo(await obtenerCatalogo(), texto);

  // Guardamos solo búsquedas "terminadas" (las que pide la pantalla al dejar de escribir),
  // para ver qué modelos busca la gente y cuáles faltan cargar. Esas no necesitan resultados.
  if (parametros(req).get('registrar') === '1') {
    await registrarBusqueda(usuario.dni, texto, resultados.length).catch((err) =>
      console.error('No se pudo registrar la búsqueda:', err),
    );
    return responder(res, 200, { ok: true });
  }

  responder(res, 200, { resultados, completo });
});
