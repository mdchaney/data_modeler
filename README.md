# Navicat Data Model Viewer

A web-based viewer for Navicat Data Modeler (.nmodel) files that renders database schemas as interactive SVG diagrams.

## Features

- **File Loading**: Load .nmodel JSON files directly in the browser
- **Interactive Diagram**: 
  - Drag and drop tables to rearrange layout
  - Click tables to view detailed field information
  - Zoom in/out for better navigation
- **Export Options**: Save diagrams as SVG or PNG images
- **Table Details**: View complete field information including types and nullable status
- **Relationship Visualization**: Shows foreign key relationships between tables

## Usage

1. Open `nmodel_viewer.html` in a web browser
2. Click "Choose File" and select a `.nmodel` file
3. Click "Load Model" to render the diagram
4. Interact with the diagram:
   - Click and drag tables to reposition them
   - Click on a table to see detailed field information
   - Use zoom controls (+/-) or reset zoom
   - Export the diagram as SVG or PNG

## Technical Details

The viewer parses the JSON structure of Navicat .nmodel files, which contain:
- Table definitions with fields and their properties
- Diagram layout information with positions and dimensions
- Relationship definitions between tables

The rendering is done entirely in the browser using SVG and vanilla JavaScript, with no external dependencies required.

## Browser Compatibility

Works in modern browsers that support:
- SVG
- ES6 JavaScript features
- File API
- Canvas API (for PNG export)