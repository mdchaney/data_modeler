// Utility functions for NModel Viewer
NModelViewer.utils = {
    // Generate a UUID v4
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    },
    
    // Generate elbow connector path
    generateElbowPath: function(vertices, offsetX, offsetY, startAxis) {
        if (vertices.length < 2) return '';
        
        // Convert control points to absolute positions
        const points = vertices.map(v => ({
            x: offsetX + v.X,
            y: offsetY + v.Y
        }));
        
        // Start with the first point
        let path = `M ${points[0].x} ${points[0].y}`;
        
        // For elbow connectors, we need to create horizontal/vertical segments
        // that pass through each control point
        let isHorizontal = startAxis === 'Horizontal';
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            if (isHorizontal) {
                // Move horizontally to the x coordinate of the current point
                path += ` L ${curr.x} ${prev.y}`;
                // Then move vertically to reach the current point
                if (prev.y !== curr.y) {
                    path += ` L ${curr.x} ${curr.y}`;
                }
            } else {
                // Move vertically to the y coordinate of the current point
                path += ` L ${prev.x} ${curr.y}`;
                // Then move horizontally to reach the current point
                if (prev.x !== curr.x) {
                    path += ` L ${curr.x} ${prev.y}`;
                }
            }
            
            // Toggle direction for next segment
            isHorizontal = !isHorizontal;
        }
        
        return path;
    },
    
    // Calculate connection point for a given side of a rectangle
    getConnectionPoint: function(rect, side) {
        const x = rect.X || rect.x || 0;
        const y = rect.Y || rect.y || 0;
        const width = rect.Width || rect.width || 100;
        const height = rect.Height || rect.height || 100;
        
        switch(side) {
            case 0: // Top
                return { x: x + width / 2, y: y };
            case 1: // Right
                return { x: x + width, y: y + height / 2 };
            case 2: // Bottom
                return { x: x + width / 2, y: y + height };
            case 3: // Left
                return { x: x, y: y + height / 2 };
            default:
                return { x: x + width / 2, y: y + height / 2 }; // Center
        }
    },
    
    // Calculate which side of a rectangle a point is closest to
    calculateSideAndOffset: function(rect, point) {
        const x = rect.X || rect.x || 0;
        const y = rect.Y || rect.y || 0;
        const width = rect.Width || rect.width || 100;
        const height = rect.Height || rect.height || 100;
        
        // Calculate distances to each side
        const distances = [
            Math.abs(point.y - y),           // Top
            Math.abs(point.x - (x + width)), // Right
            Math.abs(point.y - (y + height)), // Bottom
            Math.abs(point.x - x)            // Left
        ];
        
        // Find the closest side
        let minDistance = distances[0];
        let closestSide = 0;
        
        for (let i = 1; i < distances.length; i++) {
            if (distances[i] < minDistance) {
                minDistance = distances[i];
                closestSide = i;
            }
        }
        
        return closestSide;
    }
};

// Make utility functions available globally for backward compatibility
window.generateUUID = NModelViewer.utils.generateUUID;
window.generateElbowPath = NModelViewer.utils.generateElbowPath;