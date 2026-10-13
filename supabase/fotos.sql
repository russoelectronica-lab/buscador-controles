-- Carpeta (bucket) de fotos de los controles.
-- Pegar en Supabase > SQL Editor > New query > Run. Se corre una sola vez.
--
-- Es pública para que las fotos se puedan ver en la app: cualquiera que tenga el link de
-- una foto la puede abrir, pero NO puede subir, borrar ni listar archivos.
-- Las fotos se llaman solo con el número del control: 500.jpg, 812.webp, 446.png ...
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('fotos', 'fotos', true, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;
