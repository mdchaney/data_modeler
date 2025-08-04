// Export functionality for NModel Viewer
NModelViewer.export = {
    // Export diagram as SVG
    exportSVG: function() {
        const svg = document.getElementById('diagram');
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        this.downloadFile(blob, 'diagram.svg');
    },
    
    // Export diagram as PNG
    exportPNG: function() {
        const svg = document.getElementById('diagram');
        const svgData = new XMLSerializer().serializeToString(svg);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = svg.getAttribute('width');
            canvas.height = svg.getAttribute('height');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                NModelViewer.export.downloadFile(blob, 'diagram.png');
            });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    },
    
    // Download file helper
    downloadFile: function(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Make functions available globally for backward compatibility
window.exportSVG = function() { NModelViewer.export.exportSVG(); };
window.exportPNG = function() { NModelViewer.export.exportPNG(); };
window.downloadFile = function(blob, filename) { NModelViewer.export.downloadFile(blob, filename); };