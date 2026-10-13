# Buscador de Controles — RUSSO Electrónica

App web para que los clientes mayoristas busquen qué control remoto lleva cada TV o aire
acondicionado, vean el catálogo y los reemplazos de cada control.

- **Login con DNI**, una sola sesión por cliente: si entra desde otro dispositivo, la sesión anterior se cierra.
- **Buscar por modelo**: escribís `ea50x6100` y muestra *Control equivalente para NOBLEX EA50X6100 → LCD 500 · Reemplazos: LCD 522, LCD 553*.
  No importan mayúsculas, espacios ni guiones, busca coincidencias parciales y encuentra el modelo aunque el cliente escriba letras de más al final.
- **Catálogo**: fotos de los controles LCD/LED/Smart (400–799) y de aire acondicionado (800 en adelante).
  No muestra qué modelos usa cada control: esa info queda guardada solo para vos.
- **Reemplazos**: lista de controles; al tocar uno muestra sus equivalentes (en un solo sentido), y cada equivalente abre su foto.
- Guarda las búsquedas, para saber qué modelos piden y no están cargados.

## Cómo está armado

| Carpeta | Qué hay |
|---|---|
| `public/` | Las pantallas (HTML, CSS y JS). |
| `api/` | Funciones del servidor (login, búsqueda, catálogo). Corren en Vercel. |
| `lib/` | Lógica compartida: búsqueda (`catalogo.js`), base de datos (`db.js`), sesión (`http.js`). |
| `supabase/schema.sql` | Crea las tablas en Supabase. |
| `data/demo.json` | Datos de prueba para correr la app sin Supabase. |

Los datos **nunca** se leen directo desde el navegador: el navegador le pregunta al servidor
(`/api/...`) y el servidor, después de verificar la sesión, consulta Supabase con una clave
secreta que solo está en Vercel. Por eso, a diferencia de tirasled, acá no hay ninguna clave en el HTML.

## Puesta en marcha (una sola vez)

### 1. Supabase
1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (por ejemplo `controlados`).
2. Andá a **SQL Editor → New query**, pegá todo el contenido de `supabase/schema.sql` y tocá **Run**.
   Eso crea las tablas `modelos`, `reemplazos`, `usuarios` y `busquedas`, con los 4 modelos de ejemplo.
3. Cargá tus clientes en la tabla **usuarios** (Table Editor → usuarios → Insert). Solo hace falta `dni` (solo números) y `nombre`.
4. Copiá dos datos:
   - **Project URL** (ej. `https://abcd1234.supabase.co`): botón **Connect** arriba, o **Project Settings → Data API**.
   - **Clave secreta**: **Project Settings → API Keys**. Sirve cualquiera de las dos:
     la **secret key** (`sb_secret_...`, pestaña *API Keys*) o la **service_role** (`eyJ...`, pestaña *Legacy API Keys*).
     ⚠️ Esta clave no se pega nunca en un HTML ni se comparte. La *publishable* / *anon* **no** sirve.

### 2. Vercel
1. En [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo `controlados-app`.
2. Framework: **Other**. No hace falta tocar nada más del build.
3. En **Environment Variables** agregá:
   - `SUPABASE_URL` = la Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = la service_role key
4. **Deploy**. Listo: entrá a la URL que te da Vercel e ingresá con un DNI que hayas cargado.

## Cargar el catálogo desde el Excel

Supabase permite importar CSV en cada tabla (**Table Editor → la tabla → Insert → Import data from CSV**).
Los encabezados del CSV tienen que llamarse igual que las columnas:

| Hoja del Excel | Tabla | Columnas del CSV |
|---|---|---|
| MODELOS | `modelos` | `marca`, `modelo`, `control` |
| REEMPLAZOS | `reemplazos` | `control`, `reemplazos` |
| USUARIOS | `usuarios` | `dni`, `nombre` |

**Importante con los reemplazos:** escribilos separados con **guion** (`522-553`), o poné la
columna en formato *Texto* antes de escribir. Si escribís `522,553` en una celda numérica,
Excel lo guarda como el número decimal 522,553 y se pierde el dato.

Los cambios en el catálogo aparecen en la app en menos de un minuto.

## Fotos de los controles

1. Una sola vez: en Supabase, **SQL Editor → New query**, pegá `supabase/fotos.sql` y **Run**.
   Eso crea la carpeta pública `fotos` en **Storage**.
2. Entrá a **Storage → fotos** y arrastrá las fotos. El nombre tiene que ser **solo el número** del control:
   `500.jpg`, `812.webp`, `446.png` (sirven jpg, png y webp).
3. Aparecen en la app en menos de un minuto. Para cambiar una foto, subí otra con el mismo nombre
   (Supabase pregunta si querés reemplazarla).

Mientras un control no tenga foto, la app muestra un recuadro con el número y "Foto próximamente".
Consejo: fotos cuadradas, fondo blanco, de unos 800×800 px y menos de 200 KB, así cargan rápido en el celular.

## Velocidad

- Al escribir 4 letras o números se hace **un solo pedido** al servidor; las letras siguientes se
  filtran en el celular al instante (salvo que haya más de 300 coincidencias).
- El servidor guarda en memoria el catálogo (se renueva solo cada minuto) y las sesiones ya verificadas (15 segundos).
- **Región**: para que cada pedido tarde lo menos posible, Vercel y Supabase tienen que estar en la misma región.
  Mirá la región de Supabase en **Project Settings → General** (por ejemplo *South America (São Paulo)*) y elegí
  la misma en Vercel: **Settings → Functions → Function Region** (São Paulo es `gru1`). Después, **Redeploy**.

## Instalar en el celular

La app se puede agregar a la pantalla de inicio como si fuera una app:
- **Android (Chrome)**: menú ⋮ → *Agregar a la pantalla principal*.
- **iPhone (Safari)**: botón compartir → *Agregar a inicio*.

## Administración diaria

- **Cortar el acceso a un cliente**: en `usuarios`, poner `activo` en `false`.
- **Ver qué buscan y no encuentran**: en el SQL Editor, `select * from busquedas_sin_resultado;`
- **Ver todas las búsquedas**: tabla `busquedas`.

## Probar en la computadora (opcional)

Con [Node.js](https://nodejs.org) instalado:

```bash
npm run dev     # abre http://localhost:3000 — DNI de prueba: 11111111
npm test        # pruebas de la búsqueda
```

Sin variables de Supabase usa los datos de `data/demo.json` y las fotos que pongas en `public/fotos/`.

## Próximos pasos

- PIN corto además del DNI, para cuando el servicio sea pago.
- Panel de administración para cargar modelos sin pasar por Supabase.
