# Flow App

Canvas interactivo de nodos circulares construido con React Flow, Next.js y Zustand. Los nodos se crean con clic derecho, se editan con doble clic, y todo el estado se persiste en localStorage.

## Stack tecnologico

| Tecnologia | Uso |
|---|---|
| Next.js 16 (App Router) | Framework, routing, SSR |
| TypeScript | Tipado estatico |
| React Flow (`@xyflow/react`) | Canvas de nodos, edges, controles |
| Zustand + `persist` middleware | Estado global con persistencia en localStorage |

## Estructura de archivos

```
flow-app/
├── app/
│   ├── components/
│   │   ├── CircleNode.tsx      # Nodo circular custom con edicion inline y emojis
│   │   ├── EmojiPicker.tsx     # Picker de emojis nativos + emojis custom (.svg)
│   │   ├── FlowCanvas.tsx      # Canvas principal, maneja eventos del pane
│   │   └── ThemeToggle.tsx     # Boton dark/light mode
│   ├── store.ts                # Zustand store (nodos, edges, emojis, theme)
│   ├── globals.css             # Variables CSS de tema, estilos de nodos y picker
│   ├── layout.tsx              # Layout raiz de Next.js
│   └── page.tsx                # Pagina principal, renderiza FlowCanvas
├── public/
├── package.json
└── tsconfig.json
```

## Decisiones de diseno

### Nodos circulares en vez de rectangulares
Se opto por nodos circulares (100x100px, `border-radius: 50%`) para una estetica mas limpia. Cada nodo tiene handles arriba (target) y abajo (source).

### Clic derecho para crear nodos
Inicialmente se uso doble clic, pero no funcionaba bien por conflictos con los eventos de React Flow. Se cambio a clic derecho (`onPaneContextMenu`) que es mas intuitivo y evita conflictos — el menu contextual del navegador se previene.

### Clic en edge para eliminarlo
En lugar de seleccionar + tecla Delete, un solo clic en la conexion la elimina directamente (`onEdgeClick` + `deleteEdge` en el store).

### Edges tipo bezier con animacion
Se usan edges `default` (bezier) con `animated: true` para dar un efecto de flujo con forma curva en lugar de lineas rectas o angulares.

### Edicion inline con soporte de emojis
Doble clic en un nodo abre un `<textarea>` dentro del circulo. Un boton abre el emoji picker debajo del nodo. El cierre del editor se maneja con un listener `mousedown` en `document` para evitar que el blur del textarea cierre el picker prematuramente.

### Emojis personalizados via SVG
El usuario puede subir archivos `.svg` que se almacenan como data URLs en el store. Se insertan en el texto como `:nombre-archivo:` y se renderizan como `<img>` inline al mostrar el label.

### Dark mode por defecto
El tema oscuro es el default (`darkMode: true`). Todos los colores usan CSS custom properties (`--bg-canvas`, `--bg-node`, `--text-node`, etc.) que cambian con `[data-theme="dark"]`. La preferencia se persiste en localStorage.

### Persistencia con versionado
El store usa `zustand/persist` con `version` y `migrate` para limpiar datos obsoletos cuando cambia la estructura del estado.

## Lo que falta por hacer

- [ ] Menu contextual visual al hacer clic derecho (opciones: crear nodo, pegar, etc.) en vez de crear nodo directamente
- [ ] Eliminar nodos con clic derecho o tecla Delete
- [ ] Tipos de nodo adicionales (rectangulares, diamantes, etc.)
- [ ] Colores personalizables por nodo
- [ ] Etiquetas en las conexiones (edges)
- [ ] Undo/redo (historial de cambios)
- [ ] Export/import del canvas (JSON)
- [ ] Drag & drop para reorganizar nodos con snap-to-grid
- [ ] Agrupacion de nodos (grupos/frames)
- [ ] Busqueda de nodos por texto
- [ ] Responsive: adaptar controles para pantallas pequenas
- [ ] Tests unitarios y e2e
