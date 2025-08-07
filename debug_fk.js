// Debug script to trace foreign key handling
console.log('=== Foreign Key Debug Script ===');

// Store original functions
const originalParse = NModelViewer.dataModel.parseAndRenderDiagram;
const originalSave = NModelViewer.dataModel.saveModel;

// Override parseAndRenderDiagram to add logging
NModelViewer.dataModel.parseAndRenderDiagram = function() {
    console.log('=== PARSING MODEL ===');
    
    // Call original
    originalParse.call(this);
    
    // Log state after parsing
    console.log('\n=== AFTER PARSING ===');
    console.log('tablesMap:', JSON.stringify(NModelViewer.state.tablesMap, null, 2));
    
    // Count foreign keys
    let totalFKs = 0;
    for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
        if (table.foreignKeys && table.foreignKeys.length > 0) {
            console.log(`Table ${table.name} (${uuid}) has ${table.foreignKeys.length} foreign keys`);
            totalFKs += table.foreignKeys.length;
        }
    }
    console.log(`Total foreign keys in tablesMap: ${totalFKs}`);
};

// Override saveModel to add logging
NModelViewer.dataModel.saveModel = function() {
    console.log('\n=== SAVING MODEL ===');
    
    // Check foreign keys before save
    console.log('\n=== FOREIGN KEYS BEFORE SAVE ===');
    for (const [uuid, table] of Object.entries(NModelViewer.state.tablesMap)) {
        if (table.foreignKeys && table.foreignKeys.length > 0) {
            console.log(`Table ${table.name} (${uuid}) foreign keys:`, table.foreignKeys);
        }
    }
    
    // Call original
    originalSave.call(this);
};

console.log('Debug script loaded. Load a file and save it to see the trace.');