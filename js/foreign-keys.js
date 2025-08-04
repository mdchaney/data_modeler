// Foreign key creation functionality for NModel Viewer
NModelViewer.foreignKeys = {
    // Start foreign key creation mode
    startAddForeignKey: function() {
        NModelViewer.state.fkCreationMode = true;
        NModelViewer.state.fkSourceField = null;
        NModelViewer.state.fkTargetField = null;
        
        // Show status message
        const status = document.getElementById('fk-status');
        status.style.display = 'block';
        status.textContent = 'Click on a source field to start';
        
        // Add creation mode class to body
        document.body.classList.add('fk-creation-mode');
        
        // Create drag line element
        if (!NModelViewer.state.fkDragLine) {
            const svg = document.getElementById('diagram');
            const zoomGroup = document.getElementById('zoom-group');
            NModelViewer.state.fkDragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            NModelViewer.state.fkDragLine.setAttribute('class', 'fk-drag-line');
            zoomGroup.appendChild(NModelViewer.state.fkDragLine);
        }
        
        // Add escape key handler
        document.addEventListener('keydown', this.handleFKEscape.bind(this));
    },
    
    // Handle escape key to cancel FK creation
    handleFKEscape: function(e) {
        if (e.key === 'Escape') {
            this.cancelForeignKeyCreation();
        }
    },
    
    // Cancel foreign key creation
    cancelForeignKeyCreation: function() {
        NModelViewer.state.fkCreationMode = false;
        NModelViewer.state.fkSourceField = null;
        NModelViewer.state.fkTargetField = null;
        
        // Hide status
        document.getElementById('fk-status').style.display = 'none';
        
        // Remove creation mode class
        document.body.classList.remove('fk-creation-mode');
        
        // Remove drag line
        if (NModelViewer.state.fkDragLine && NModelViewer.state.fkDragLine.parentNode) {
            NModelViewer.state.fkDragLine.parentNode.removeChild(NModelViewer.state.fkDragLine);
            NModelViewer.state.fkDragLine = null;
        }
        
        // Clear any highlighted fields
        document.querySelectorAll('.field-selected, .field-hover').forEach(el => {
            el.classList.remove('field-selected', 'field-hover');
        });
        
        // Remove escape handler
        document.removeEventListener('keydown', this.handleFKEscape.bind(this));
        
        // Remove drag handlers
        document.removeEventListener('mousemove', this.handleFKDrag.bind(this));
        document.removeEventListener('mouseup', this.handleFKDrop.bind(this));
    },
    
    // Handle field hover
    handleFieldHover: function(e, isEntering) {
        if (!NModelViewer.state.fkCreationMode) return;
        
        const fieldBg = e.currentTarget.querySelector('.field-bg');
        if (!fieldBg) return;
        
        if (isEntering) {
            fieldBg.classList.add('field-hover');
        } else {
            fieldBg.classList.remove('field-hover');
        }
    },
    
    // Handle field click
    handleFieldClick: function(e) {
        if (!NModelViewer.state.fkCreationMode) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        const fieldGroup = e.currentTarget;
        const fieldBg = fieldGroup.querySelector('.field-bg');
        
        if (!NModelViewer.state.fkSourceField) {
            // First click - select source field
            NModelViewer.state.fkSourceField = {
                tableUUID: fieldGroup.getAttribute('data-table-uuid'),
                tableName: fieldGroup.getAttribute('data-table-name'),
                fieldName: fieldGroup.getAttribute('data-field-name'),
                fieldType: fieldGroup.getAttribute('data-field-type'),
                element: fieldGroup
            };
            
            fieldBg.classList.add('field-selected');
            document.getElementById('fk-status').textContent = 'Now drag to the target field';
            
            // Start drag
            const rect = fieldGroup.getBoundingClientRect();
            const svg = document.getElementById('diagram');
            const pt = svg.createSVGPoint();
            pt.x = rect.left + rect.width / 2;
            pt.y = rect.top + rect.height / 2;
            const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
            
            NModelViewer.state.fkDragLine.setAttribute('x1', svgP.x / NModelViewer.state.currentZoom);
            NModelViewer.state.fkDragLine.setAttribute('y1', svgP.y / NModelViewer.state.currentZoom);
            NModelViewer.state.fkDragLine.setAttribute('x2', svgP.x / NModelViewer.state.currentZoom);
            NModelViewer.state.fkDragLine.setAttribute('y2', svgP.y / NModelViewer.state.currentZoom);
            NModelViewer.state.fkDragLine.style.display = 'block';
            
            document.addEventListener('mousemove', this.handleFKDrag.bind(this));
            document.addEventListener('mouseup', this.handleFKDrop.bind(this));
        }
    },
    
    // Handle FK drag
    handleFKDrag: function(e) {
        if (!NModelViewer.state.fkDragLine || !NModelViewer.state.fkSourceField) return;
        
        const svg = document.getElementById('diagram');
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        NModelViewer.state.fkDragLine.setAttribute('x2', svgP.x / NModelViewer.state.currentZoom);
        NModelViewer.state.fkDragLine.setAttribute('y2', svgP.y / NModelViewer.state.currentZoom);
    },
    
    // Handle FK drop
    handleFKDrop: function(e) {
        if (!NModelViewer.state.fkSourceField) return;
        
        // Check if we're over a field
        const target = e.target;
        let fieldGroup = target;
        while (fieldGroup && !fieldGroup.classList.contains('field-group')) {
            fieldGroup = fieldGroup.parentElement;
        }
        
        if (fieldGroup && fieldGroup !== NModelViewer.state.fkSourceField.element) {
            // Valid target field
            NModelViewer.state.fkTargetField = {
                tableUUID: fieldGroup.getAttribute('data-table-uuid'),
                tableName: fieldGroup.getAttribute('data-table-name'),
                fieldName: fieldGroup.getAttribute('data-field-name'),
                fieldType: fieldGroup.getAttribute('data-field-type'),
                element: fieldGroup
            };
            
            // Show foreign key dialog
            this.showForeignKeyDialog();
        } else {
            // Invalid drop - cancel
            this.cancelForeignKeyCreation();
        }
    },
    
    // Show foreign key dialog
    showForeignKeyDialog: function() {
        if (!NModelViewer.state.fkSourceField || !NModelViewer.state.fkTargetField) return;
        
        // Store field data in the dialog for later retrieval
        const dialog = document.getElementById('addForeignKeyModal');
        dialog.dataset.sourceTableUuid = NModelViewer.state.fkSourceField.tableUUID;
        dialog.dataset.sourceTableName = NModelViewer.state.fkSourceField.tableName;
        dialog.dataset.sourceFieldName = NModelViewer.state.fkSourceField.fieldName;
        dialog.dataset.sourceFieldType = NModelViewer.state.fkSourceField.fieldType;
        dialog.dataset.targetTableUuid = NModelViewer.state.fkTargetField.tableUUID;
        dialog.dataset.targetTableName = NModelViewer.state.fkTargetField.tableName;
        dialog.dataset.targetFieldName = NModelViewer.state.fkTargetField.fieldName;
        dialog.dataset.targetFieldType = NModelViewer.state.fkTargetField.fieldType;
        
        // Hide drag line
        if (NModelViewer.state.fkDragLine) {
            NModelViewer.state.fkDragLine.style.display = 'none';
        }
        
        // Populate dialog
        document.getElementById('fk-from-info').textContent = 
            `${NModelViewer.state.fkSourceField.tableName}.${NModelViewer.state.fkSourceField.fieldName} (${NModelViewer.state.fkSourceField.fieldType})`;
        document.getElementById('fk-to-info').textContent = 
            `${NModelViewer.state.fkTargetField.tableName}.${NModelViewer.state.fkTargetField.fieldName} (${NModelViewer.state.fkTargetField.fieldType})`;
        
        // Generate default name
        document.getElementById('fkName').value = 
            `fk_${NModelViewer.state.fkSourceField.tableName}_${NModelViewer.state.fkTargetField.tableName}`;
        
        // Show dialog
        document.getElementById('addForeignKeyModal').style.display = 'block';
    },
    
    // Close foreign key dialog
    closeForeignKeyDialog: function() {
        document.getElementById('addForeignKeyModal').style.display = 'none';
        // Don't call cancelForeignKeyCreation() here - we need to preserve the field data
    },
    
    // Create foreign key
    createForeignKey: function() {
        try {
            let fkSourceField = NModelViewer.state.fkSourceField;
            let fkTargetField = NModelViewer.state.fkTargetField;
            
            // If fields are null, try to retrieve from dialog dataset
            if (!fkSourceField || !fkTargetField) {
                const dialog = document.getElementById('addForeignKeyModal');
                
                fkSourceField = {
                    tableUUID: dialog.dataset.sourceTableUuid,
                    tableName: dialog.dataset.sourceTableName,
                    fieldName: dialog.dataset.sourceFieldName,
                    fieldType: dialog.dataset.sourceFieldType
                };
                
                fkTargetField = {
                    tableUUID: dialog.dataset.targetTableUuid,
                    tableName: dialog.dataset.targetTableName,
                    fieldName: dialog.dataset.targetFieldName,
                    fieldType: dialog.dataset.targetFieldType
                };
            }
            
            if (!fkSourceField.tableUUID || !fkTargetField.tableUUID) {
                alert('Please select both source and target fields');
                return;
            }
            
            const fkName = document.getElementById('fkName').value.trim();
            if (!fkName) {
                alert('Please enter a foreign key name');
                return;
            }
            
            // Generate UUIDs
            const fkUUID = NModelViewer.utils.generateUUID();
            const displayUUID = NModelViewer.utils.generateUUID();
            
            // Get table positions to calculate initial vertices
            // The tableUUID from fields is the display UUID (since we set it in renderTable)
            const sourceLayout = NModelViewer.state.layoutInfo[fkSourceField.tableUUID];
            const targetLayout = NModelViewer.state.layoutInfo[fkTargetField.tableUUID];
            
            if (!sourceLayout || !targetLayout) {
                alert('Cannot find table layouts');
                console.error('Source layout:', sourceLayout, 'Target layout:', targetLayout);
                return;
            }
        
            // Calculate a simple bounding box between the tables
            const sourceX = sourceLayout.rect.X;
            const sourceY = sourceLayout.rect.Y;
            const targetX = targetLayout.rect.X;
            const targetY = targetLayout.rect.Y;
            
            const minX = Math.min(sourceX, targetX) - 50;
            const minY = Math.min(sourceY, targetY) - 50;
            const maxX = Math.max(sourceX + sourceLayout.rect.Width, targetX + targetLayout.rect.Width) + 50;
            const maxY = Math.max(sourceY + sourceLayout.rect.Height, targetY + targetLayout.rect.Height) + 50;
            
            // Calculate vertices based on table positions
            // The vertices should be relative to the relationship's bounding box
            // For a simple connection, create vertices that go from source to target
            const relativeSourceX = sourceX - minX;
            const relativeSourceY = sourceY - minY;
            const relativeTargetX = targetX - minX;
            const relativeTargetY = targetY - minY;
            
            // Create vertices for an elbow connection
            const vertices = [
                { X: relativeSourceX + sourceLayout.rect.Width, Y: relativeSourceY + sourceLayout.rect.Height / 2 },
                { X: relativeSourceX + sourceLayout.rect.Width + 50, Y: relativeSourceY + sourceLayout.rect.Height / 2 },
                { X: relativeSourceX + sourceLayout.rect.Width + 50, Y: relativeTargetY + targetLayout.rect.Height / 2 },
                { X: relativeTargetX, Y: relativeTargetY + targetLayout.rect.Height / 2 }
            ];
            
            // Create the foreign key relationship data
            const relationshipData = {
                uuid: fkUUID,
                name: fkName,
                vertices: vertices,
                connectInfos: [
                    {
                        Index: 2, // Right side
                        RefUUID: fkSourceField.tableUUID
                    },
                    {
                        Index: 0, // Left side
                        RefUUID: fkTargetField.tableUUID
                    }
                ],
                connectorCommon: {
                    Type: "Elbow",
                    StartAxis: "Horizontal"
                },
                arrowCommon: {
                    BeginStyle: "None",
                    EndStyle: "None"
                }
            };
            
            // Add to relationships map
            NModelViewer.state.relationshipsMap[fkUUID] = {
                data: relationshipData,
                layout: {
                    rect: {
                        X: 0,
                        Y: 0,
                        Width: 200,
                        Height: 200
                    }
                }
            };
            
            // Update table relationships
            [fkSourceField.tableUUID, fkTargetField.tableUUID].forEach(tableUUID => {
                if (!NModelViewer.state.tableRelationships[tableUUID]) {
                    NModelViewer.state.tableRelationships[tableUUID] = [];
                }
                NModelViewer.state.tableRelationships[tableUUID].push(fkUUID);
            });
            
            // Add to layout info with proper bounding box
            NModelViewer.state.layoutInfo[displayUUID] = {
                name: fkName,
                rect: {
                    X: minX,
                    Y: minY,
                    Width: Math.max(100, maxX - minX),
                    Height: Math.max(100, maxY - minY)
                }
            };
            
            // Add to display objects
            NModelViewer.state.displayObjectsMap[displayUUID] = {
                name: fkName,
                refUUID: fkUUID
            };
            
            // Render the relationship
            NModelViewer.relationships.renderRelationship(displayUUID, fkName, relationshipData);
            
            // Close dialog and cleanup
            this.closeForeignKeyDialog();
            this.cancelForeignKeyCreation();  // Now we can clear the fields
            
        } catch (error) {
            console.error('Error creating foreign key:', error);
            alert('Error creating foreign key: ' + error.message);
        }
    }
};

// Make functions available globally for backward compatibility
window.startAddForeignKey = function() { NModelViewer.foreignKeys.startAddForeignKey(); };
window.handleFKEscape = function(e) { NModelViewer.foreignKeys.handleFKEscape(e); };
window.cancelForeignKeyCreation = function() { NModelViewer.foreignKeys.cancelForeignKeyCreation(); };
window.handleFieldHover = function(e, isEntering) { NModelViewer.foreignKeys.handleFieldHover(e, isEntering); };
window.handleFieldClick = function(e) { NModelViewer.foreignKeys.handleFieldClick(e); };
window.handleFKDrag = function(e) { NModelViewer.foreignKeys.handleFKDrag(e); };
window.handleFKDrop = function(e) { NModelViewer.foreignKeys.handleFKDrop(e); };
window.showForeignKeyDialog = function() { NModelViewer.foreignKeys.showForeignKeyDialog(); };
window.closeForeignKeyDialog = function() { NModelViewer.foreignKeys.closeForeignKeyDialog(); };
window.createForeignKey = function() { NModelViewer.foreignKeys.createForeignKey(); };