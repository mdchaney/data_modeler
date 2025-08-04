// Interaction handlers for NModel Viewer
NModelViewer.interactions = {
    // Start dragging a table
    startDrag: function(e) {
        if (e.target.tagName === 'text') return; // Don't drag when clicking text
        
        // Find the table group element
        let tableGroup = e.target;
        while (tableGroup && !tableGroup.classList.contains('table-node')) {
            tableGroup = tableGroup.parentElement;
        }
        if (!tableGroup) return;
        
        NModelViewer.state.draggedElement = tableGroup;
        const transform = tableGroup.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!match) return;
        
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        const svg = document.getElementById('diagram');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        NModelViewer.state.dragOffset.x = (svgP.x / NModelViewer.state.currentZoom) - x;
        NModelViewer.state.dragOffset.y = (svgP.y / NModelViewer.state.currentZoom) - y;
        
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
        e.preventDefault();
        e.stopPropagation();
    },
    
    // Handle drag movement
    drag: function(e) {
        const draggedElement = NModelViewer.state.draggedElement;
        if (!draggedElement) return;
        
        const svg = document.getElementById('diagram');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        const x = (svgP.x / NModelViewer.state.currentZoom) - NModelViewer.state.dragOffset.x;
        const y = (svgP.y / NModelViewer.state.currentZoom) - NModelViewer.state.dragOffset.y;
        
        draggedElement.setAttribute('transform', `translate(${x}, ${y})`);
        
        // Update connected relationships
        const tableUUID = draggedElement.getAttribute('data-uuid');
        this.updateConnectedRelationships(tableUUID, x, y);
    },
    
    // End dragging
    endDrag: function() {
        NModelViewer.state.draggedElement = null;
        document.removeEventListener('mousemove', this.drag.bind(this));
        document.removeEventListener('mouseup', this.endDrag.bind(this));
    },
    
    // Start resizing a table
    startResize: function(e, uuid) {
        e.stopPropagation();
        e.preventDefault();
        
        NModelViewer.state.resizingElement = e.currentTarget.parentElement;
        NModelViewer.state.resizeHandle = e.currentTarget.getAttribute('data-resize-type');
        
        const svg = document.getElementById('diagram');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        NModelViewer.state.resizeStartPos.x = svgP.x / NModelViewer.state.currentZoom;
        NModelViewer.state.resizeStartPos.y = svgP.y / NModelViewer.state.currentZoom;
        
        // Get current size and position from layout info
        const layout = NModelViewer.state.layoutInfo[uuid];
        if (layout && layout.rect) {
            NModelViewer.state.resizeStartSize.width = layout.rect.Width;
            NModelViewer.state.resizeStartSize.height = layout.rect.Height;
            NModelViewer.state.resizeStartSize.x = layout.rect.X;
            NModelViewer.state.resizeStartSize.y = layout.rect.Y;
        }
        
        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));
    },
    
    // Handle resize movement
    resize: function(e) {
        const resizingElement = NModelViewer.state.resizingElement;
        const resizeHandle = NModelViewer.state.resizeHandle;
        
        if (!resizingElement || !resizeHandle) return;
        
        const svg = document.getElementById('diagram');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        const currentX = svgP.x / NModelViewer.state.currentZoom;
        const currentY = svgP.y / NModelViewer.state.currentZoom;
        
        const dx = currentX - NModelViewer.state.resizeStartPos.x;
        const dy = currentY - NModelViewer.state.resizeStartPos.y;
        
        const uuid = resizingElement.getAttribute('data-uuid');
        const layout = NModelViewer.state.layoutInfo[uuid];
        if (!layout || !layout.rect) return;
        
        let newWidth = NModelViewer.state.resizeStartSize.width;
        let newHeight = NModelViewer.state.resizeStartSize.height;
        let newX = NModelViewer.state.resizeStartSize.x;
        let newY = NModelViewer.state.resizeStartSize.y;
        
        // Calculate new dimensions based on resize handle
        switch(resizeHandle) {
            case 'n':
                newY = NModelViewer.state.resizeStartSize.y + dy;
                newHeight = NModelViewer.state.resizeStartSize.height - dy;
                break;
            case 'ne':
                newY = NModelViewer.state.resizeStartSize.y + dy;
                newHeight = NModelViewer.state.resizeStartSize.height - dy;
                newWidth = NModelViewer.state.resizeStartSize.width + dx;
                break;
            case 'e':
                newWidth = NModelViewer.state.resizeStartSize.width + dx;
                break;
            case 'se':
                newWidth = NModelViewer.state.resizeStartSize.width + dx;
                newHeight = NModelViewer.state.resizeStartSize.height + dy;
                break;
            case 's':
                newHeight = NModelViewer.state.resizeStartSize.height + dy;
                break;
            case 'sw':
                newX = NModelViewer.state.resizeStartSize.x + dx;
                newWidth = NModelViewer.state.resizeStartSize.width - dx;
                newHeight = NModelViewer.state.resizeStartSize.height + dy;
                break;
            case 'w':
                newX = NModelViewer.state.resizeStartSize.x + dx;
                newWidth = NModelViewer.state.resizeStartSize.width - dx;
                break;
            case 'nw':
                newX = NModelViewer.state.resizeStartSize.x + dx;
                newY = NModelViewer.state.resizeStartSize.y + dy;
                newWidth = NModelViewer.state.resizeStartSize.width - dx;
                newHeight = NModelViewer.state.resizeStartSize.height - dy;
                break;
        }
        
        // Minimum size constraints
        newWidth = Math.max(100, newWidth);
        newHeight = Math.max(60, newHeight);
        
        // Update layout info temporarily
        layout.rect.Width = newWidth;
        layout.rect.Height = newHeight;
        layout.rect.X = newX;
        layout.rect.Y = newY;
        
        // Update visual elements only (don't re-render completely)
        const backgroundRect = resizingElement.querySelector('rect');
        if (backgroundRect) {
            backgroundRect.setAttribute('width', newWidth);
            backgroundRect.setAttribute('height', newHeight);
        }
        
        // Update header background
        const headerRect = resizingElement.querySelector('rect[fill="#3788d8"]');
        if (headerRect) {
            headerRect.setAttribute('width', newWidth);
        }
        
        // Update header fix rect
        const headerFix = resizingElement.querySelectorAll('rect')[2];
        if (headerFix) {
            headerFix.setAttribute('width', newWidth);
        }
        
        // Update header text position
        const headerText = resizingElement.querySelector('text.table-header');
        if (headerText) {
            headerText.setAttribute('x', newWidth / 2);
        }
        
        // Update position if needed
        if (newX !== NModelViewer.state.resizeStartSize.x || newY !== NModelViewer.state.resizeStartSize.y) {
            resizingElement.setAttribute('transform', `translate(${newX}, ${newY})`);
        }
        
        // Update clip path
        const clipRect = resizingElement.querySelector('clipPath rect');
        if (clipRect) {
            clipRect.setAttribute('width', newWidth - 16);
            clipRect.setAttribute('height', newHeight);
        }
        
        // Update resize handles
        const handles = resizingElement.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            const type = handle.getAttribute('data-resize-type');
            const handleSize = 8;
            switch(type) {
                case 'n':
                    handle.setAttribute('x', newWidth/2 - handleSize/2);
                    break;
                case 'ne':
                    handle.setAttribute('x', newWidth - handleSize/2);
                    break;
                case 'e':
                    handle.setAttribute('x', newWidth - handleSize/2);
                    handle.setAttribute('y', newHeight/2 - handleSize/2);
                    break;
                case 'se':
                    handle.setAttribute('x', newWidth - handleSize/2);
                    handle.setAttribute('y', newHeight - handleSize/2);
                    break;
                case 's':
                    handle.setAttribute('x', newWidth/2 - handleSize/2);
                    handle.setAttribute('y', newHeight - handleSize/2);
                    break;
                case 'sw':
                    handle.setAttribute('y', newHeight - handleSize/2);
                    break;
                case 'w':
                    handle.setAttribute('y', newHeight/2 - handleSize/2);
                    break;
            }
        });
    },
    
    // End resizing
    endResize: function() {
        const resizingElement = NModelViewer.state.resizingElement;
        if (resizingElement) {
            const uuid = resizingElement.getAttribute('data-uuid');
            const layout = NModelViewer.state.layoutInfo[uuid];
            const tableSchema = NModelViewer.state.tablesMap[NModelViewer.state.displayObjectsMap[uuid].refUUID];
            
            if (tableSchema && layout) {
                // Remove the old element
                resizingElement.remove();
                
                // Re-render with final dimensions
                NModelViewer.rendering.renderTable(uuid, tableSchema, layout.rect);
                
                // Update connected relationships
                this.updateConnectedRelationships(uuid);
            }
        }
        
        NModelViewer.state.resizingElement = null;
        NModelViewer.state.resizeHandle = null;
        document.removeEventListener('mousemove', this.resize.bind(this));
        document.removeEventListener('mouseup', this.endResize.bind(this));
    },
    
    // Update connected relationships when a table moves
    updateConnectedRelationships: function(tableUUID, x, y) {
        // Get all relationships connected to this table
        const connectedRelationships = NModelViewer.state.tableRelationships[tableUUID] || [];
        
        connectedRelationships.forEach(relUUID => {
            const relData = NModelViewer.state.relationshipsMap[relUUID];
            if (!relData) return;
            
            // Find the relationship SVG element
            const relGroup = document.querySelector(`g[data-uuid="${relUUID}"]`);
            if (!relGroup) return;
            
            // Get the path elements
            const path = relGroup.querySelector('path.relationship-line');
            const clickPath = relGroup.querySelector('path[stroke="transparent"]');
            if (!path) return;
            
            // Recalculate the path based on current table positions
            const newPath = this.recalculateRelationshipPath(relUUID, relData);
            if (newPath) {
                path.setAttribute('d', newPath);
                if (clickPath) {
                    clickPath.setAttribute('d', newPath);
                }
            }
        });
    },
    
    // Recalculate relationship path when tables move
    recalculateRelationshipPath: function(relUUID, relData) {
        if (!relData.data.vertices || relData.data.vertices.length < 2) return null;
        
        // Get the connected tables' information
        const connectInfos = relData.data.connectInfos || [];
        if (connectInfos.length < 2) return null;
        
        const table1UUID = connectInfos[0].RefUUID;
        const table2UUID = connectInfos[1].RefUUID;
        
        const table1Element = document.querySelector(`g[data-uuid="${table1UUID}"]`);
        const table2Element = document.querySelector(`g[data-uuid="${table2UUID}"]`);
        
        if (!table1Element || !table2Element) return null;
        
        // Extract current positions from transform
        const getPosition = (element) => {
            const transform = element.getAttribute('transform');
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (!match) return { x: 0, y: 0 };
            return {
                x: parseFloat(match[1]),
                y: parseFloat(match[2])
            };
        };
        
        const pos1 = getPosition(table1Element);
        const pos2 = getPosition(table2Element);
        
        // Get table dimensions from the layout info
        const layout1 = NModelViewer.state.layoutInfo[table1UUID];
        const layout2 = NModelViewer.state.layoutInfo[table2UUID];
        
        if (!layout1 || !layout2) return null;
        
        // Calculate table centers
        const center1 = {
            x: pos1.x + layout1.rect.Width / 2,
            y: pos1.y + layout1.rect.Height / 2
        };
        const center2 = {
            x: pos2.x + layout2.rect.Width / 2,
            y: pos2.y + layout2.rect.Height / 2
        };
        
        // Determine the best sides to connect based on relative positions
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        
        let index1, index2;
        
        // Choose connection sides based on which direction has the greater distance
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal relationship is dominant
            if (dx > 0) {
                // Table 1 is to the left of Table 2
                index1 = 2; // Right side of table 1
                index2 = 0; // Left side of table 2
            } else {
                // Table 1 is to the right of Table 2
                index1 = 0; // Left side of table 1
                index2 = 2; // Right side of table 2
            }
        } else {
            // Vertical relationship is dominant
            if (dy > 0) {
                // Table 1 is above Table 2
                index1 = 3; // Bottom of table 1
                index2 = 1; // Top of table 2
            } else {
                // Table 1 is below Table 2
                index1 = 1; // Top of table 1
                index2 = 3; // Bottom of table 2
            }
        }
        
        // Calculate connection points based on indices
        // Index meanings: 0=left, 1=top, 2=right, 3=bottom
        const getConnectionPoint = (pos, layout, index) => {
            const rect = layout.rect;
            const centerX = pos.x + rect.Width / 2;
            const centerY = pos.y + rect.Height / 2;
            
            switch(index) {
                case 0: // Left
                    return { x: pos.x, y: centerY };
                case 1: // Top
                    return { x: centerX, y: pos.y };
                case 2: // Right
                    return { x: pos.x + rect.Width, y: centerY };
                case 3: // Bottom
                    return { x: centerX, y: pos.y + rect.Height };
                default: // Center as fallback
                    return { x: centerX, y: centerY };
            }
        };
        
        const point1 = getConnectionPoint(pos1, layout1, index1);
        const point2 = getConnectionPoint(pos2, layout2, index2);
        
        // For elbow connectors, create a simple path between the connection points
        let d = '';
        
        if (relData.data.connectorCommon && relData.data.connectorCommon.Type === 'Elbow') {
            // Create elbow path based on the connection sides
            d = `M ${point1.x} ${point1.y}`;
            
            // Determine path based on which sides are connected
            if ((index1 === 0 || index1 === 2) && (index2 === 0 || index2 === 2)) {
                // Both connections are on left/right sides (horizontal)
                const midX = (point1.x + point2.x) / 2;
                d += ` L ${midX} ${point1.y}`;
                d += ` L ${midX} ${point2.y}`;
                d += ` L ${point2.x} ${point2.y}`;
            } else if ((index1 === 1 || index1 === 3) && (index2 === 1 || index2 === 3)) {
                // Both connections are on top/bottom sides (vertical)
                const midY = (point1.y + point2.y) / 2;
                d += ` L ${point1.x} ${midY}`;
                d += ` L ${point2.x} ${midY}`;
                d += ` L ${point2.x} ${point2.y}`;
            } else if (index1 === 0 || index1 === 2) {
                // First connection is horizontal, second is vertical
                const extendDist = 30; // Distance to extend before turning
                const extendX = index1 === 2 ? point1.x + extendDist : point1.x - extendDist;
                d += ` L ${extendX} ${point1.y}`;
                d += ` L ${extendX} ${point2.y}`;
                d += ` L ${point2.x} ${point2.y}`;
            } else {
                // First connection is vertical, second is horizontal
                const extendDist = 30; // Distance to extend before turning
                const extendY = index1 === 3 ? point1.y + extendDist : point1.y - extendDist;
                d += ` L ${point1.x} ${extendY}`;
                d += ` L ${point2.x} ${extendY}`;
                d += ` L ${point2.x} ${point2.y}`;
            }
        } else {
            // Simple straight line
            d = `M ${point1.x} ${point1.y} L ${point2.x} ${point2.y}`;
        }
        
        return d;
    }
};

// Make functions available globally for backward compatibility
window.startDrag = function(e) { NModelViewer.interactions.startDrag(e); };
window.drag = function(e) { NModelViewer.interactions.drag(e); };
window.endDrag = function() { NModelViewer.interactions.endDrag(); };
window.startResize = function(e, uuid) { NModelViewer.interactions.startResize(e, uuid); };
window.resize = function(e) { NModelViewer.interactions.resize(e); };
window.endResize = function() { NModelViewer.interactions.endResize(); };
window.updateConnectedRelationships = function(tableUUID, x, y) {
    NModelViewer.interactions.updateConnectedRelationships(tableUUID, x, y);
};
window.recalculateRelationshipPath = function(relUUID, relData) {
    return NModelViewer.interactions.recalculateRelationshipPath(relUUID, relData);
};