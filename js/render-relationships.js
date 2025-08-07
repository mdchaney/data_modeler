// Relationship rendering for NModel Viewer
NModelViewer.relationships = {
    // Render a relationship/foreign key
    renderRelationship: function(uuid, name, relData) {
        if (!relData.vertices || relData.vertices.length < 2) return;
        
        // Get the layout info for this relationship
        const layout = NModelViewer.state.layoutInfo[uuid];
        if (!layout || !layout.rect) {
            console.warn(`No layout found for relationship ${name}`);
            return;
        }
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'relationship-group');
        g.setAttribute('data-uuid', uuid);
        g.setAttribute('data-name', name);
        
        // Create the path based on connector type
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d = '';
        
        // Instead of using vertices, calculate clean elbow paths based on table positions
        if (relData.connectInfos && relData.connectInfos.length >= 2) {
            const table1UUID = relData.connectInfos[0].RefUUID;
            const table2UUID = relData.connectInfos[1].RefUUID;
            
            const table1Layout = NModelViewer.state.layoutInfo[table1UUID];
            const table2Layout = NModelViewer.state.layoutInfo[table2UUID];
            
            if (table1Layout && table2Layout) {
                // Get table positions and sizes
                const sourceX = table1Layout.rect.X;
                const sourceY = table1Layout.rect.Y;
                const targetX = table2Layout.rect.X;
                const targetY = table2Layout.rect.Y;
                
                const center1 = {
                    x: sourceX + table1Layout.rect.Width / 2,
                    y: sourceY + table1Layout.rect.Height / 2
                };
                const center2 = {
                    x: targetX + table2Layout.rect.Width / 2,
                    y: targetY + table2Layout.rect.Height / 2
                };
                
                // Determine the best sides to connect
                const dx = center2.x - center1.x;
                const dy = center2.y - center1.y;
                
                let point1, point2;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal relationship
                    if (dx > 0) {
                        // Source is left of target
                        point1 = { x: sourceX + table1Layout.rect.Width, y: sourceY + table1Layout.rect.Height / 2 };
                        point2 = { x: targetX, y: targetY + table2Layout.rect.Height / 2 };
                    } else {
                        // Source is right of target
                        point1 = { x: sourceX, y: sourceY + table1Layout.rect.Height / 2 };
                        point2 = { x: targetX + table2Layout.rect.Width, y: targetY + table2Layout.rect.Height / 2 };
                    }
                } else {
                    // Vertical relationship
                    if (dy > 0) {
                        // Source is above target
                        point1 = { x: sourceX + table1Layout.rect.Width / 2, y: sourceY + table1Layout.rect.Height };
                        point2 = { x: targetX + table2Layout.rect.Width / 2, y: targetY };
                    } else {
                        // Source is below target
                        point1 = { x: sourceX + table1Layout.rect.Width / 2, y: sourceY };
                        point2 = { x: targetX + table2Layout.rect.Width / 2, y: targetY + table2Layout.rect.Height };
                    }
                }
                
                // Create elbow path
                d = `M ${point1.x} ${point1.y}`;
                
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
            } else {
                // Fallback to vertex-based rendering if table layouts not found
                const offsetX = layout.rect.X;
                const offsetY = layout.rect.Y;
                
                if (relData.connectorCommon && relData.connectorCommon.Type === 'Elbow') {
                    d = NModelViewer.utils.generateElbowPath(relData.vertices, offsetX, offsetY, 
                                        relData.connectorCommon.StartAxis || 'Horizontal');
                } else {
                    d = `M ${offsetX + relData.vertices[0].X} ${offsetY + relData.vertices[0].Y}`;
                    for (let i = 1; i < relData.vertices.length; i++) {
                        d += ` L ${offsetX + relData.vertices[i].X} ${offsetY + relData.vertices[i].Y}`;
                    }
                }
            }
        } else {
            // Fallback for no connection info
            const offsetX = layout.rect.X;
            const offsetY = layout.rect.Y;
            d = `M ${offsetX + relData.vertices[0].X} ${offsetY + relData.vertices[0].Y}`;
            for (let i = 1; i < relData.vertices.length; i++) {
                d += ` L ${offsetX + relData.vertices[i].X} ${offsetY + relData.vertices[i].Y}`;
            }
        }
        
        path.setAttribute('d', d);
        path.setAttribute('class', 'relationship-line');
        path.setAttribute('data-uuid', uuid);
        
        // Add arrow markers based on ArrowCommon
        if (relData.arrowCommon) {
            if (relData.arrowCommon.BeginStyle && relData.arrowCommon.BeginStyle !== 'None') {
                path.setAttribute('marker-start', 'url(#arrowhead-start)');
            }
            if (relData.arrowCommon.EndStyle && relData.arrowCommon.EndStyle !== 'None') {
                path.setAttribute('marker-end', 'url(#arrowhead)');
            }
        }
        
        // Make the line clickable with a wider invisible stroke
        const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        clickPath.setAttribute('d', d);
        clickPath.setAttribute('stroke', 'transparent');
        clickPath.setAttribute('stroke-width', '10');
        clickPath.setAttribute('fill', 'none');
        clickPath.style.cursor = 'pointer';
        
        // Add click handler
        clickPath.addEventListener('click', () => {
            this.showRelationshipInfo(uuid, name, relData);
            // Also select in sidebar
            if (NModelViewer.sidebar) {
                NModelViewer.sidebar.selectObject(uuid, 'foreign-key');
            }
        });
        
        g.appendChild(clickPath);
        g.appendChild(path);
        
        // Debug: show bounding box
        if (NModelViewer.debugMode) {
            const debugRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            debugRect.setAttribute('x', offsetX);
            debugRect.setAttribute('y', offsetY);
            debugRect.setAttribute('width', layout.rect.Width);
            debugRect.setAttribute('height', layout.rect.Height);
            debugRect.setAttribute('fill', 'none');
            debugRect.setAttribute('stroke', 'red');
            debugRect.setAttribute('stroke-width', '1');
            debugRect.setAttribute('stroke-dasharray', '5,5');
            g.appendChild(debugRect);
        }
        
        document.getElementById('relationships').appendChild(g);
    },
    
    // Show relationship info
    showRelationshipInfo: function(uuid, name, relData) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        
        let html = `<h4>Relationship: ${name}</h4>`;
        html += `<p><strong>UUID:</strong> ${uuid}</p>`;
        
        if (relData.connectInfos && relData.connectInfos.length > 0) {
            html += '<p><strong>Connections:</strong></p>';
            html += '<ul>';
            relData.connectInfos.forEach((conn, idx) => {
                const tableObj = NModelViewer.state.displayObjectsMap[conn.RefUUID];
                const tableName = tableObj ? tableObj.name : 'Unknown';
                html += `<li>Connection ${idx + 1}: ${tableName} (UUID: ${conn.RefUUID}, Index: ${conn.Index})</li>`;
            });
            html += '</ul>';
        }
        
        if (relData.connectorCommon) {
            html += `<p><strong>Connector Type:</strong> ${relData.connectorCommon.Type || 'Unknown'}</p>`;
            html += `<p><strong>Start Axis:</strong> ${relData.connectorCommon.StartAxis || 'Unknown'}</p>`;
        }
        
        if (relData.arrowCommon) {
            html += `<p><strong>Arrow Style:</strong> Begin: ${relData.arrowCommon.BeginStyle || 'None'}, End: ${relData.arrowCommon.EndStyle || 'None'}</p>`;
        }
        
        infoContent.innerHTML = html;
        infoPanel.style.display = 'block';
    },
    
    // Update relationship positions when tables move
    updateRelationshipPositions: function(tableUUID) {
        const relationships = NModelViewer.state.tableRelationships[tableUUID];
        if (!relationships) return;
        
        relationships.forEach(relUUID => {
            const relData = NModelViewer.state.relationshipsMap[relUUID];
            if (relData && relData.data) {
                // Get connected tables
                const connectedTables = relData.data.connectInfos.map(conn => {
                    const tableEl = document.querySelector(`[data-uuid="${conn.RefUUID}"]`);
                    if (tableEl) {
                        const transform = tableEl.getAttribute('transform');
                        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                        if (match) {
                            const layout = NModelViewer.state.layoutInfo[conn.RefUUID];
                            return {
                                uuid: conn.RefUUID,
                                x: parseFloat(match[1]),
                                y: parseFloat(match[2]),
                                width: layout ? layout.rect.Width : 100,
                                height: layout ? layout.rect.Height : 100,
                                side: conn.Index
                            };
                        }
                    }
                    return null;
                }).filter(t => t !== null);
                
                if (connectedTables.length >= 2) {
                    // Calculate new vertices based on table positions
                    const source = connectedTables[0];
                    const target = connectedTables[1];
                    
                    // Calculate connection points
                    const sourcePoint = NModelViewer.utils.getConnectionPoint(
                        { x: source.x, y: source.y, width: source.width, height: source.height },
                        source.side
                    );
                    const targetPoint = NModelViewer.utils.getConnectionPoint(
                        { x: target.x, y: target.y, width: target.width, height: target.height },
                        target.side
                    );
                    
                    // Update the relationship position
                    const minX = Math.min(sourcePoint.x, targetPoint.x) - 50;
                    const minY = Math.min(sourcePoint.y, targetPoint.y) - 50;
                    const maxX = Math.max(sourcePoint.x, targetPoint.x) + 50;
                    const maxY = Math.max(sourcePoint.y, targetPoint.y) + 50;
                    
                    // Update layout info
                    if (NModelViewer.state.layoutInfo[relUUID]) {
                        NModelViewer.state.layoutInfo[relUUID].rect = {
                            X: minX,
                            Y: minY,
                            Width: maxX - minX,
                            Height: maxY - minY
                        };
                    }
                    
                    // Update vertices relative to the new bounding box
                    relData.data.vertices = [
                        { X: sourcePoint.x - minX, Y: sourcePoint.y - minY },
                        { X: targetPoint.x - minX, Y: targetPoint.y - minY }
                    ];
                    
                    // Re-render this relationship
                    const relElement = document.querySelector(`[data-uuid="${relUUID}"]`);
                    if (relElement && relElement.parentNode) {
                        relElement.parentNode.removeChild(relElement);
                    }
                    this.renderRelationship(relUUID, relData.name, relData.data);
                }
            }
        });
    }
};

// Make functions available globally for backward compatibility
window.renderRelationship = function(uuid, name, relData) {
    NModelViewer.relationships.renderRelationship(uuid, name, relData);
};
window.showRelationshipInfo = function(uuid, name, relData) {
    NModelViewer.relationships.showRelationshipInfo(uuid, name, relData);
};