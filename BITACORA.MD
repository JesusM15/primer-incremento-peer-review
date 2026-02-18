PROMPT 1.

Contexto: Estoy construyendo un MVP de una PWA para revisión de pares académicos, este debe cumplir con todas las características, las 3 features iniciales serán las siguientes: Gestión de artículos, Tablero de estados donde se pueda revisar el estado de los artículos, Feedback estructurado, es decir, comentarios dentro de artículos que puedan ser realizados ejemplo en forma: [referencias] las referencias no han sido efectivas.
Tecnologías: HTML, CSS, JavaScript vanilla
Requerimiento específico: 
Genera HTML, CSS y JavaScript un formulario para cargar y editar artículos académicos en formato de archivos con lo siguiente:
Input de texto para colocar un titulo al articulo academico
Botón que abra el selector de archivos y permita cargar un archivo pdf, docs. 
Botón para crear o editar el artículo.
Al hacer click, se captura en un objeto Article debe contener la fecha de creación, id único, y aparte una propiedad de estado que sea por defecto “Recibido”
En modo edición, el formulario muestra el título previamente guardado.
Prevenir recarga de página
Estilos básicos: caja de formulario que contenga los inputs, de título, de cargar archivo, y un botón para editar o subir de acuerdo el modo.
El modo se accede mediante url pasando el id del artículo a editar, si hay una id de parámetro entonces estás en edición de lo contrario es creación.
IndexedDB como persistencia local.
Utilizar componentes como ArticleManager para el manejo de funciones relacionadas a artículos.
Restricciones: No debe tener sobre ingeniería como bases de datos avanzadas, no debe ir más allá de esta primer feature, no frameworks ni librerias.
Formato esperado: Separado por carpetas, ordenado, claro y modular.

PROMPT 2.

Aplica los siguientes cambios:

- No coloques tableros de archivos, solo necesito la funcionalidad que te pedi, que es carga y edicion, no hagas un dashboard por ahora.
- los estilos hazlo mas minimalista blanco y negro, para mostrar exito representa con colores verdes, rojos para errores o validaciones.
