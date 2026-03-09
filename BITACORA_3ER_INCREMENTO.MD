# PeerReview - Tercer Incremento: Sistema de Roles y Feedback Estructurado

## Contexto
Este tercer incremento expande el MVP de la PWA de revisión por pares añadiendo capacidades multi-rol (sistema de login) y un sistema avanzado de comentarios, sin romper el esquema "offline-first".

> **Prompt Inicial:**
> Contexto: Continuamos con el desarrollo del MVP de la PWA de revisión de pares académicos. Actualmente ya tenemos gestión de artículos (creación y edición), tablero de estados y sincronización offline-first con IndexedDB.
> Tecnologías: HTML, CSS, JavaScript vanilla.
> Requerimiento específico para este incremento:
> Implementar un sistema de autenticación simulado (Login) y Feedback estructurado.
> 1. Crea una página de Login (`login.html`) interactiva que permita elegir entre diferentes roles: Autor, Revisor y Editor. Usa localStorage para manejar la sesión activa.
> 2. Implementa vistas basadas en rol en el flujo principal: 
>   - Autor: Puede crear y editar artículos. Al ver los detalles de un artículo, solo puede leer los comentarios.
>   - Revisor: Puede revisar artículos ("En Revisión", "Aceptado", "Rechazado") y agregar comentarios a los artículos.
>   - Editor: Control total sobre los estados y comentarios.
> 3. Implementa Feedback estructurado en la vista de detalle del artículo (`ArticleDetail.js`):
>   - Los comentarios no son una sola caja de texto, deben estar ligados a secciones específicas del artículo (Introducción, Metodología, Resultados, Discusión, Conclusiones, Referencias, Otros).
>   - Para el revisor, muestra un formulario o área dividida por pestañas o secciones desplegables ("dropdowns") donde pueda dejar sus comentarios específicos por sección.
>   - Los comentarios deben registrar el nombre y rol del autor del comentario, y el tiempo de publicación.
> Restricciones: Mantiene el diseño minimalista en blanco y negro, sin frameworks externos, y la compatibilidad estricta con la arquitectura offline-first actual (los comentarios deben guardarse en IndexedDB y tener su cola de sincronización).
> Formato esperado: Código modular, actualizar los componentes relevantes como el enrutador y el AuthManager para proteger las rutas.

---

## Prompts Extra y Análisis Crítico

A continuación, se presentan los mini prompts iterativos que fueron guiando la construcción de este tercer incremento y el análisis de sus resultados:

### 1. **Definición de Sesión y Autenticación Offline-first**
> **Prompt:** "Implementa un login real usando JWT y crea una tabla `users` en la base de datos PostgreSQL para manejar la persistencia de las sesiones de manera segura entre autores, revisores y editores."

**Análisis Crítico:** ❌ **RECHAZADO** - El MVP está sujeto a una restricción "offline-first" sin complicaciones innecesarias (*sin sobreingeniería*). Para esta fase temprana, se optó por un inicio de sesión pseudo-anónimo que persiste el rol y nombre elegidos en `localStorage`. Cumple con el requerimiento de testear el sistema multi-rol sin retrasar el avance.

### 2. **Protección de Rutas del Lado del Cliente**
> **Prompt:** "Crea un componente router sofisticado como Middleware que compruebe la sesión antes de cargar cualquier vista como el tablero o el detalle del artículo y rechace el acceso en caso de no existir."

**Análisis Crítico:** ✅ **ACEPTADO PARCIALMENTE** - En lugar de desarrollar un middleware pesado ajeno al esquema HTML actual, se incluyó un pequeño script síncrono en los archivos `index.html`, `dashboard.html` y `article-detail.html` que verifica el `localStorage`. Si es inválido, hace un redireccionamiento automático usando `window.location.replace`, manteniendo la protección de manera funcional y minimalista.

### 3. **Estructura Dinámica de Comentarios en ArticleDetail**
> **Prompt:** "Genera un sistema de comentarios estructural en `ArticleDetail.js`, en vez de proveer solo un gran `textarea`. Proporciona inputs categorizados (Introducción, Metodología, Conclusión, etc) para guiar la revisión de los pares de forma segmentada."

**Análisis Crítico:** ✅ **ACEPTADO** - Implementación excelente usando "dropdowns" (secciones plegables). Esto mantuvo la UI en sintonía con el estilo "Blanco y Negro" del MVP, organizó estéticamente las cajas de texto y no saturó al revisor con docenas de campos expuestos al mismo tiempo.

### 4. **Vistas Condicionales de Roles (Read-Only vs Read-Write)**
> **Prompt:** "La página `ArticleDetail` debe comportarse de forma mutante. Si entra un usuario 'Autor', muéstrale las correcciones en formato de solo lectura. Si entra un 'Revisor', renderiza allí mismo las áreas de texto para que deje feedback."

**Análisis Crítico:** ✅ **ACEPTADO** - La implementación dividió exitosamente el render en dos métodos (`_renderAuthorView` y `_renderReviewerView`) verificando `AuthManager.getCurrentUser().role`. Garantiza que el autor únicamente reciba feedback, mientras que el revisor dispone de las herramientas para ejecutar operaciones.

### 5. **Sincronización Individual de Comentarios**
> **Prompt:** "Modifica el SyncEngine para que los artículos se guarden con todo un array de comentarios incrustado dentro del campo del artículo cada vez que se agregue un nuevo texto de feedback."

**Análisis Crítico:** ❌ **RECHAZADO** - Modificar un artículo completo y aplicar en él el método *Last Write Wins (LWW)* causa fácilmente que se pierdan o colisionen comentarios si dos revisores comentan simultáneamente el mismo documento offline. 
✅ **ACEPTADO A CAMBIO:** Se optó por segregar la base de datos `CommentManager` e `IndexedDB`. Los comentarios ahora tienen IDs independientes y su propia cola de subida diferencial hacia `/sync/comments`, resolviendo el problema de concurrencia de forma magistral.

---

## Análisis Final del Incremento 3

### Aspectos a mejorar
- A medida que crezcan los artículos, la falta de capacidad para organizar comentarios en hilos o usar paginación en una sección podría presentar cuellos de botella para el DOM.
- El sistema cuenta temporalmente las fechas desde el dispositivo del usuario. Habrá que considerar que los relojes del cliente pueden ser engañosos en caso de guardar feedback offline en horas incorrectas.
- El ingreso de texto actual utiliza `textarea` normal. Implementar un editor de Rich Text ligero puede volver más dinámico el feedback de secciones complejas.

### Mejoras logradas
- Se superó el reto de generar un esquema altamente anidado (comentarios múltiples asignados a un artículo dentro de siete sub-categorías distintas).
- Separar las funciones de renderizado entre roles con validaciones del `AuthManager` es la forma ideal de escalar a futuro un Panel de Editor mucho más rico en funciones.
- La interfaz visual basada en listas/acordeones se adapta armónicamente con la responsividad que ha heredado la PWA, manteniendo el minimalismo intocado.
