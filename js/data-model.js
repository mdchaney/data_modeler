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
        
        NModelViewer.state.mvDiagramUUID = mvDiagramUUID;
        
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
        
        // First pass: Build display objects map
        for (const childUUID of childObjectUUIDs) {
            const childObjects = modelData.ObjectJsons[childUUID];
            if (!childObjects || !Array.isArray(childObjects)) continue;
            
            const metaObj = childObjects.find(obj => obj._META_);
            if (!metaObj) continue;
            
            // Store display objects
            if (metaObj.ObjectTypeID === 'MVDiagramModelObject_Table' || 
                metaObj.ObjectTypeID === 'MVDiagramShape_Table') {
                const refObj = childObjects.find(obj => obj.RefUUID);
                if (refObj && refObj.RefUUID) {
                    NModelViewer.state.displayObjectsMap[childUUID] = {
                        name: metaObj.ObjectName,
                        refUUID: refObj.RefUUID,
                        type: 'table'
                    };
                }
            } else if (metaObj.ObjectTypeID === 'MVDiagramShape_Relation' || 
                       metaObj.ObjectTypeID === 'MVDiagramModelObject_Relation') {
                // Store relationship display objects
                NModelViewer.state.displayObjectsMap[childUUID] = {
                    name: metaObj.ObjectName,
                    type: 'relation'
                };
            }
        }
        
        // Second pass: Load actual table schemas and map them correctly
        for (const [displayUUID, displayObj] of Object.entries(NModelViewer.state.displayObjectsMap)) {
            if (displayObj.type === 'table') {
                const tableObjects = modelData.ObjectJsons[displayObj.refUUID];
                if (!tableObjects || !Array.isArray(tableObjects)) continue;
                
                const metaObj = tableObjects.find(obj => obj._META_);
                const tableData = tableObjects.find(obj => obj.TableCommon);
                
                if (metaObj && tableData) {
                    const tableInfo = {
                        name: metaObj.ObjectName,
                        uuid: displayObj.refUUID,
                        displayUUID: displayUUID,
                        fields: tableData.TableCommon.Fields || [],
                        foreignKeys: tableData.TableCommon.ForeignKeys || []
                    };
                    
                    // Store table by display UUID for rendering
                    NModelViewer.state.tablesMap[displayUUID] = tableInfo;
                }
            }
        }
        
        // Extract layout information from MVDiagram
        for (let i = 0; i < mvDiagramData.length; i++) {
            const obj = mvDiagramData[i];
            if (obj && typeof obj === 'object' && !obj._META_) {
                // Check if this object has an array property with layout data
                for (const [key, value] of Object.entries(obj)) {
                    if (Array.isArray(value) && value.length > 0) {
                        // Check first item to see if it has layout properties
                        if (value[0] && typeof value[0] === 'object' && value[0].RefUUID && value[0].Rect) {
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
        
        // Log foreign key summary
        let totalFKs = 0;
        let tablesWithFKs = 0;
        for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
            if (table.foreignKeys && table.foreignKeys.length > 0) {
                totalFKs += table.foreignKeys.length;
                tablesWithFKs++;
            }
        }
        console.log(`=== LOAD COMPLETE ===`);
        console.log(`Loaded ${Object.keys(NModelViewer.state.tablesMap).length} tables`);
        console.log(`${tablesWithFKs} tables have foreign keys (${totalFKs} total FKs)`);
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
    },
    
    // Save the current model to a file
    saveModel: function() {
        console.log('=== SAVING MODEL ===');
        
        if (!NModelViewer.state.modelData) {
            // Create a minimal model structure if starting from scratch
            NModelViewer.state.modelData = {
                ObjectJsons: {},
                MVDiagramData: {}
            };
            
            // Create a diagram UUID and basic structure
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
            
            // Store diagram UUID for reference
            NModelViewer.state.mvDiagramUUID = diagramUUID;
        }
        
        // Update positions in the model data
        this.updateModelPositions();
        
        // Convert to JSON and trigger download
        const jsonString = JSON.stringify(NModelViewer.state.modelData, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_model.nmodel';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('=== SAVE COMPLETE ===');
    },
    
    // Update model data with current positions
    updateModelPositions: function() {
        const modelData = NModelViewer.state.modelData;
        if (!modelData) return;
        
        // Find the MVDiagram
        let mvDiagramUUID = NModelViewer.state.mvDiagramUUID;
        let mvDiagramData = null;
        
        if (!mvDiagramUUID) {
            // Find it in the model data
            for (const [uuid, objects] of Object.entries(modelData.ObjectJsons)) {
                if (Array.isArray(objects)) {
                    const metaObj = objects.find(obj => obj._META_ && obj.ObjectTypeID === 'MVDiagram');
                    if (metaObj) {
                        mvDiagramUUID = uuid;
                        mvDiagramData = objects;
                        NModelViewer.state.mvDiagramUUID = uuid;
                        break;
                    }
                }
            }
        } else {
            mvDiagramData = modelData.ObjectJsons[mvDiagramUUID];
        }
        
        if (!mvDiagramData) return;
        
        // Update page sizes in diagram data
        for (const obj of mvDiagramData) {
            if (obj.PaperSize) {
                obj.PaperSize = NModelViewer.state.diagramInfo.paperSize;
            }
            if (obj.PagesSize) {
                obj.PagesSize = NModelViewer.state.diagramInfo.pagesSize;
            }
        }
        
        // Find or create the layout array
        let layoutArray = null;
        let layoutArrayIndex = -1;
        let layoutKey = null;
        
        for (let i = 0; i < mvDiagramData.length; i++) {
            const obj = mvDiagramData[i];
            if (obj && typeof obj === 'object' && !obj._META_) {
                // Check if this object has an array property with layout data
                for (const [key, value] of Object.entries(obj)) {
                    if (Array.isArray(value) && value.length > 0 && value[0] && value[0].RefUUID && value[0].Rect) {
                        layoutArray = value;
                        layoutArrayIndex = i;
                        layoutKey = key;
                        break;
                    }
                }
                if (layoutArray) break;
            }
        }
        
        // If no layout array found, create one
        if (!layoutArray) {
            layoutArray = [];
            layoutKey = Object.keys(mvDiagramData[mvDiagramData.length - 1] || {})[0] || "Layouts";
            mvDiagramData.push({ [layoutKey]: layoutArray });
        }
        
        // Clear existing layout data
        layoutArray.length = 0;
        
        // Add current layout information for all display objects
        for (const [uuid, layout] of Object.entries(NModelViewer.state.layoutInfo)) {
            // Get current position from DOM if the element exists
            const element = document.querySelector(`g[data-uuid="${uuid}"]`);
            if (element) {
                const transform = element.getAttribute('transform');
                const match = transform ? transform.match(/translate\(([^,]+),\s*([^)]+)\)/) : null;
                if (match) {
                    layout.rect.X = parseFloat(match[1]);
                    layout.rect.Y = parseFloat(match[2]);
                }
            }
            
            layoutArray.push({
                RefUUID: uuid,
                Name: layout.name,
                Rect: layout.rect
            });
        }
        
        // Update child object UUIDs in the diagram
        const metaObj = mvDiagramData.find(obj => obj._META_);
        if (metaObj) {
            // Include both display objects and relationships
            const allChildUUIDs = [
                ...Object.keys(NModelViewer.state.displayObjectsMap),
                ...Object.keys(NModelViewer.state.relationshipsMap)
            ];
            // Remove duplicates
            metaObj.ChildObjectUUIDs = [...new Set(allChildUUIDs)];
        }
        
        // Now update all table data with current state
        for (const [displayUUID, tableInfo] of Object.entries(NModelViewer.state.tablesMap)) {
            // Check if this table has a display object
            const displayObj = NModelViewer.state.displayObjectsMap[displayUUID];
            if (!displayObj) continue;
            
            const tableUUID = tableInfo.uuid || displayObj.refUUID;
            
            // Create display object if it doesn't exist
            if (!modelData.ObjectJsons[displayUUID]) {
                modelData.ObjectJsons[displayUUID] = [
                    {
                        "_META_": true,
                        "_VERSION_": "",
                        "ObjectName": tableInfo.name,
                        "ObjectTypeID": "MVDiagramModelObject_Table",
                        "ObjectTypeDisplayName": "MVDiagramModelObject_Table",
                        "ObjectVersion": "17.0.0001"
                    },
                    {
                        "RefUUID": tableUUID
                    }
                ];
            }
            
            // Create or update table schema
            if (!modelData.ObjectJsons[tableUUID]) {
                // Create new table schema
                modelData.ObjectJsons[tableUUID] = [
                    {
                        "_META_": true,
                        "_VERSION_": "",
                        "ObjectName": tableInfo.name,
                        "ObjectTypeID": "TableNormal_PGSQL",
                        "ObjectTypeDisplayName": "TableNormal_PGSQL",
                        "ObjectVersion": "17.0.0001"
                    },
                    {
                        "TableCommon": {
                            "Fields": tableInfo.fields.map((field, index) => ({
                                "Name": field.Name || field.name,
                                "Type": field.Type || field.type,
                                "IsNull": field.IsNull || field.isNull || (field.nullable === false ? "NO" : "YES"),
                                "IsPrimary": field.IsPrimary || field.isPrimary || false,
                                "OrderNum": field.OrderNum || field.orderNum || index
                            })),
                            "ForeignKeys": tableInfo.foreignKeys || [],
                            "Indexes": [],
                            "Triggers": [],
                            "Checks": [],
                            "Uniques": [],
                            "Excludes": [],
                            "Rules": []
                        }
                    }
                ];
            } else {
                // Update existing table schema
                const tableObjects = modelData.ObjectJsons[tableUUID];
                const tableCommonObj = tableObjects.find(obj => obj.TableCommon);
                if (tableCommonObj) {
                    // Update fields
                    tableCommonObj.TableCommon.Fields = tableInfo.fields.map((field, index) => ({
                        "Name": field.Name || field.name,
                        "Type": field.Type || field.type,
                        "IsNull": field.IsNull || field.isNull || (field.nullable === false ? "NO" : "YES"),
                        "IsPrimary": field.IsPrimary || field.isPrimary || false,
                        "OrderNum": field.OrderNum || field.orderNum || index
                    }));
                    
                    // Update foreign keys - this is the critical part
                    tableCommonObj.TableCommon.ForeignKeys = tableInfo.foreignKeys || [];
                    
                    // Preserve other properties if they don't exist
                    if (!tableCommonObj.TableCommon.Indexes) tableCommonObj.TableCommon.Indexes = [];
                    if (!tableCommonObj.TableCommon.Triggers) tableCommonObj.TableCommon.Triggers = [];
                    if (!tableCommonObj.TableCommon.Checks) tableCommonObj.TableCommon.Checks = [];
                    if (!tableCommonObj.TableCommon.Uniques) tableCommonObj.TableCommon.Uniques = [];
                    if (!tableCommonObj.TableCommon.Excludes) tableCommonObj.TableCommon.Excludes = [];
                    if (!tableCommonObj.TableCommon.Rules) tableCommonObj.TableCommon.Rules = [];
                }
            }
        }
        
        // Add relationship objects
        for (const [displayUUID, relData] of Object.entries(NModelViewer.state.relationshipsMap)) {
            if (!modelData.ObjectJsons[displayUUID]) {
                // Create the relationship object in the model
                modelData.ObjectJsons[displayUUID] = [
                    {
                        "_META_": true,
                        "_VERSION_": "",
                        "ObjectName": relData.name,
                        "ObjectTypeID": "MVDiagramShape_Relation",
                        "ObjectTypeDisplayName": "MVDiagramShape_Relation",
                        "ObjectVersion": "17.0.0000"
                    },
                    {
                        "LineCommon": {
                            "Vertices": relData.data.vertices || [],
                            "ConnectInfos": relData.data.connectInfos || []
                        }
                    },
                    {
                        "ConnectorCommon": relData.data.connectorCommon || {
                            "Type": "Elbow",
                            "StartAxis": "Horizontal"
                        }
                    },
                    {
                        "ArrowCommon": relData.data.arrowCommon || {
                            "BeginStyle": "None",
                            "EndStyle": "None"
                        }
                    }
                ];
            }
        }
        
        // Final verification
        let totalFKsSaved = 0;
        for (const [uuid, objects] of Object.entries(modelData.ObjectJsons)) {
            if (Array.isArray(objects)) {
                const tableCommon = objects.find(obj => obj.TableCommon);
                if (tableCommon && tableCommon.TableCommon.ForeignKeys && tableCommon.TableCommon.ForeignKeys.length > 0) {
                    totalFKsSaved += tableCommon.TableCommon.ForeignKeys.length;
                }
            }
        }
        console.log(`Total foreign keys in saved model: ${totalFKsSaved}`);
    }
};

// Make functions available globally for backward compatibility
window.loadFile = function() { NModelViewer.dataModel.loadFile(); };
window.saveModel = function() { NModelViewer.dataModel.saveModel(); };
window.parseAndRenderDiagram = function() { NModelViewer.dataModel.parseAndRenderDiagram(); };
window.findRelationshipData = function(uuid) { return NModelViewer.dataModel.findRelationshipData(uuid); };
window.modelData = null; // This will be updated by reference