// Test script to verify foreign key loading and saving
// Run this in the browser console to test the issue

function testForeignKeys() {
    console.log('=== FOREIGN KEY TEST START ===');
    
    // 1. Check loaded data
    console.log('\n1. CHECKING LOADED DATA:');
    console.log('Tables in tablesMap:', Object.keys(NModelViewer.state.tablesMap).length);
    
    // Count foreign keys in tablesMap
    let totalFKsInTablesMap = 0;
    for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
        if (table.foreignKeys && table.foreignKeys.length > 0) {
            console.log(`Table ${table.name} (${uuid}) has ${table.foreignKeys.length} foreign keys:`, table.foreignKeys);
            totalFKsInTablesMap += table.foreignKeys.length;
        }
    }
    console.log(`Total foreign keys in tablesMap: ${totalFKsInTablesMap}`);
    
    // 2. Check display objects mapping
    console.log('\n2. CHECKING DISPLAY OBJECTS MAPPING:');
    for (const [displayUUID, displayObj] of Object.entries(NModelViewer.state.displayObjectsMap)) {
        if (!displayObj.name.startsWith('fk_')) {
            const tableInTablesMap = NModelViewer.state.tablesMap[displayUUID];
            console.log(`Display object ${displayObj.name}:`);
            console.log(`  - Display UUID: ${displayUUID}`);
            console.log(`  - Ref UUID: ${displayObj.refUUID}`);
            console.log(`  - Table in tablesMap: ${tableInTablesMap ? 'YES' : 'NO'}`);
            if (tableInTablesMap && tableInTablesMap.foreignKeys && tableInTablesMap.foreignKeys.length > 0) {
                console.log(`  - Foreign keys: ${tableInTablesMap.foreignKeys.length}`);
            }
        }
    }
    
    // 3. Check model data before save
    console.log('\n3. CHECKING MODEL DATA BEFORE SAVE:');
    let totalFKsInModel = 0;
    for (const [uuid, objects] of Object.entries(NModelViewer.state.modelData.ObjectJsons)) {
        if (Array.isArray(objects)) {
            const metaObj = objects.find(obj => obj._META_);
            const tableCommon = objects.find(obj => obj.TableCommon);
            if (metaObj && metaObj.ObjectTypeID === 'TableNormal_PGSQL' && tableCommon) {
                if (tableCommon.TableCommon.ForeignKeys && tableCommon.TableCommon.ForeignKeys.length > 0) {
                    console.log(`Table ${metaObj.ObjectName} at UUID ${uuid} has ${tableCommon.TableCommon.ForeignKeys.length} foreign keys`);
                    totalFKsInModel += tableCommon.TableCommon.ForeignKeys.length;
                }
            }
        }
    }
    console.log(`Total foreign keys in model: ${totalFKsInModel}`);
    
    // 4. Simulate save process
    console.log('\n4. SIMULATING SAVE PROCESS:');
    
    // Create a copy of the model data to avoid modifying the original
    const testModelData = JSON.parse(JSON.stringify(NModelViewer.state.modelData));
    
    // Simulate the updateModelPositions logic
    for (const [displayUUID, displayObj] of Object.entries(NModelViewer.state.displayObjectsMap)) {
        const tableSchema = NModelViewer.state.tablesMap[displayUUID];
        
        if (tableSchema) {
            console.log(`\nProcessing table ${tableSchema.name}:`);
            console.log(`  - Display UUID: ${displayUUID}`);
            console.log(`  - Ref UUID: ${displayObj.refUUID}`);
            console.log(`  - Foreign keys in tablesMap: ${tableSchema.foreignKeys ? tableSchema.foreignKeys.length : 0}`);
            
            // Check if table exists in model at ref UUID
            const tableExists = testModelData.ObjectJsons[displayObj.refUUID] ? true : false;
            console.log(`  - Table exists at refUUID: ${tableExists}`);
            
            if (tableExists) {
                const tableObjects = testModelData.ObjectJsons[displayObj.refUUID];
                const tableCommonObj = tableObjects.find(obj => obj.TableCommon);
                if (tableCommonObj) {
                    console.log(`  - Current FKs in model: ${tableCommonObj.TableCommon.ForeignKeys ? tableCommonObj.TableCommon.ForeignKeys.length : 0}`);
                    
                    // Update foreign keys
                    if (tableSchema.foreignKeys && tableSchema.foreignKeys.length > 0) {
                        tableCommonObj.TableCommon.ForeignKeys = [...tableSchema.foreignKeys];
                        console.log(`  - Updated FKs in model: ${tableCommonObj.TableCommon.ForeignKeys.length}`);
                    }
                }
            }
        }
    }
    
    // Count foreign keys after simulated save
    console.log('\n5. CHECKING MODEL DATA AFTER SIMULATED SAVE:');
    let totalFKsAfterSave = 0;
    for (const [uuid, objects] of Object.entries(testModelData.ObjectJsons)) {
        if (Array.isArray(objects)) {
            const metaObj = objects.find(obj => obj._META_);
            const tableCommon = objects.find(obj => obj.TableCommon);
            if (metaObj && metaObj.ObjectTypeID === 'TableNormal_PGSQL' && tableCommon) {
                if (tableCommon.TableCommon.ForeignKeys && tableCommon.TableCommon.ForeignKeys.length > 0) {
                    console.log(`Table ${metaObj.ObjectName} at UUID ${uuid} has ${tableCommon.TableCommon.ForeignKeys.length} foreign keys`);
                    totalFKsAfterSave += tableCommon.TableCommon.ForeignKeys.length;
                }
            }
        }
    }
    console.log(`Total foreign keys after simulated save: ${totalFKsAfterSave}`);
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Foreign keys in tablesMap: ${totalFKsInTablesMap}`);
    console.log(`Foreign keys in original model: ${totalFKsInModel}`);
    console.log(`Foreign keys after simulated save: ${totalFKsAfterSave}`);
    console.log(`Foreign keys lost: ${totalFKsInModel - totalFKsAfterSave}`);
    
    console.log('\n=== FOREIGN KEY TEST END ===');
}

// Run the test
testForeignKeys();