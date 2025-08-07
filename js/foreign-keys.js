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
            
            // Get actual table positions from the DOM elements
            const sourceElement = document.querySelector(`g[data-uuid="${fkSourceField.tableUUID}"]`);
            const targetElement = document.querySelector(`g[data-uuid="${fkTargetField.tableUUID}"]`);
            
            let sourceX = sourceLayout.rect.X;
            let sourceY = sourceLayout.rect.Y;
            let targetX = targetLayout.rect.X;
            let targetY = targetLayout.rect.Y;
            
            // If elements exist, get their actual positions from transforms
            if (sourceElement) {
                const sourceTransform = sourceElement.getAttribute('transform');
                const sourceMatch = sourceTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (sourceMatch) {
                    sourceX = parseFloat(sourceMatch[1]);
                    sourceY = parseFloat(sourceMatch[2]);
                }
            }
            
            if (targetElement) {
                const targetTransform = targetElement.getAttribute('transform');
                const targetMatch = targetTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (targetMatch) {
                    targetX = parseFloat(targetMatch[1]);
                    targetY = parseFloat(targetMatch[2]);
                }
            }
            
            const minX = Math.min(sourceX, targetX) - 50;
            const minY = Math.min(sourceY, targetY) - 50;
            const maxX = Math.max(sourceX + sourceLayout.rect.Width, targetX + targetLayout.rect.Width) + 50;
            const maxY = Math.max(sourceY + sourceLayout.rect.Height, targetY + targetLayout.rect.Height) + 50;
            
            // Create simple vertices that will be recalculated
            const vertices = [
                { X: 50, Y: 50 },
                { X: 150, Y: 150 }
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
            
            // Add to relationships map with the display UUID as the key
            NModelViewer.state.relationshipsMap[displayUUID] = {
                uuid: displayUUID,
                name: fkName,
                data: relationshipData,
                layout: {
                    name: fkName,
                    rect: {
                        X: minX,
                        Y: minY,
                        Width: Math.max(100, maxX - minX),
                        Height: Math.max(100, maxY - minY)
                    }
                }
            };
            
            // Update table relationships - use displayUUID as that's what we're tracking
            [fkSourceField.tableUUID, fkTargetField.tableUUID].forEach(tableUUID => {
                if (!NModelViewer.state.tableRelationships[tableUUID]) {
                    NModelViewer.state.tableRelationships[tableUUID] = [];
                }
                NModelViewer.state.tableRelationships[tableUUID].push(displayUUID);
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
            
            // Add the foreign key to the source table's schema
            // Tables are stored by their display UUID, so use that directly
            const tableSchema = NModelViewer.state.tablesMap[fkSourceField.tableUUID];
            if (tableSchema) {
                if (!tableSchema.foreignKeys) {
                    tableSchema.foreignKeys = [];
                }
                
                // Create the foreign key entry
                const foreignKeyEntry = {
                    "Name": fkName,
                    "Fields": [fkSourceField.fieldName],
                    "ReferenceSchema": "public",  // Default to public schema
                    "ReferenceTable": fkTargetField.tableName,
                    "ReferenceFields": [fkTargetField.fieldName],
                    "OnDelete": "NO ACTION",
                    "OnUpdate": "NO ACTION"
                };
                
                tableSchema.foreignKeys.push(foreignKeyEntry);
                console.log(`Added foreign key to table ${tableSchema.name}:`, foreignKeyEntry);
                
                // Update the table in the model if it exists
                // Get the actual table UUID from the display object
                const displayObj = NModelViewer.state.displayObjectsMap[fkSourceField.tableUUID];
                if (displayObj && displayObj.refUUID && NModelViewer.state.modelData && 
                    NModelViewer.state.modelData.ObjectJsons[displayObj.refUUID]) {
                    const tableObjects = NModelViewer.state.modelData.ObjectJsons[displayObj.refUUID];
                    const tableCommonObj = tableObjects.find(obj => obj.TableCommon);
                    if (tableCommonObj) {
                        tableCommonObj.TableCommon.ForeignKeys = tableSchema.foreignKeys;
                        console.log(`Updated model foreign keys for table ${tableSchema.name}`);
                    }
                }
            }
            
            // Initialize model data if needed
            if (!NModelViewer.state.modelData) {
                // Initialize minimal model data structure if not loaded
                NModelViewer.state.modelData = {
                    ObjectJsons: {},
                    MVDiagramData: {}
                };
                
                // Create an MVDiagram
                const diagramUUID = NModelViewer.utils.generateUUID();
                NModelViewer.state.modelData.ObjectJsons[diagramUUID] = [
                    {
                        "_META_": true,
                        "_VERSION_": "",
                        "ObjectName": "Data Model Diagram",
                        "ObjectTypeID": "MVDiagram",
                        "ObjectTypeDisplayName": "MVDiagram",
                        "ObjectVersion": "17.0.0001",
                        "ChildObjectUUIDs": []
                    },
                    {
                        "PaperSize": NModelViewer.state.diagramInfo.paperSize || { Width: 850, Height: 1100 },
                        "PagesSize": NModelViewer.state.diagramInfo.pagesSize || { Width: 4, Height: 3 }
                    }
                ];
                NModelViewer.state.mvDiagramUUID = diagramUUID;
                console.log('Created new MVDiagram with UUID:', diagramUUID);
            }
            
            // Add the new foreign key to the model's ObjectJsons immediately
            if (NModelViewer.state.modelData) {
                // Create the relationship object in the model
                NModelViewer.state.modelData.ObjectJsons[displayUUID] = [
                    {
                        "_META_": true,
                        "_VERSION_": "",
                        "ObjectName": fkName,
                        "ObjectTypeID": "MVDiagramShape_Relation",
                        "ObjectTypeDisplayName": "MVDiagramShape_Relation",
                        "ObjectVersion": "17.0.0000"
                    },
                    {
                        "LineCommon": {
                            "Vertices": relationshipData.vertices || [],
                            "ConnectInfos": relationshipData.connectInfos || []
                        }
                    },
                    {
                        "ConnectorCommon": relationshipData.connectorCommon || {
                            "Type": "Elbow",
                            "StartAxis": "Horizontal"
                        }
                    },
                    {
                        "ArrowCommon": relationshipData.arrowCommon || {
                            "BeginStyle": "None",
                            "EndStyle": "None"
                        }
                    }
                ];
                
                // Find the MVDiagram and add to its ChildObjectUUIDs
                if (NModelViewer.state.mvDiagramUUID && NModelViewer.state.modelData.ObjectJsons[NModelViewer.state.mvDiagramUUID]) {
                    const mvDiagramData = NModelViewer.state.modelData.ObjectJsons[NModelViewer.state.mvDiagramUUID];
                    const metaObj = mvDiagramData.find(obj => obj._META_);
                    if (metaObj) {
                        if (!metaObj.ChildObjectUUIDs) {
                            metaObj.ChildObjectUUIDs = [];
                        }
                        if (!metaObj.ChildObjectUUIDs.includes(displayUUID)) {
                            metaObj.ChildObjectUUIDs.push(displayUUID);
                        }
                    }
                }
                
                console.log('Added foreign key to model:', {
                    displayUUID,
                    fkName,
                    modelObjectKeys: Object.keys(NModelViewer.state.modelData.ObjectJsons)
                });
            }
            
            // Instead of rendering with bad vertices, create the relationship element directly
            // with the correct path from the start
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'relationship-group');
            g.setAttribute('data-uuid', displayUUID);
            g.setAttribute('data-name', fkName);
            
            // Calculate the proper path using the same logic as recalculateRelationshipPath
            console.log('Creating FK between:', {
                source: { x: sourceX, y: sourceY, width: sourceLayout.rect.Width, height: sourceLayout.rect.Height },
                target: { x: targetX, y: targetY, width: targetLayout.rect.Width, height: targetLayout.rect.Height }
            });
            
            const center1 = {
                x: sourceX + sourceLayout.rect.Width / 2,
                y: sourceY + sourceLayout.rect.Height / 2
            };
            const center2 = {
                x: targetX + targetLayout.rect.Width / 2,
                y: targetY + targetLayout.rect.Height / 2
            };
            
            // Determine the best sides to connect
            const dx = center2.x - center1.x;
            const dy = center2.y - center1.y;
            
            let point1, point2;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal relationship
                if (dx > 0) {
                    // Source is left of target
                    point1 = { x: sourceX + sourceLayout.rect.Width, y: sourceY + sourceLayout.rect.Height / 2 };
                    point2 = { x: targetX, y: targetY + targetLayout.rect.Height / 2 };
                } else {
                    // Source is right of target
                    point1 = { x: sourceX, y: sourceY + sourceLayout.rect.Height / 2 };
                    point2 = { x: targetX + targetLayout.rect.Width, y: targetY + targetLayout.rect.Height / 2 };
                }
            } else {
                // Vertical relationship
                if (dy > 0) {
                    // Source is above target
                    point1 = { x: sourceX + sourceLayout.rect.Width / 2, y: sourceY + sourceLayout.rect.Height };
                    point2 = { x: targetX + targetLayout.rect.Width / 2, y: targetY };
                } else {
                    // Source is below target
                    point1 = { x: sourceX + sourceLayout.rect.Width / 2, y: sourceY };
                    point2 = { x: targetX + targetLayout.rect.Width / 2, y: targetY + targetLayout.rect.Height };
                }
            }
            
            console.log('Connection points:', { point1, point2, dx, dy });
            
            // Create elbow path
            let d = `M ${point1.x} ${point1.y}`;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal dominant
                const midX = (point1.x + point2.x) / 2;
                d += ` L ${midX} ${point1.y}`;
                d += ` L ${midX} ${point2.y}`;
                d += ` L ${point2.x} ${point2.y}`;
            } else {
                // Vertical dominant
                const midY = (point1.y + point2.y) / 2;
                d += ` L ${point1.x} ${midY}`;
                d += ` L ${point2.x} ${midY}`;
                d += ` L ${point2.x} ${point2.y}`;
            }
            
            console.log('Generated path:', d);
            
            // Create the path element
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'relationship-line');
            path.setAttribute('data-uuid', displayUUID);
            
            // Create clickable path
            const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            clickPath.setAttribute('d', d);
            clickPath.setAttribute('stroke', 'transparent');
            clickPath.setAttribute('stroke-width', '10');
            clickPath.setAttribute('fill', 'none');
            clickPath.style.cursor = 'pointer';
            
            // Add click handler
            clickPath.addEventListener('click', () => {
                NModelViewer.relationships.showRelationshipInfo(displayUUID, fkName, relationshipData);
            });
            
            g.appendChild(clickPath);
            g.appendChild(path);
            
            document.getElementById('relationships').appendChild(g);
            
            // Close dialog and cleanup
            this.closeForeignKeyDialog();
            this.cancelForeignKeyCreation();  // Now we can clear the fields
            
        } catch (error) {
            console.error('Error creating foreign key:', error);
            alert('Error creating foreign key: ' + error.message);
        }
    },
    
    // Helper function to find table UUID from display UUID
    findTableUUIDByDisplayUUID: function(displayUUID) {
        const displayObj = NModelViewer.state.displayObjectsMap[displayUUID];
        if (displayObj && displayObj.refUUID) {
            return displayObj.refUUID;
        }
        return null;
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