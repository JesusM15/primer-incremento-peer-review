# Bitácora de Prompts  
Proyecto: MVP PWA – Revisión de Pares Académicos  
Tecnologías: HTML, CSS, JavaScript Vanilla  
Persistencia: IndexedDB  
Alcance actual: Gestión básica de artículos (crear y editar)

---

## Contexto General del MVP

El objetivo es construir una PWA minimalista para revisión académica por pares.

En esta primera fase solo se implementa:

- Gestión de artículos (crear y editar)
- Persistencia local con IndexedDB
- Detección de modo edición mediante parámetro en URL
- Estructura modular con `ArticleManager`
- Sin frameworks ni sobre ingeniería

No se implementa aún:

- Tablero de estados
- Feedback estructurado
- Dashboard
- Funcionalidades adicionales fuera del alcance inicial

---

# PROMPT 1

## Prompt utilizado

> Contexto: Estoy construyendo un MVP de una PWA para revisión de pares académicos, este debe cumplir con todas las características, las 3 features iniciales serán las siguientes: Gestión de artículos, Tablero de estados donde se pueda revisar el estado de los artículos, Feedback estructurado, es decir, comentarios dentro de artículos que puedan ser realizados ejemplo en forma: [referencias] las referencias no han sido efectivas.  
> Tecnologías: HTML, CSS, JavaScript vanilla  
> Requerimiento específico:  
> Genera HTML, CSS y JavaScript un formulario para cargar y editar artículos académicos en formato de archivos con lo siguiente:  
> Input de texto para colocar un titulo al articulo academico  
> Botón que abra el selector de archivos y permita cargar un archivo pdf, docs.  
> Botón para crear o editar el artículo.  
> Al hacer click, se captura en un objeto Article debe contener la fecha de creación, id único, y aparte una propiedad de estado que sea por defecto “Recibido”  
> En modo edición, el formulario muestra el título previamente guardado.  
> Prevenir recarga de página  
> Estilos básicos: caja de formulario que contenga los inputs, de título, de cargar archivo, y un botón para editar o subir de acuerdo el modo.  
> El modo se accede mediante url pasando el id del artículo a editar, si hay una id de parámetro entonces estás en edición de lo contrario es creación.  
> IndexedDB como persistencia local.  
> Utilizar componentes como ArticleManager para el manejo de funciones relacionadas a artículos.  
> Restricciones: No debe tener sobre ingeniería como bases de datos avanzadas, no debe ir más allá de esta primer feature, no frameworks ni librerias.  
> Formato esperado: Separado por carpetas, ordenado, claro y modular.

---

## Resultado obtenido

El resultado generado incluyó:

- Estructura modular por carpetas
- Implementación básica de IndexedDB
- Clase `ArticleManager`
- Manejo de creación y edición
- Prevención de recarga
- Captura de:
  - `id` único
  - `fechaCreacion`
  - `estado` por defecto `"Recibido"`
- Detección de modo edición vía parámetro URL

Sin embargo:

- Incluía referencias a futuras features.
- Algunos estilos eran muy rebuscados o fuera de tono con la aplicación.
- No estaba totalmente restringido únicamente a creación y edición.

---

## Análisis Crítico

### Aspectos a mejorar

- El prompt mencionaba futuras features, lo que abrió la puerta a expansión innecesaria.
- La estética no fue especificada en cuestion de publico dirido dando como resultado estilos no acordes al contexto.
- Faltaba mayor claridad en la delimitación del alcance funcional.

### Aspectos positivos

- Buena estructura modular.
- Uso correcto de IndexedDB sin complejidad innecesaria.
- Separación clara de responsabilidades.
- Manejo correcto del estado por defecto.
- Cumplimiento de la restricción de no usar frameworks.

---

## Aprendizajes

1. Mencionar funcionalidades futuras puede inducir implementación anticipada.
2. Las restricciones deben ser claras y repetidas si el alcance es crítico.
3. La definición de estilo visual debe ser explícita.
4. Modularidad no implica sobre ingeniería; debe mantenerse el equilibrio.

---

# PROMPT 2

## Prompt utilizado

> Aplica los siguientes cambios:  
> - No coloques tableros de archivos, solo necesito la funcionalidad que te pedí, que es carga y edición, no hagas un dashboard por ahora.  
> - Los estilos hazlos más minimalistas blanco y negro, para mostrar éxito representa con colores verdes, rojos para errores o validaciones.

---

## Resultado obtenido

El nuevo resultado:

- Eliminó cualquier referencia a tablero o dashboard.
- Se enfocó únicamente en creación y edición.
- Implementó diseño blanco y negro.
- Utilizó:
  - Verde para mensajes de éxito.
  - Rojo para errores o validaciones.
- Mantiene persistencia con IndexedDB.
- Respeta la arquitectura modular con `ArticleManager`.

---

## Análisis Crítico

### Aspectos a mejorar

- Se podría reforzar la validación de tipos de archivo.
- El manejo del archivo aún puede optimizarse si el tamaño es grande.

### Mejoras logradas

- Alcance correctamente delimitado.
- Interfaz coherente con el estilo minimalista solicitado.
- Mejor claridad en validaciones.
- Enfoque directo en la feature actual.

---

## Aprendizajes

1. Ajustar prompts de manera incremental mejora precisión del resultado.
2. Las restricciones explícitas reducen desviaciones.
3. Separar claramente fases del MVP ayuda a mantener foco.
4. El refinamiento iterativo produce resultados más alineados al objetivo.

---

# Conclusión General

El proceso iterativo permitió:

- Refinar alcance funcional.
- Mantener arquitectura limpia.
- Respetar principios de simplicidad.
- Evitar sobre ingeniería.
- Mejorar claridad visual.

El MVP actual cumple con:

- Crear artículo  
- Editar artículo  
- Persistencia local con IndexedDB  
- Estado inicial "Recibido"  
- Estructura modular  
- Diseño minimalista  