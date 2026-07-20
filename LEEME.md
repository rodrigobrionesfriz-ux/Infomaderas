# Informe de Maderas — App (PWA)

Tu informe es ahora una **app instalable** en celular y escritorio, que
funciona **sin conexión**. No necesitas instalar nada para publicarla.

---

## 1. Publicarla en GitHub Pages

Sube estos archivos a la **raíz** de tu repositorio `sfriz-ux.github.io`:

```
index.html
sw.js
manifest.webmanifest
offline.html
.nojekyll
icons/            (la carpeta completa, con sus 6 imágenes)
```

### Desde el navegador, sin comandos

1. Entra a tu repositorio en GitHub.
2. **Add file → Upload files**.
3. Arrastra los archivos y la carpeta `icons/` completa.
4. Escribe un mensaje de commit y pulsa **Commit changes**.

Espera 1–2 minutos y entra a **https://sfriz-ux.github.io**

> El archivo `.nojekyll` (vacío) es necesario: sin él GitHub procesa el
> sitio con Jekyll y puede ignorar algunos archivos. Si al arrastrarlo no
> aparece, créalo con *Add file → Create new file* y nómbralo `.nojekyll`.

---

## 2. Instalarla

### Android · Chrome · Edge
Abre la URL → sale el botón **"Instalar app"** abajo a la derecha.

### iPhone / iPad (Safari)
Safari no muestra botón: **Compartir** → **Añadir a pantalla de inicio**.

### Escritorio (Windows / Mac)
Chrome o Edge → el mismo botón dentro de la página, o el ícono de instalar
en la barra de direcciones. Queda como programa, con ventana e ícono propios.

---

## 3. El modo sin conexión

Son dos capas:

- **La app** (HTML, gráficos, estilos) → la guarda el *service worker*.
- **Los datos** (las guías) → los guarda Firestore en el dispositivo
  (IndexedDB), gracias a `persistentLocalCache`.

Sin señal aparece un aviso naranja abajo a la izquierda:
*"Sin conexión — mostrando datos guardados"*. Filtros, gráficos y KPIs
siguen funcionando sobre lo ya descargado.

**Requisito:** haber abierto la app al menos una vez **con internet** e
iniciado sesión. Sin eso no hay nada guardado.

**Limitación honesta:** si nunca iniciaste sesión, sin red no podrás
hacerlo (Firebase Auth necesita validar la primera vez). Una vez iniciada,
la sesión persiste y la app sí abre offline.

Si cargas un Excel sin señal, Firestore encola la escritura y la sincroniza
cuando vuelva la conexión.

---

## 4. Actualizar la app

Cuando modifiques el informe:

1. Sube el número de versión en **`sw.js`**:

   ```js
   const VERSION = 'v4.7.0';   // ← cámbialo: v4.7.1, v4.8.0, etc.
   ```

2. Sube los archivos al repo de nuevo.

Si no cambias `VERSION`, los usuarios seguirán viendo la versión antigua
desde la caché. Cuando sí la cambias, a quien tenga la app abierta le
aparece una barra verde: *"Hay una versión nueva disponible → Actualizar"*.

---

## 5. Publicarla en Google Play

Se empaqueta como **TWA** (Trusted Web Activity): un APK real que envuelve
tu PWA. Esto sí requiere Node.js instalado.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://sfriz-ux.github.io/manifest.webmanifest
bubblewrap build
```

Genera un `.aab` que subes a Play Console (cuenta de desarrollador:
USD 25, pago único).

Bubblewrap te dará una **huella SHA-256**. Crea con ella el archivo
`.well-known/assetlinks.json` en la raíz del repo:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "cl.lacabana.maderas",
    "sha256_cert_fingerprints": ["LA_HUELLA_QUE_TE_DA_BUBBLEWRAP"]
  }
}]
```

Sin ese archivo la app abrirá mostrando la barra del navegador.

### Sobre la App Store (iOS)

Apple rechaza con frecuencia apps que son "solo un sitio web envuelto"
(guía 4.2, *Minimum Functionality*). Un dashboard interno cae justo en esa
categoría: son USD 99/año, se necesita una Mac, y el rechazo es probable.

Para uso interno, lo razonable en iOS es **"Añadir a pantalla de inicio"**
desde Safari: da exactamente la misma experiencia (ícono propio, pantalla
completa, sin barra del navegador).

---

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | El informe (la app) |
| `manifest.webmanifest` | Nombre, íconos y colores de la app |
| `sw.js` | Service worker: caché y modo sin conexión |
| `offline.html` | Pantalla de respaldo sin conexión |
| `icons/` | Íconos, generados desde tu logo |
| `.nojekyll` | Evita que GitHub procese el sitio con Jekyll |

---

## Si algo falla

**No aparece el botón "Instalar app"**
Debe servirse por **HTTPS** (GitHub Pages ya lo hace) y estar en la raíz.
Abrir el archivo con doble clic (`file://`) no sirve: hay que entrar por la
URL. En iPhone el botón nunca aparece; se usa *Añadir a pantalla de inicio*.

**Los cambios no se ven**
Sube `VERSION` en `sw.js`. Para forzar la limpieza mientras pruebas:
F12 → Application → Service Workers → *Unregister*, y recarga.

---

## 6. Actualización de datos sin duplicar (v4.8)

Al cargar un Excel, cada guía se clasifica automáticamente:

- **Nueva** → no existía → se agrega.
- **Actualizada** → ya existía pero algún dato cambió → se corrige en su lugar.
- **Sin cambios** → ya existía idéntica → se omite.

Solo las nuevas y las actualizadas se escriben en Firebase. Si recargas el
mismo archivo sin cambios, no se sube nada.

**Identidad de una guía:** NÚMERO + CONCEPTO + PRODUCTO + PATENTE + FECHA.
Estos campos no cambian nunca. Todo lo demás (cantidad, neto, bonos, centro
de costo, bodega, etc.) se considera "contenido corregible": si lo cambias
en el Excel, la guía se actualiza en vez de duplicarse.

### Botón "Reconstruir" — usar UNA sola vez

Como el criterio de identidad cambió respecto a versiones anteriores, los
documentos que ya estaban en Firebase tienen un ID con el formato viejo. Para
migrarlos:

1. Abre la app e inicia sesión (con los datos ya cargados en pantalla).
2. Pulsa **Reconstruir** (arriba, junto a Imprimir).
3. Confirma dos veces.

Borra la colección y la regraba con los IDs nuevos. **Hazlo una sola vez.**
Después, las cargas normales de Excel ya funcionan con la lógica de arriba.

> Antes de reconstruir, asegúrate de que lo que ves en pantalla sean todos
> tus datos correctos: la reconstrucción deja en la nube exactamente lo que
> tengas cargado en ese momento.
