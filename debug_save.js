// Debug script to trace the save process
console.log('=== Save Debug Script Loaded ===');

// Override the updateModelPositions to add detailed logging
const originalUpdate = NModelViewer.dataModel.updateModelPositions;

NModelViewer.dataModel.updateModelPositions = function() {
    console.log('\n=== UPDATE MODEL POSITIONS CALLED ===');
    
    // Log current state
    console.log('\nCurrent state:');
    console.log('- tablesMap entries:', Object.entries(NModelViewer.state.tablesMap).length);
    console.log('- displayObjectsMap entries:', Object.entries(NModelViewer.state.displayObjectsMap).length);
    
    // Log each table in tablesMap
    console.log('\nTables in tablesMap:');
    for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
        console.log(`\n  UUID: ${uuid}`);
        console.log(`  Name: ${table.name}`);
        console.log(`  Foreign Keys: ${table.foreignKeys ? table.foreignKeys.length : 0}`);
        if (table.foreignKeys && table.foreignKeys.length > 0) {
            console.log('  FK Details:', JSON.stringify(table.foreignKeys, null, 2));
        }
    }
    
    // Log display objects
    console.log('\nDisplay objects:');
    for (const [uuid, obj] of Object.entries(NModelViewer.state.displayObjectsMap)) {
        console.log(`\n  Display UUID: ${uuid}`);
        console.log(`  Name: ${obj.name}`);
        console.log(`  Ref UUID: ${obj.refUUID}`);
    }
    
    // Call the original function
    originalUpdate.call(this);
    
    // Log what ended up in the model
    console.log('\n=== AFTER UPDATE MODEL POSITIONS ===');
    if (NModelViewer.state.modelData) {
        let totalFKs = 0;
        for (const [uuid, objects] of Object.entries(NModelViewer.state.modelData.ObjectJsons)) {
            if (Array.isArray(objects)) {
                const tableCommon = objects.find(obj => obj.TableCommon);
                if (tableCommon && tableCommon.TableCommon.ForeignKeys && tableCommon.TableCommon.ForeignKeys.length > 0) {
                    console.log(`\nTable at ${uuid}:`);
                    const meta = objects.find(obj => obj._META_);
                    if (meta) console.log(`  Name: ${meta.ObjectName}`);
                    console.log(`  Foreign Keys: ${tableCommon.TableCommon.ForeignKeys.length}`);
                    console.log('  FK Details:', JSON.stringify(tableCommon.TableCommon.ForeignKeys, null, 2));
                    totalFKs += tableCommon.TableCommon.ForeignKeys.length;
                }
            }
        }
        console.log(`\nTotal foreign keys in model: ${totalFKs}`);
    }
};

console.log('To use: Load a model with foreign keys, then save it.');
console.log('Watch the console for detailed trace information.');