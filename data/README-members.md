# Equipo CODE UP · 2026-2

`members-2026-2.json` es la fuente pública del directorio y de los retratos del inicio.

Actualización del 14 de septiembre de 2026 a partir del Excel entregado por la organización: **Code UP - Base de datos 2026-2 (respuestas).xlsx**. Las 57 respuestas corresponden a 50 personas distintas tras unificar siete respuestas repetidas por nombre y apellidos normalizados. Se conservan las personas que siguen en la lista, también si están en licencia; por eso el contador dice «integrantes», no «activos».

Solo se incluyen nombre de presentación, cargo, área, carrera y referencia de foto. El Excel, las filas completas, los correos personales, los teléfonos, las fechas de nacimiento y los códigos universitarios no forman parte del sitio.

Los cargos y áreas proceden del Excel, no de las carpetas antiguas de fotos. Marketing e Imagen se divide en Diseño y Redes sociales, tal como aparece en la lista. Se conserva el ancla histórica `finanzas-y-legal` para no romper enlaces, pero el nombre vigente mostrado es Finanzas.

Se contrastaron 49 fotografías por sus nombres de archivo en la carpeta de Drive proporcionada. Las versiones WebP conservan el contenido original, corrigen la orientación cuando es necesario y eliminan los metadatos EXIF/XMP. No se generaron ni retocaron rostros. Manuel Fidel Serna queda con iniciales hasta que la organización identifique su fotografía; no se le asigna el archivo sin nombre por descarte.

Los retratos anteriores se retiraron del directorio y del mural, pero los archivos originales y las fotografías históricas de eventos no se borraron.

## Mantenimiento

Actualizar primero el JSON con una lista confirmada. `node scripts/render-members.cjs` genera un parche para `team.html` e `index.html`; no escribe archivos automáticamente. Aplicar y revisar ese parche. Conservar las animaciones existentes y comprobar también el contador heredado de `js/stats.js` si se utiliza de nuevo.

Verificación: `node --test --test-reporter=spec tests/*.test.cjs`.
