# TruffleMix para Android (S21 Ultra)

App móvil con el mismo estilo Frutiger Aero: Inicio, Buscar (biblioteca + YouTube), Tu biblioteca,
playlists, Favoritos y reproductor completo. Se compila **gratis en GitHub**, sin instalar nada en tu PC.

## Compilar el APK

1. Crea una cuenta en github.com y un repositorio nuevo (puede ser privado), por ejemplo `trufflemix`.
2. **Add file → Upload files**: sube **todo el contenido de esta carpeta** (incluida `www`, `assets` y `.github`).
   - Si la carpeta `.github` no se sube: **Add file → Create new file**, escribe el nombre
     `.github/workflows/build-apk.yml` y pega el contenido de `build-apk.yml.txt`.
3. Abre la pestaña **Actions**. El flujo **Build APK** corre solo al subir los archivos
   (o pulsa **Run workflow**). Tarda unos 5–10 minutos.
4. Entra a la ejecución terminada → **Artifacts → TruffleMix-apk** → descarga el zip y extrae `app-debug.apk`.
5. Pásalo al celular, ábrelo y acepta **instalar apps desconocidas** para la app que lo abre
   (Mis archivos / Chrome). Si Play Protect avisa, elige **Instalar de todos modos**.

Si el paso 3 falla, abre el paso en rojo y pásame el texto del error.

## Cómo funciona

- **Búsqueda**: escribe para filtrar tu biblioteca al instante; **Buscar** trae resultados de YouTube.
  También puedes pegar un enlace de YouTube en la barra.
- **Playlists**: **+ Nueva playlist** (Inicio o Biblioteca), menú **⋯** de cada canción → *Añadir a playlist*.
  Favoritos ♥ viene incluida.
- **Reproducción**: usa el reproductor incrustado de YouTube. Los datos se guardan en el teléfono
  (no se sincronizan con la versión de escritorio).

## Límites conocidos

- Algunos videos bloquean la reproducción incrustada (errores 101/150): la app salta al siguiente
  o puedes usar **Abrir en YouTube**.
- Con la pantalla bloqueada o la app en segundo plano, Android puede pausar el audio.
- La búsqueda lee la página de YouTube; si YouTube cambia su formato, usa un buscador de respaldo.
