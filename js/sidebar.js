// Sidebar functionality for NModel Viewer
NModelViewer.sidebar = {
    // Update the object list in the sidebar
    updateObjectList: function() {
        const listContent = document.getElementById('object-list-content');
        if (!listContent) return;
        
        listContent.innerHTML = '';
        
        // Collect all tables
        const tables = [];
        for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
            tables.push({
                uuid: uuid,
                name: table.name,
                type: 'table'
            });
        }
        
        // Sort tables alphabetically
        tables.sort((a, b) => a.name.localeCompare(b.name));
        
        // Collect all foreign keys
        const foreignKeys = [];
        for (const [uuid, relData] of Object.entries(NModelViewer.state.relationshipsMap)) {
            if (relData.name && relData.name.startsWith('fk_')) {
                foreignKeys.push({
                    uuid: uuid,
                    name: relData.name,
                    type: 'foreign-key'
                });
            }
        }
        
        // Sort foreign keys alphabetically
        foreignKeys.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add section for tables
        if (tables.length > 0) {
            const tablesHeader = document.createElement('div');
            tablesHeader.style.cssText = 'font-weight: bold; margin: 10px 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase;';
            tablesHeader.textContent = 'Tables';
            listContent.appendChild(tablesHeader);
            
            tables.forEach(table => {
                const item = document.createElement('div');
                item.className = 'object-list-item table';
                item.textContent = table.name;
                item.dataset.uuid = table.uuid;
                item.dataset.type = table.type;
                
                item.addEventListener('click', () => {
                    this.selectObject(table.uuid, table.type);
                });
                
                listContent.appendChild(item);
            });
        }
        
        // Add section for foreign keys
        if (foreignKeys.length > 0) {
            const fkHeader = document.createElement('div');
            fkHeader.style.cssText = 'font-weight: bold; margin: 20px 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase;';
            fkHeader.textContent = 'Foreign Keys';
            listContent.appendChild(fkHeader);
            
            foreignKeys.forEach(fk => {
                const item = document.createElement('div');
                item.className = 'object-list-item foreign-key';
                item.textContent = fk.name;
                item.dataset.uuid = fk.uuid;
                item.dataset.type = fk.type;
                
                item.addEventListener('click', () => {
                    this.selectObject(fk.uuid, fk.type);
                });
                
                listContent.appendChild(item);
            });
        }
        
        // If no objects, show message
        if (tables.length === 0 && foreignKeys.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'color: #999; text-align: center; padding: 20px;';
            emptyMsg.textContent = 'No objects loaded';
            listContent.appendChild(emptyMsg);
        }
    },
    
    // Select an object and show its details
    selectObject: function(uuid, type) {
        // Update selected state in list
        const items = document.querySelectorAll('.object-list-item');
        items.forEach(item => {
            if (item.dataset.uuid === uuid) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Show object details
        if (type === 'table') {
            this.showTableDetails(uuid);
        } else if (type === 'foreign-key') {
            this.showForeignKeyDetails(uuid);
        }
        
        // Also highlight the object in the diagram
        this.highlightObject(uuid);
    },
    
    // Show table details
    showTableDetails: function(uuid) {
        const detailsContent = document.getElementById('object-details-content');
        if (!detailsContent) return;
        
        const table = NModelViewer.state.tablesMap[uuid];
        if (!table) return;
        
        let html = `
            <div class="object-detail-title">${table.name}</div>
            <div class="object-detail-row">
                <span class="object-detail-label">Type:</span> 
                <span class="object-detail-value">Table</span>
            </div>
            <div class="object-detail-row">
                <span class="object-detail-label">Fields:</span> 
                <span class="object-detail-value">${table.fields.length}</span>
            </div>
        `;
        
        // Show fields
        if (table.fields.length > 0) {
            html += '<div style="margin-top: 15px;">';
            html += '<div class="object-detail-label" style="margin-bottom: 5px;">Field List:</div>';
            html += '<div style="max-height: 200px; overflow-y: auto;">';
            
            table.fields.forEach(field => {
                const isPrimary = field.IsPrimary || field.isPrimary;
                const fieldType = field.Type || field.type;
                const nullable = field.IsNull === 'YES' || field.nullable !== false;
                
                html += '<div style="padding: 5px; border-bottom: 1px solid #eee; font-size: 12px;">';
                html += `<strong>${field.Name || field.name}</strong> `;
                html += `<span style="color: #666;">${fieldType}</span>`;
                if (isPrimary) html += ' <span style="color: #d4a017;">PK</span>';
                if (!nullable) html += ' <span style="color: #999;">NOT NULL</span>';
                html += '</div>';
            });
            
            html += '</div></div>';
        }
        
        // Show foreign keys this table has
        const tableFKs = table.foreignKeys || [];
        if (tableFKs.length > 0) {
            html += '<div style="margin-top: 15px;">';
            html += '<div class="object-detail-label" style="margin-bottom: 5px;">Foreign Keys:</div>';
            
            tableFKs.forEach(fk => {
                html += '<div style="padding: 5px; border-bottom: 1px solid #eee; font-size: 12px;">';
                html += `<strong>${fk.Name}</strong><br>`;
                html += `${fk.Fields.join(', ')} → ${fk.ReferenceTable}.${fk.ReferenceFields.join(', ')}`;
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        detailsContent.innerHTML = html;
    },
    
    // Show foreign key details
    showForeignKeyDetails: function(uuid) {
        const detailsContent = document.getElementById('object-details-content');
        if (!detailsContent) return;
        
        const relData = NModelViewer.state.relationshipsMap[uuid];
        if (!relData) return;
        
        let html = `
            <div class="object-detail-title">${relData.name}</div>
            <div class="object-detail-row">
                <span class="object-detail-label">Type:</span> 
                <span class="object-detail-value">Foreign Key</span>
            </div>
        `;
        
        // Find connected tables
        if (relData.data && relData.data.connectInfos) {
            const connections = relData.data.connectInfos;
            if (connections.length >= 2) {
                const sourceTable = NModelViewer.state.tablesMap[connections[0].RefUUID];
                const targetTable = NModelViewer.state.tablesMap[connections[1].RefUUID];
                
                if (sourceTable && targetTable) {
                    html += `
                        <div class="object-detail-row">
                            <span class="object-detail-label">From Table:</span> 
                            <span class="object-detail-value">${sourceTable.name}</span>
                        </div>
                        <div class="object-detail-row">
                            <span class="object-detail-label">To Table:</span> 
                            <span class="object-detail-value">${targetTable.name}</span>
                        </div>
                    `;
                    
                    // Try to find the actual foreign key definition
                    const fkDef = sourceTable.foreignKeys?.find(fk => fk.Name === relData.name);
                    if (fkDef) {
                        html += `
                            <div class="object-detail-row">
                                <span class="object-detail-label">Fields:</span> 
                                <span class="object-detail-value">${fkDef.Fields.join(', ')}</span>
                            </div>
                            <div class="object-detail-row">
                                <span class="object-detail-label">References:</span> 
                                <span class="object-detail-value">${fkDef.ReferenceFields.join(', ')}</span>
                            </div>
                            <div class="object-detail-row">
                                <span class="object-detail-label">On Delete:</span> 
                                <span class="object-detail-value">${fkDef.OnDelete || 'NO ACTION'}</span>
                            </div>
                            <div class="object-detail-row">
                                <span class="object-detail-label">On Update:</span> 
                                <span class="object-detail-value">${fkDef.OnUpdate || 'NO ACTION'}</span>
                            </div>
                        `;
                    }
                }
            }
        }
        
        detailsContent.innerHTML = html;
    },
    
    // Highlight object in diagram
    highlightObject: function(uuid) {
        // Remove previous highlights
        document.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // Add highlight to selected object
        const element = document.querySelector(`[data-uuid="${uuid}"]`);
        if (element) {
            element.classList.add('highlighted');
            
            // Scroll into view if needed
            const container = document.getElementById('diagram-container');
            const svg = document.getElementById('diagram');
            if (container && svg && element.getBoundingClientRect) {
                const rect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Check if element is outside visible area
                if (rect.left < containerRect.left || rect.right > containerRect.right ||
                    rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                    
                    // Get transform of element
                    const transform = element.getAttribute('transform');
                    const match = transform ? transform.match(/translate\(([^,]+),\s*([^)]+)\)/) : null;
                    if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        
                        // Center the object in view
                        container.scrollLeft = x - container.clientWidth / 2 + 100;
                        container.scrollTop = y - container.clientHeight / 2 + 50;
                    }
                }
            }
        }
    }
};

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Update sidebar when model is loaded
    const originalParseAndRender = NModelViewer.dataModel.parseAndRenderDiagram;
    NModelViewer.dataModel.parseAndRenderDiagram = function() {
        originalParseAndRender.call(this);
        NModelViewer.sidebar.updateObjectList();
    };
    
    // Update sidebar when tables or foreign keys are created
    const originalCreateTable = NModelViewer.modals.createTable;
    NModelViewer.modals.createTable = function() {
        originalCreateTable.call(this);
        NModelViewer.sidebar.updateObjectList();
    };
    
    const originalCreateFK = NModelViewer.foreignKeys.createForeignKey;
    NModelViewer.foreignKeys.createForeignKey = function() {
        originalCreateFK.call(this);
        NModelViewer.sidebar.updateObjectList();
    };
});