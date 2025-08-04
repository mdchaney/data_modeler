# Data Model Viewer

A standalone browser-based viewer for Navicat Data Modeler files (.nmodel) that renders database schemas as interactive SVG diagrams.

## Features

- **File Loading**: Load .nmodel JSON files directly in the browser
- **Interactive Diagram**: 
  - Drag and drop tables to rearrange layout
  - Resize tables by dragging corner/edge handles
  - Click tables to view detailed field information
  - Zoom in/out for better navigation
- **Table Creation**: Add new tables with custom field definitions
- **Foreign Key Creation**: Create relationships between tables via drag-and-drop
- **Export Options**: Save diagrams as SVG or PNG images
- **Table Details**: View complete field information including types and nullable status
- **Relationship Visualization**: Shows foreign key relationships with elbow connectors

## Usage

1. Open `index.html` in a web browser
2. Click "Choose File" and select a `.nmodel` file
3. Click "Load Model" to render the diagram
4. Interact with the diagram:
   - Click and drag tables to reposition them
   - Drag resize handles to resize tables
   - Click on a table to see detailed field information
   - Use zoom controls (+/-) or reset zoom
   - Click "Add Table" to create new tables
   - Click "Add Foreign Key" then drag between fields to create relationships
   - Export the diagram as SVG or PNG

## File Structure

```
data_modeler/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── main.js            # Main application initialization
│   ├── utils.js           # Utility functions
│   ├── data-model.js      # Model loading and parsing
│   ├── render-tables.js   # Table rendering
│   ├── render-relationships.js  # Relationship rendering
│   ├── interactions.js    # Drag and resize handlers
│   ├── foreign-keys.js    # Foreign key creation
│   ├── modals.js          # Modal dialogs
│   └── export.js          # Export functionality
└── README.md
```

## Technical Details

The viewer parses the JSON structure of .nmodel files, which contain:
- Table definitions with fields and their properties
- Diagram layout information with positions and dimensions
- Relationship definitions between tables

The rendering is done entirely in the browser using SVG and vanilla JavaScript, with no external dependencies required. The code is organized into modules under the global `NModelViewer` namespace for better maintainability while still allowing the application to work without any build tools.

## Browser Compatibility

Works in modern browsers that support:
- SVG
- ES6 JavaScript features
- File API
- Canvas API (for PNG export)

## Development

This is a standalone application with no build process required. Simply edit the files and refresh the browser to see changes.