// Data model handling for NModel Viewer
NModelViewer.dataModel = {
    // Load file from input
    loadFile: function() {
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                NModelViewer.state.modelData = JSON.parse(e.target.result);
                this.parseAndRenderDiagram();
            } catch (error) {
                alert('Error parsing file: ' + error.message);
                console.error(error);
            }
        };
        reader.readAsText(file);
    },
    
    // Parse and render the diagram
    parseAndRenderDiagram: function() {
        const modelData = NModelViewer.state.modelData;
        if (!modelData || !modelData.ObjectJsons) return;
        
        // Clear previous data
        NModelViewer.state.tablesMap = {};
        NModelViewer.state.displayObjectsMap = {};
        NModelViewer.state.diagramInfo = {};
        NModelViewer.state.layoutInfo = {};
        NModelViewer.state.relationshipsMap = {};
        NModelViewer.state.tableRelationships = {};
        
        // Find the MVDiagram object
        let mvDiagramUUID = null;
        let mvDiagramData = null;
        
        for (const [uuid, objects] of Object.entries(modelData.ObjectJsons)) {
            if (Array.isArray(objects)) {
                const metaObj = objects.find(obj => obj._META_ && obj.ObjectTypeID === 'MVDiagram');
                if (metaObj) {
                    mvDiagramUUID = uuid;
                    mvDiagramData = objects;
                    break;
                }
            }
        }
        
        if (!mvDiagramUUID) {
            alert('No MVDiagram found in the file');
            return;
        }
        
        // Extract diagram info (pages, layout, etc.)
        for (const obj of mvDiagramData) {
            if (obj.PaperSize) {
                NModelViewer.state.diagramInfo.paperSize = obj.PaperSize;
            }
            if (obj.PagesSize) {
                NModelViewer.state.diagramInfo.pagesSize = obj.PagesSize;
            }
        }
        
        // Get list of child objects to display
        const childObjectUUIDs = mvDiagramData.find(obj => obj._META_)?.ChildObjectUUIDs || [];
        console.log('MVDiagram UUID:', mvDiagramUUID);
        console.log('Child UUIDs count:', childObjectUUIDs.length);
        
        // Parse all objects first to build our maps
        for (const [uuid, objects] of Object.entries(modelData.ObjectJsons)) {
            if (Array.isArray(objects)) {
                const metaObj = objects.find(obj => obj._META_);
                if (!metaObj) continue;
                
                // Check if it's a table schema
                if (metaObj.ObjectTypeID === 'TableNormal_PGSQL') {
                    const tableData = objects.find(obj => obj.TableCommon);
                    if (tableData) {
                        NModelViewer.state.tablesMap[uuid] = {
                            name: metaObj.ObjectName,
                            fields: tableData.TableCommon.Fields || [],
                            foreignKeys: tableData.TableCommon.ForeignKeys || []
                        };
                    }
                }
                
                // Check if it's a display object for a table
                if (metaObj.ObjectTypeID === 'MVDiagramModelObject_Table') {
                    const refObj = objects.find(obj => obj.RefUUID);
                    if (refObj) {
                        NModelViewer.state.displayObjectsMap[uuid] = {
                            name: metaObj.ObjectName,
                            refUUID: refObj.RefUUID,
                            uuid: uuid
                        };
                        console.log(`Found display object: ${metaObj.ObjectName} (${uuid}) -> ${refObj.RefUUID}`);
                    }
                }
            }
        }
        
        // Extract layout information from MVDiagram
        console.log('mvDiagramData structure:', mvDiagramData);
        
        // The layout info should be in one of the objects
        for (let i = 0; i < mvDiagramData.length; i++) {
            const obj = mvDiagramData[i];
            if (obj && typeof obj === 'object') {
                console.log(`mvDiagramData[${i}] keys:`, Object.keys(obj));
                
                // Check if this object has a property that's an array
                for (const [key, value] of Object.entries(obj)) {
                    if (Array.isArray(value) && value.length > 0) {
                        console.log(`  Found array property '${key}' with ${value.length} items`);
                        // Check first item to see if it has layout properties
                        if (value[0] && typeof value[0] === 'object') {
                            console.log(`    First item keys:`, Object.keys(value[0]));
                            if (value[0].RefUUID && value[0].Rect) {
                                console.log(`    This looks like layout data!`);
                                // Extract layout info
                                value.forEach(item => {
                                    if (item.RefUUID && item.Rect) {
                                        NModelViewer.state.layoutInfo[item.RefUUID] = {
                                            name: item.Name,
                                            rect: item.Rect
                                        };
                                    }
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        console.log('Layout info extracted:', Object.keys(NModelViewer.state.layoutInfo).length, 'items');
        
        // Set up the SVG dimensions
        if (NModelViewer.rendering && NModelViewer.rendering.setupSVGDimensions) {
            NModelViewer.rendering.setupSVGDimensions();
        }
        
        // Render the diagram
        if (NModelViewer.rendering && NModelViewer.rendering.renderDiagram) {
            NModelViewer.rendering.renderDiagram(childObjectUUIDs, NModelViewer.state.layoutInfo);
        }
        
        // Update debug info
        if (NModelViewer.rendering && NModelViewer.rendering.updateDebugInfo) {
            NModelViewer.rendering.updateDebugInfo();
        }
    },
    
    // Find relationship data in the model
    findRelationshipData: function(uuid) {
        const modelData = NModelViewer.state.modelData;
        if (!modelData) return null;
        
        // Look for the relationship object in the model data
        const objects = modelData.ObjectJsons[uuid];
        if (!objects) return null;
        
        // Find the object with LineCommon (contains vertices)
        for (const obj of objects) {
            if (obj.LineCommon && obj.LineCommon.Vertices) {
                return {
                    vertices: obj.LineCommon.Vertices,
                    connectInfos: obj.LineCommon.ConnectInfos || [],
                    relationCommon: obj.RelationCommon || {},
                    connectorCommon: obj.ConnectorCommon || {},
                    arrowCommon: obj.ArrowCommon || {}
                };
            }
        }
        return null;
    }
};

// Make functions available globally for backward compatibility
window.loadFile = function() { NModelViewer.dataModel.loadFile(); };
window.parseAndRenderDiagram = function() { NModelViewer.dataModel.parseAndRenderDiagram(); };
window.findRelationshipData = function(uuid) { return NModelViewer.dataModel.findRelationshipData(uuid); };
window.modelData = null; // This will be updated by reference