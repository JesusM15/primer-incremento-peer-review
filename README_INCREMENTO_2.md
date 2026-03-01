# PeerReview - Tablero de Estados y Sincronización Offline-First

## Contexto
Continuación del MVP de la PWA para revisión de pares académicos. Este segundo incremento implementa el tablero de estados de artículos y la capacidad de funcionamiento offline con sincronización bidireccional.

> **Prompt Original:**  
> Contexto: Estoy construyendo un MVP de una PWA para revisión de pares académicos, este debe cumplir con todas las características, las 3 features iniciales serán las siguientes: Gestión de artículos, Tablero de estados donde se pueda revisar el estado de los artículos, Feedback estructurado, es decir, comentarios dentro de artículos que puedan ser realizados ejemplo en  forma: [referencias] las referencias no han sido efectivas.  
> Tecnologías: HTML, CSS, JavaScript vanilla  
> Requerimiento específico para este incremento:  
> Genera un tablero de estados para artículos académicos con lo siguiente:  
> Vista principal que muestre todos los artículos con sus estados actuales  
> Filtros por estado: Recibido, En Revisión, Aprobado, Rechazado  
> Visualización clara del estado de cada artículo con colores o iconos  
> Acciones rápidas (editar, eliminar) desde el tablero  
> Contador de artículos por estado  
> Implementación offline-first completa:  
> Funcionamiento sin conexión a internet  
> Almacenamiento local con IndexedDB  
> Sincronización automática cuando se recupere la conexión  
> Cola de operaciones pendientes  
> Estrategia de resolución de conflictos "last write wins"  
> Indicador visual de estado de conexión (Online/Offline)  
> Características PWA completas:  
> Service Worker para cacheo de recursos  
> Manifest.json para instalación nativa  
> Iconos SVG vectoriales  
> Funcionamiento offline completo  
> Instalable como aplicación nativa  
> Restricciones: Sin frameworks ni librerías, sin sobreingeniería, arquitectura modular y clara.  
> Formato esperado: Separado por carpetas, ordenado, claro y modular.

---

## Prompts Extra y Análisis Crítico

### 1. **Definición de Arquitectura Offline-First**
> **Prompt:** "Define la arquitectura para una PWA de revisión por pares con un enfoque Offline-First. Utilizaremos Node.js con Express y PostgreSQL para el backend, ya que requiero tecnologías transparentes que pueda controlar totalmente."

**Análisis Crítico:** ❌ **RECHAZADO** - La IA propuso Docker y orquestación compleja. Se eliminó por sobre-ingeniería, manteniendo servidor Express nativo.

### 2. **Migración a Offline-First con Notificaciones**
> **Prompt:** "Migra el primer incremento (subida y edición de artículos) a la arquitectura Offline-First. Asegúrate de incluir notificaciones de éxito y error."

**Análisis Crítico:** ✅ **ACEPTADO** - Implementación limpia de IndexedDB + Toasts. Integración coherente con backend.

### 3. **Indicador Visual de Conexión**
> **Prompt:** "Implementa un componente para detectar el estado de la red (Online/Offline) de forma visual en la interfaz."

**Análisis Crítico:** ✅ **ACEPTADO** - Solución minimalista con APIs nativas. Sin sobre-ingeniería, integración natural.

### 4. **Tablero de Estados con Sincronización**
> **Prompt:** "Desarrolla el segundo incremento: el tablero de estados de artículos. Debe mostrar el flujo de los documentos y permitir la sincronización bidireccional."

**Análisis Crítico:** ✅ **ACEPTADO PARCIALMENTE** - Filtros y contadores conservados (valor agregado). Roles y rutas complejas eliminadas por prematuras.

### 5. **Estrategia de Sincronización LWW**
> **Prompt:** "Implementa la lógica de sincronización definitiva utilizando una estrategia de 'Last Write Wins' (LWW) basada en timestamps, tal como lo definí en el diseño."

**Análisis Crítico:** ✅ **ACEPTADO** - Implementación precisa de LWW. Sincronización bidireccional estable sin inconsistencias.

---

## Requerimientos Específicos

### Tablero de Estados
- Vista principal que muestra todos los artículos con sus estados actuales
- Filtros por estado: Recibido, En Revisión, Aprobado, Rechazado
- Visualización clara del estado de cada artículo
- Acciones rápidas (editar, eliminar) desde el tablero
- Contador de artículos por estado

### Sincronización Offline-First
- Funcionamiento completo sin conexión a internet
- Almacenamiento local con IndexedDB
- Sincronización automática cuando se recupera la conexión
- Cola de operaciones pendientes
- Estrategia de resolución de conflictos "last write wins"
- Indicador visual de estado de conexión

### PWA Completa
- Service Worker para cacheo de recursos
- Manifest.json para instalación nativa
- Iconos SVG vectoriales
- Funcionamiento offline completo
- Instalable como aplicación nativa

## Tecnologías
- HTML5, CSS3, JavaScript vanilla
- IndexedDB para persistencia local
- Service Worker para PWA
- Node.js + Express + PostgreSQL para backend
- Sin frameworks ni librerías externas

## Arquitectura

### Componentes Principales
- `ArticleList.js` - Gestión y renderizado del tablero
- `ArticleManager.js` - Lógica de negocio de artículos
- `SyncEngine.js` - Motor de sincronización offline-first
- `ConnectionStatus.js` - Indicador de estado de conexión
- `Toast.js` - Sistema de notificaciones

### Base de Datos
- **Local:** IndexedDB (`PeerReviewDB` para artículos, `PeerReviewSyncDB` para cola)
- **Servidor:** PostgreSQL con tablas `articles` y `sync_queue`

### Estructura de Carpetas
```
peerreview/
├── components/          # Componentes UI y lógica
├── db/                 # Gestión de IndexedDB
├── pages/              # Vistas específicas
├── styles/             # Estilos CSS
├── backend/            # Servidor Node.js
├── icons/              # Iconos SVG
├── manifest.json       # Configuración PWA
└── sw.js              # Service Worker
```

## Funcionalidades Implementadas

### 1. Tablero de Estados
- ✅ Vista principal con todos los artículos
- ✅ Filtros por estado con contadores
- ✅ Acciones de edición y eliminación
- ✅ Actualización automática del tablero
- ✅ Navegación por hash routing

### 2. Sincronización Offline-First
- ✅ Operaciones CRUD funcionan completamente offline
- ✅ Cola de operaciones pendientes en IndexedDB
- ✅ Sincronización automática al recuperar conexión
- ✅ Descarga de cambios del servidor
- ✅ Resolución de conflictos por timestamp
- ✅ Indicador visual de conexión (Online/Offline)

### 3. PWA Completa
- ✅ Service Worker para cacheo de recursos estáticos
- ✅ Manifest.json con iconos SVG
- ✅ Instalable como aplicación nativa
- ✅ Funcionamiento completo offline
- ✅ Notificaciones toast para feedback

### 4. Backend de Sincronización
- ✅ API REST para CRUD de artículos
- ✅ Endpoint de sincronización bidireccional
- ✅ PostgreSQL para persistencia
- ✅ Manejo de timestamps para conflictos

## Flujo de Sincronización

1. **Operación Local:** Usuario crea/edita/elimina artículo
2. **Guardado Local:** Se guarda en IndexedDB inmediatamente
3. **Cola de Sync:** Se agrega operación a `sync_queue` local
4. **Detección Online:** ConnectionStatus detecta conexión
5. **Sincronización:** SyncEngine procesa cola pendiente
6. **Actualización:** Server responde y se actualiza IndexedDB

## Estrategia de Resolución de Conflictos
- **Last Write Wins:** El timestamp más reciente gana
- **Tolerancia:** 1 segundo para evitar conflictos de sincronización
- **Bidireccional:** Cambios locales y del servidor se sincronizan

## Características PWA
- **Instalable:** Botón de instalación en navegadores compatibles
- **Offline:** Funcionamiento completo sin conexión
- **Responsive:** Adaptación a diferentes tamaños de pantalla
- **Cache:** Recursos estáticos cacheados por Service Worker

## Pruebas y Verificación
- ✅ Crear artículos offline
- ✅ Editar artículos offline  
- ✅ Eliminar artículos offline
- ✅ Sincronización automática al conectar
- ✅ Instalación como PWA
- ✅ Funcionamiento offline completo
- ✅ Indicador de conexión funcional

## Restricciones Cumplidas
- Sin sobreingeniería
- Sin frameworks externos
- Arquitectura modular y clara
- Funcionalidades específicas del MVP
- Código organizado y mantenible

## Próximos Incrementos
- Sistema de feedback estructurado con comentarios en artículos
- Sistema de usuarios y roles
- Flujo completo de revisión por pares
- Dashboard avanzado con métricas

---

## Resultado Obtenido

El resultado generado incluye:
- Tablero de estados funcional con filtros
- Sistema completo de sincronización offline-first
- PWA instalable con funcionamiento offline
- Backend robusto para sincronización
- Indicador visual de conexión
- Sistema de notificaciones toast
- Arquitectura modular y escalable
