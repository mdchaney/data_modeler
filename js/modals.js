// Modal handling for NModel Viewer
NModelViewer.modals = {
    // Initialize modal handlers
    init: function() {
        // Modal initialization if needed
    },
    
    // Show add table dialog
    showAddTableDialog: function() {
        document.getElementById('addTableModal').style.display = 'block';
        document.getElementById('tableName').value = '';
        document.getElementById('fieldsList').innerHTML = '';
        // Add a default ID field
        this.addFieldRow('id', 'INTEGER', false, true);
    },
    
    // Close add table dialog
    closeAddTableDialog: function() {
        document.getElementById('addTableModal').style.display = 'none';
    },
    
    // Add field row to table creation dialog
    addFieldRow: function(name = '', type = 'VARCHAR', nullable = true, isPrimary = false) {
        const fieldsList = document.getElementById('fieldsList');
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-item';
        
        fieldDiv.innerHTML = `
            <input type="text" placeholder="Field name" value="${name}" class="field-name">
            <select class="field-type">
                <option value="INTEGER" ${type === 'INTEGER' ? 'selected' : ''}>INTEGER</option>
                <option value="VARCHAR" ${type === 'VARCHAR' ? 'selected' : ''}>VARCHAR</option>
                <option value="TEXT" ${type === 'TEXT' ? 'selected' : ''}>TEXT</option>
                <option value="DECIMAL" ${type === 'DECIMAL' ? 'selected' : ''}>DECIMAL</option>
                <option value="BOOLEAN" ${type === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                <option value="DATE" ${type === 'DATE' ? 'selected' : ''}>DATE</option>
                <option value="TIMESTAMP" ${type === 'TIMESTAMP' ? 'selected' : ''}>TIMESTAMP</option>
                <option value="JSON" ${type === 'JSON' ? 'selected' : ''}>JSON</option>
            </select>
            <label style="display: flex; align-items: center; margin: 0;">
                <input type="checkbox" ${!nullable ? 'checked' : ''} class="field-not-null" style="margin-right: 5px;">
                NOT NULL
            </label>
            <label style="display: flex; align-items: center; margin: 0;">
                <input type="checkbox" ${isPrimary ? 'checked' : ''} class="field-primary" style="margin-right: 5px;">
                PRIMARY
            </label>
            <button onclick="this.parentElement.remove()">Remove</button>
        `;
        
        fieldsList.appendChild(fieldDiv);
    },
    
    // Create a new table
    createTable: function() {
        const tableName = document.getElementById('tableName').value.trim();
        if (!tableName) {
            alert('Please enter a table name');
            return;
        }
        
        // Collect fields
        const fieldItems = document.querySelectorAll('.field-item');
        const fields = [];
        
        fieldItems.forEach((item, index) => {
            const name = item.querySelector('.field-name').value.trim();
            const type = item.querySelector('.field-type').value;
            const notNull = item.querySelector('.field-not-null').checked;
            const isPrimary = item.querySelector('.field-primary').checked;
            
            if (name) {
                fields.push({
                    uuid: NModelViewer.utils.generateUUID(),
                    name: name,
                    type: type,
                    nullable: !notNull,
                    isPrimary: isPrimary,
                    order: index
                });
            }
        });
        
        if (fields.length === 0) {
            alert('Please add at least one field');
            return;
        }
        
        // Create the table
        const tableUUID = NModelViewer.utils.generateUUID();
        const displayUUID = NModelViewer.utils.generateUUID();
        
        // Add to model data structure
        if (!NModelViewer.state.modelData) {
            // Initialize minimal model data structure if not loaded
            NModelViewer.state.modelData = {
                ObjectJsons: {},
                MVDiagramData: {}
            };
        }
        
        // Create table schema object matching the expected format
        const tableSchema = {
            name: tableName,
            fields: fields.map(f => ({
                Name: f.name,
                Type: f.type,
                IsNull: f.nullable ? "YES" : "NO",
                IsPrimary: f.isPrimary,
                OrderNum: f.order
            })),
            foreignKeys: []
        };
        
        // Add to tablesMap
        NModelViewer.state.tablesMap[tableUUID] = tableSchema;
        
        // Find a good position for the new table
        let x = 50;
        let y = 50;
        
        // If there are existing tables, find the rightmost position
        if (Object.keys(NModelViewer.state.layoutInfo).length > 0) {
            let maxX = 0;
            let maxY = 0;
            let rightmostY = 0;
            
            // Find the rightmost table
            for (const [uuid, layout] of Object.entries(NModelViewer.state.layoutInfo)) {
                if (layout.rect) {
                    const rightEdge = layout.rect.X + layout.rect.Width;
                    if (rightEdge > maxX) {
                        maxX = rightEdge;
                        rightmostY = layout.rect.Y;
                    }
                    maxY = Math.max(maxY, layout.rect.Y + layout.rect.Height);
                }
            }
            
            // Place new table to the right of existing tables
            x = maxX + 50;
            y = rightmostY;
            
            // If it would be too far right, start a new row
            const svg = document.getElementById('diagram');
            const svgWidth = svg.clientWidth || 1200;
            if (x + 200 > svgWidth) {
                x = 50;
                y = maxY + 50;
            }
        }
        
        // Ensure the table is within the current viewport
        const container = document.getElementById('diagram-container');
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;
        const viewWidth = container.clientWidth;
        const viewHeight = container.clientHeight;
        
        // Place it in the visible area if it would be outside
        if (x < scrollLeft || x > scrollLeft + viewWidth - 250) {
            x = scrollLeft + 50;
        }
        if (y < scrollTop || y > scrollTop + viewHeight - 200) {
            y = scrollTop + 50;
        }
        
        const displayObject = {
            uuid: displayUUID,
            name: tableName,
            refUUID: tableUUID  // This links the display object to the table schema
        };
        
        const layoutObject = {
            name: tableName,
            rect: {
                X: x,
                Y: y,
                Width: 200,
                Height: 100 + fields.length * 20
            }
        };
        
        // Add to display objects and layout info
        NModelViewer.state.displayObjectsMap[displayUUID] = displayObject;
        NModelViewer.state.layoutInfo[displayUUID] = layoutObject;
        
        // Add the new table to the model's child objects if we have model data
        if (NModelViewer.state.modelData) {
            // Find the MVDiagram object and add to its ChildObjectUUIDs
            for (const [uuid, objects] of Object.entries(NModelViewer.state.modelData.ObjectJsons)) {
                if (Array.isArray(objects)) {
                    const metaObj = objects.find(obj => obj._META_ && obj.ObjectTypeID === 'MVDiagram');
                    if (metaObj) {
                        if (!metaObj.ChildObjectUUIDs) {
                            metaObj.ChildObjectUUIDs = [];
                        }
                        if (!metaObj.ChildObjectUUIDs.includes(displayUUID)) {
                            metaObj.ChildObjectUUIDs.push(displayUUID);
                        }
                        break;
                    }
                }
            }
        }
        
        // Render the new table
        NModelViewer.rendering.renderTable(displayUUID, tableSchema, layoutObject.rect);
        
        // Close dialog
        this.closeAddTableDialog();
        
        // Scroll to the new table
        // Center the new table in the viewport
        const scrollX = Math.max(0, x - container.clientWidth / 2 + 100);
        const scrollY = Math.max(0, y - container.clientHeight / 2 + 75);
        container.scrollLeft = scrollX;
        container.scrollTop = scrollY;
        
        // Highlight the new table briefly
        const newTableElement = document.querySelector(`g[data-uuid="${displayUUID}"]`);
        if (newTableElement) {
            const rect = newTableElement.querySelector('rect');
            if (rect) {
                const originalStroke = rect.getAttribute('stroke') || '#3788d8';
                const originalStrokeWidth = rect.getAttribute('stroke-width') || '2';
                rect.setAttribute('stroke', '#007bff');
                rect.setAttribute('stroke-width', '3');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    rect.setAttribute('stroke', originalStroke);
                    rect.setAttribute('stroke-width', originalStrokeWidth);
                }, 2000);
            }
        }
    }
};

// Make functions available globally for backward compatibility
window.showAddTableDialog = function() { NModelViewer.modals.showAddTableDialog(); };
window.closeAddTableDialog = function() { NModelViewer.modals.closeAddTableDialog(); };
window.addFieldRow = function(name, type, nullable, isPrimary) { 
    NModelViewer.modals.addFieldRow(name, type, nullable, isPrimary); 
};
window.createTable = function() { NModelViewer.modals.createTable(); };