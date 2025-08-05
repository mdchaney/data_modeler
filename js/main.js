// Global namespace for the application
const NModelViewer = {
    // State variables
    state: {
        modelData: null,
        currentZoom: 1,
        draggedElement: null,
        dragOffset: { x: 0, y: 0 },
        resizingElement: null,
        resizeHandle: null,
        resizeStartPos: { x: 0, y: 0 },
        resizeStartSize: { width: 0, height: 0 },
        diagramInfo: {
            paperSize: { Width: 850, Height: 1100 },  // Letter size in pixels at 100 DPI
            pagesSize: { Width: 4, Height: 3 }        // Default 4x3 pages
        },
        tablesMap: {}, // Map of table UUID to table schema
        displayObjectsMap: {}, // Map of display UUID to display info
        layoutInfo: {}, // Map of UUID to layout position info
        relationshipsMap: {}, // Map of relationship UUID to relationship data
        tableRelationships: {}, // Map of table UUID to connected relationship UUIDs
        
        // Foreign key creation mode variables
        fkCreationMode: false,
        fkSourceField: null,
        fkTargetField: null,
        fkDragLine: null,
        
        // Config
        models: []
    },
    
    // Configuration constants
    config: {
        tableHeaderHeight: 35,
        fieldHeight: 16,
        characterWidth: 6,
        tablePadding: 10,
        minTableWidth: 150,
        resizeHandleSize: 8
    },
    
    // Initialize the application
    init: function() {
        console.log('Initializing NModel Viewer...');
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Initialize SVG
        this.initializeSVG();
        
        // Set up modal handlers
        if (this.modals && this.modals.init) {
            this.modals.init();
        }
        
        console.log('NModel Viewer initialized');
    },
    
    // Set up global event handlers
    setupEventHandlers: function() {
        // Window click handler for modals
        window.onclick = function(event) {
            const tableModal = document.getElementById('addTableModal');
            const fkModal = document.getElementById('addForeignKeyModal');
            
            if (event.target === tableModal) {
                if (NModelViewer.modals && NModelViewer.modals.closeAddTableDialog) {
                    NModelViewer.modals.closeAddTableDialog();
                }
            } else if (event.target === fkModal) {
                if (NModelViewer.foreignKeys && NModelViewer.foreignKeys.closeForeignKeyDialog) {
                    NModelViewer.foreignKeys.closeForeignKeyDialog();
                }
            }
        }
    },
    
    // Initialize SVG
    initializeSVG: function() {
        // Set up initial SVG dimensions
        if (this.rendering && this.rendering.setupSVGDimensions) {
            this.rendering.setupSVGDimensions();
        }
    },
    
    // Debug mode functions
    debugMode: false,
    
    toggleDebug: function() {
        this.debugMode = !this.debugMode;
        const debugInfo = document.querySelector('.debug-info');
        const debugButton = document.getElementById('show-debug');
        
        if (this.debugMode) {
            debugInfo.style.display = 'block';
            debugButton.textContent = 'Hide Debug Info';
            if (this.rendering && this.rendering.renderModels) {
                this.rendering.renderModels();
            }
        } else {
            debugInfo.style.display = 'none';
            debugButton.textContent = 'Show Debug Info';
            if (this.rendering && this.rendering.renderModels) {
                this.rendering.renderModels();
            }
        }
    },
    
    // Zoom functions
    zoom: function(factor) {
        this.state.currentZoom *= factor;
        const zoomGroup = document.getElementById('zoom-group');
        if (zoomGroup) {
            zoomGroup.setAttribute('transform', `scale(${this.state.currentZoom})`);
        }
        document.getElementById('zoom-level').textContent = Math.round(this.state.currentZoom * 100) + '%';
    },
    
    resetZoom: function() {
        this.state.currentZoom = 1;
        const zoomGroup = document.getElementById('zoom-group');
        if (zoomGroup) {
            zoomGroup.setAttribute('transform', 'scale(1)');
        }
        document.getElementById('zoom-level').textContent = '100%';
    },
    
    // Update canvas size based on page dimensions
    updateCanvasSize: function() {
        const widthInput = document.getElementById('pages-width');
        const heightInput = document.getElementById('pages-height');
        
        const pagesWidth = parseInt(widthInput.value) || 4;
        const pagesHeight = parseInt(heightInput.value) || 3;
        
        // Update state
        this.state.diagramInfo.pagesSize = {
            Width: pagesWidth,
            Height: pagesHeight
        };
        
        // Update SVG dimensions
        if (this.rendering && this.rendering.setupSVGDimensions) {
            this.rendering.setupSVGDimensions();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    NModelViewer.init();
});

// Make available globally
window.NModelViewer = NModelViewer;
window.debugMode = false; // Backward compatibility
window.toggleDebug = function() { NModelViewer.toggleDebug(); };
window.zoom = function(factor) { NModelViewer.zoom(factor); };
window.resetZoom = function() { NModelViewer.resetZoom(); };
window.updateCanvasSize = function() { NModelViewer.updateCanvasSize(); };