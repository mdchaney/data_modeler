// Table rendering for NModel Viewer
NModelViewer.rendering = {
    // Set up SVG dimensions
    setupSVGDimensions: function() {
        const svg = document.getElementById('diagram');
        const diagramInfo = NModelViewer.state.diagramInfo;
        
        if (diagramInfo.paperSize && diagramInfo.pagesSize) {
            const totalWidth = diagramInfo.paperSize.Width * diagramInfo.pagesSize.Width;
            const totalHeight = diagramInfo.paperSize.Height * diagramInfo.pagesSize.Height;
            
            svg.setAttribute('width', totalWidth);
            svg.setAttribute('height', totalHeight);
            svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
            
            // Update page info
            const pageInfo = document.getElementById('page-info');
            pageInfo.textContent = `Canvas: ${totalWidth} × ${totalHeight} (${diagramInfo.pagesSize.Width} × ${diagramInfo.pagesSize.Height} pages)`;
            
            // Draw page boundaries
            this.drawPageBoundaries();
        } else {
            // Default size
            svg.setAttribute('width', '2000');
            svg.setAttribute('height', '2000');
            svg.setAttribute('viewBox', '0 0 2000 2000');
        }
    },
    
    // Draw page boundary lines
    drawPageBoundaries: function() {
        const zoomGroup = document.getElementById('zoom-group');
        const diagramInfo = NModelViewer.state.diagramInfo;
        
        // Remove any existing page boundaries
        const existingBoundaries = document.getElementById('page-boundaries');
        if (existingBoundaries) {
            existingBoundaries.remove();
        }
        
        // Create a group for page boundaries
        const pageBoundariesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pageBoundariesGroup.setAttribute('id', 'page-boundaries');
        
        const pageWidth = diagramInfo.paperSize.Width;
        const pageHeight = diagramInfo.paperSize.Height;
        const pagesX = diagramInfo.pagesSize.Width;
        const pagesY = diagramInfo.pagesSize.Height;
        
        // Draw vertical lines
        for (let i = 1; i < pagesX; i++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', i * pageWidth);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', i * pageWidth);
            line.setAttribute('y2', pagesY * pageHeight);
            line.setAttribute('class', 'page-boundary');
            pageBoundariesGroup.appendChild(line);
        }
        
        // Draw horizontal lines
        for (let i = 1; i < pagesY; i++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', i * pageHeight);
            line.setAttribute('x2', pagesX * pageWidth);
            line.setAttribute('y2', i * pageHeight);
            line.setAttribute('class', 'page-boundary');
            pageBoundariesGroup.appendChild(line);
        }
        
        // Insert page boundaries as the first child of zoom-group (behind everything else)
        zoomGroup.insertBefore(pageBoundariesGroup, zoomGroup.firstChild);
    },
    
    // Main render function
    renderDiagram: function(childObjectUUIDs, layoutInfo) {
        const tablesGroup = document.getElementById('tables');
        const relationshipsGroup = document.getElementById('relationships');
        
        // Clear existing content
        tablesGroup.innerHTML = '';
        relationshipsGroup.innerHTML = '';
        
        console.log('Child Object UUIDs:', childObjectUUIDs.length);
        console.log('Layout Info:', Object.keys(layoutInfo).length);
        console.log('Display Objects Map:', NModelViewer.state.displayObjectsMap);
        
        let tablesRendered = 0;
        
        // First render tables
        childObjectUUIDs.forEach(uuid => {
            const displayObj = NModelViewer.state.displayObjectsMap[uuid];
            console.log(`Checking UUID ${uuid}:`, displayObj);
            
            if (displayObj && !displayObj.name.startsWith('fk_')) {
                // This is a table display object
                const tableSchema = NModelViewer.state.tablesMap[displayObj.refUUID];
                const layout = layoutInfo[uuid];
                
                console.log(`  Table Schema:`, tableSchema?.name);
                console.log(`  Layout:`, layout);
                
                if (tableSchema && layout) {
                    this.renderTable(uuid, tableSchema, layout.rect);
                    tablesRendered++;
                }
            }
        });
        
        console.log(`Total tables rendered: ${tablesRendered}`);
        
        // Then render foreign key relationships
        childObjectUUIDs.forEach(uuid => {
            const layout = layoutInfo[uuid];
            if (layout && layout.name && layout.name.startsWith('fk_')) {
                // This is a foreign key relationship
                // Find the actual relationship data
                const relationData = NModelViewer.dataModel.findRelationshipData(uuid);
                if (relationData) {
                    // Store relationship data
                    NModelViewer.state.relationshipsMap[uuid] = {
                        uuid: uuid,
                        name: layout.name,
                        data: relationData,
                        layout: layout
                    };
                    
                    // Track which tables this relationship connects
                    if (relationData.connectInfos) {
                        relationData.connectInfos.forEach(conn => {
                            if (!NModelViewer.state.tableRelationships[conn.RefUUID]) {
                                NModelViewer.state.tableRelationships[conn.RefUUID] = [];
                            }
                            NModelViewer.state.tableRelationships[conn.RefUUID].push(uuid);
                        });
                    }
                    
                    if (NModelViewer.relationships && NModelViewer.relationships.renderRelationship) {
                        NModelViewer.relationships.renderRelationship(uuid, layout.name, relationData);
                    }
                }
            }
        });
    },
    
    // Render a single table
    renderTable: function(uuid, table, position) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'table-node');
        g.setAttribute('data-uuid', uuid);
        g.setAttribute('transform', `translate(${position.X}, ${position.Y})`);
        
        // Table background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', position.Width);
        rect.setAttribute('height', position.Height);
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#3788d8');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('rx', '4');
        g.appendChild(rect);
        
        // Table header
        const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        headerBg.setAttribute('width', position.Width);
        headerBg.setAttribute('height', '30');
        headerBg.setAttribute('fill', '#3788d8');
        headerBg.setAttribute('rx', '4');
        g.appendChild(headerBg);
        
        // Fix header bottom corners
        const headerFix = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        headerFix.setAttribute('y', '20');
        headerFix.setAttribute('width', position.Width);
        headerFix.setAttribute('height', '10');
        headerFix.setAttribute('fill', '#3788d8');
        g.appendChild(headerFix);
        
        const headerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        headerText.setAttribute('x', position.Width / 2);
        headerText.setAttribute('y', '20');
        headerText.setAttribute('text-anchor', 'middle');
        headerText.setAttribute('fill', 'white');
        headerText.setAttribute('class', 'table-header');
        headerText.textContent = table.name;
        g.appendChild(headerText);
        
        // Show first few fields
        let yPos = 45;
        // More accurate calculation: header takes ~35px, each field ~16px, leave 10px margin at bottom
        const availableHeight = position.Height - 35 - 10;
        const maxFieldsToShow = Math.floor(availableHeight / 16);
        const fieldsToShow = table.fields.slice(0, maxFieldsToShow);
        
        // Create a single clipPath for all fields
        const fieldsClipId = `fields-clip-${uuid}`;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', fieldsClipId);
        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipRect.setAttribute('x', '8');
        clipRect.setAttribute('y', '0');
        clipRect.setAttribute('width', position.Width - 16);
        clipRect.setAttribute('height', position.Height);
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        g.appendChild(defs);
        
        // Create a group for all fields with clipping
        const fieldsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        fieldsGroup.setAttribute('clip-path', `url(#${fieldsClipId})`);
        
        fieldsToShow.forEach((field, index) => {
            const fieldGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            fieldGroup.setAttribute('class', 'field-group');
            fieldGroup.setAttribute('data-field-name', field.Name);
            fieldGroup.setAttribute('data-field-type', field.Type);
            fieldGroup.setAttribute('data-table-uuid', uuid);
            fieldGroup.setAttribute('data-table-name', table.name);
            
            // Create invisible background rect for better click/hover detection
            const fieldBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            fieldBg.setAttribute('x', '8');
            fieldBg.setAttribute('y', yPos - 12);
            fieldBg.setAttribute('width', position.Width - 16);
            fieldBg.setAttribute('height', 16);
            fieldBg.setAttribute('fill', 'transparent');
            fieldBg.setAttribute('class', 'field-bg');
            fieldGroup.appendChild(fieldBg);
            
            const fieldText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            fieldText.setAttribute('x', '10');
            fieldText.setAttribute('y', yPos);
            fieldText.setAttribute('class', 'table-field');
            fieldText.setAttribute('pointer-events', 'none'); // Let the background handle events
            
            // For very long field names/types, we still need some truncation
            const fieldDisplay = `${field.Name}: ${field.Type}`;
            const maxChars = Math.floor((position.Width - 20) / 6);
            
            if (fieldDisplay.length > maxChars) {
                fieldText.textContent = fieldDisplay.substring(0, maxChars - 3) + '...';
            } else {
                fieldText.textContent = fieldDisplay;
            }
            
            fieldGroup.appendChild(fieldText);
            
            // Add foreign key creation event handlers
            fieldGroup.addEventListener('mouseenter', (e) => {
                if (NModelViewer.foreignKeys && NModelViewer.foreignKeys.handleFieldHover) {
                    NModelViewer.foreignKeys.handleFieldHover(e, true);
                }
            });
            fieldGroup.addEventListener('mouseleave', (e) => {
                if (NModelViewer.foreignKeys && NModelViewer.foreignKeys.handleFieldHover) {
                    NModelViewer.foreignKeys.handleFieldHover(e, false);
                }
            });
            fieldGroup.addEventListener('mousedown', (e) => {
                if (NModelViewer.foreignKeys && NModelViewer.foreignKeys.handleFieldClick) {
                    NModelViewer.foreignKeys.handleFieldClick(e);
                }
            });
            
            fieldsGroup.appendChild(fieldGroup);
            yPos += 16;
        });
        
        g.appendChild(fieldsGroup);
        
        if (table.fields.length > maxFieldsToShow) {
            const moreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            moreText.setAttribute('x', '10');
            moreText.setAttribute('y', yPos);
            moreText.setAttribute('class', 'table-field');
            moreText.setAttribute('fill', '#666');
            moreText.setAttribute('font-style', 'italic');
            const remaining = table.fields.length - maxFieldsToShow;
            moreText.textContent = `... ${remaining} more field${remaining !== 1 ? 's' : ''}`;
            g.appendChild(moreText);
        }
        
        // Add resize handles
        const handleSize = 8;
        const handles = [
            { class: 'resize-n', x: position.Width/2 - handleSize/2, y: -handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-ne', x: position.Width - handleSize/2, y: -handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-e', x: position.Width - handleSize/2, y: position.Height/2 - handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-se', x: position.Width - handleSize/2, y: position.Height - handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-s', x: position.Width/2 - handleSize/2, y: position.Height - handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-sw', x: -handleSize/2, y: position.Height - handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-w', x: -handleSize/2, y: position.Height/2 - handleSize/2, width: handleSize, height: handleSize },
            { class: 'resize-nw', x: -handleSize/2, y: -handleSize/2, width: handleSize, height: handleSize }
        ];
        
        handles.forEach(handle => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', `resize-handle ${handle.class}`);
            rect.setAttribute('x', handle.x);
            rect.setAttribute('y', handle.y);
            rect.setAttribute('width', handle.width);
            rect.setAttribute('height', handle.height);
            rect.setAttribute('data-resize-type', handle.class.replace('resize-', ''));
            rect.addEventListener('mousedown', (e) => {
                if (NModelViewer.interactions && NModelViewer.interactions.startResize) {
                    NModelViewer.interactions.startResize(e, uuid);
                }
            });
            g.appendChild(rect);
        });
        
        // Add event handlers
        g.addEventListener('mousedown', (e) => {
            // Only start drag if not clicking on a resize handle
            if (!e.target.classList.contains('resize-handle')) {
                if (NModelViewer.interactions && NModelViewer.interactions.startDrag) {
                    NModelViewer.interactions.startDrag(e);
                }
            }
        });
        g.addEventListener('click', (e) => {
            // Only show info if not clicking on a resize handle
            if (!e.target.classList.contains('resize-handle')) {
                this.showTableInfo(uuid, table);
            }
        });
        
        document.getElementById('tables').appendChild(g);
    },
    
    // Show table info
    showTableInfo: function(uuid, table) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        
        let html = `<h4>${table.name}</h4>`;
        html += `<p><strong>Total fields:</strong> ${table.fields.length}</p>`;
        
        if (table.fields && table.fields.length > 0) {
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
            html += '<tr>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Field</th>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Type</th>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Nullable</th>';
            html += '<th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Comment</th>';
            html += '</tr>';
            
            table.fields.forEach(field => {
                html += `<tr>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${field.Name}</td>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${field.Type}${field.Length > 0 ? `(${field.Length})` : ''}</td>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${field.IsNullable ? 'Yes' : 'No'}</td>`;
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${field.Comment || ''}</td>`;
                html += `</tr>`;
            });
            
            html += '</table>';
        } else {
            html += '<p>No field information available for this table.</p>';
        }
        
        infoContent.innerHTML = html;
        infoPanel.style.display = 'block';
    },
    
    // Update debug info
    updateDebugInfo: function() {
        const debugDiv = document.getElementById('debug-info');
        const modelData = NModelViewer.state.modelData;
        const diagramInfo = NModelViewer.state.diagramInfo;
        
        let html = '<strong>Debug Information:</strong><br>';
        html += `Total Objects: ${modelData ? Object.keys(modelData.ObjectJsons).length : 0}<br>`;
        html += `Tables Found: ${Object.keys(NModelViewer.state.tablesMap).length}<br>`;
        html += `Display Objects: ${Object.keys(NModelViewer.state.displayObjectsMap).length}<br>`;
        
        if (diagramInfo.paperSize && diagramInfo.pagesSize) {
            html += `<br><strong>Canvas Info:</strong><br>`;
            html += `Paper Size: ${diagramInfo.paperSize.Width} × ${diagramInfo.paperSize.Height}<br>`;
            html += `Pages: ${diagramInfo.pagesSize.Width} × ${diagramInfo.pagesSize.Height}<br>`;
            html += `Total Size: ${diagramInfo.paperSize.Width * diagramInfo.pagesSize.Width} × ${diagramInfo.paperSize.Height * diagramInfo.pagesSize.Height}<br>`;
        }
        
        debugDiv.innerHTML = html;
    },
    
    // Re-render models (used after changes)
    renderModels: function() {
        if (NModelViewer.state.modelData) {
            NModelViewer.dataModel.parseAndRenderDiagram();
        }
    }
};

// Make functions available globally for backward compatibility
window.renderTable = function(uuid, table, position) { 
    NModelViewer.rendering.renderTable(uuid, table, position); 
};
window.showTableInfo = function(uuid, table) { 
    NModelViewer.rendering.showTableInfo(uuid, table); 
};
window.renderDiagram = function(childObjectUUIDs, layoutInfo) {
    NModelViewer.rendering.renderDiagram(childObjectUUIDs, layoutInfo);
};
window.setupSVGDimensions = function() {
    NModelViewer.rendering.setupSVGDimensions();
};
window.updateDebugInfo = function() {
    NModelViewer.rendering.updateDebugInfo();
};
window.renderModels = function() {
    NModelViewer.rendering.renderModels();
};