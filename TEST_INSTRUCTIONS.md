# Testing Foreign Key Preservation Fix

## Issue Description
When loading an .nmodel file with foreign keys and then saving it, the foreign keys were not being preserved in the saved file.

## Root Cause
The issue was in the `updateModelPositions` function in `data-model.js`. Tables were stored in `tablesMap` using their display UUID, but the code was incorrectly trying to access them using `displayObj.refUUID`.

## Fix Applied
Changed line 408 in `data-model.js` from:
```javascript
const tableSchema = NModelViewer.state.tablesMap[displayObj.refUUID];
```
to:
```javascript
const tableSchema = NModelViewer.state.tablesMap[displayUUID];
```

## Testing Steps

### 1. Basic Test
1. Open `index.html` in a web browser
2. Open the browser's Developer Console (F12)
3. Load the `streaming_chasers.nmodel` file using the file input
4. Look for the "LOAD SUMMARY" in the console - it should show foreign keys loaded
5. Click the "Save Model" button
6. Check the console for "UPDATING EXISTING TABLE" messages showing foreign key preservation
7. Open the downloaded file and verify foreign keys are present

### 2. Using the Test Script
1. Open `index.html` in a web browser
2. Load the `streaming_chasers.nmodel` file
3. Open the browser console and paste the contents of `test-foreign-keys.js`
4. The script will analyze and report on foreign key preservation

### 3. Using the Test HTML Page
1. Open `index.html` in a web browser
2. Load the `streaming_chasers.nmodel` file
3. Open `test-fk-issue.html` in a new tab
4. Click the test buttons in order to verify the fix

## Expected Results
- Foreign keys should be preserved when saving
- The console should show messages like "Updated foreign keys for table X"
- The saved .nmodel file should contain the same foreign keys as the loaded file

## Verification
To verify the fix worked, compare the number of foreign keys in:
1. The original loaded file
2. The tablesMap after loading
3. The saved file after downloading

All three should have the same number of foreign keys.