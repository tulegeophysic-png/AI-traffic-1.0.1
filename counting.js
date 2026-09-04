import { canvas, ctx, lineConfig, latestDetections, getCountingLineEnabled, getDraggingLine } from './main.js';

export function drawScene(vehicles) {
    if (getCountingLineEnabled()) {
        const lineY = lineConfig.positionRatio * canvas.height;
        ctx.strokeStyle = getDraggingLine() ? '#38bdf8' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvas.width, lineY);
        ctx.stroke();

        ctx.fillStyle = getDraggingLine() ? '#38bdf8' : '#ef4444';
        ctx.font = 'bold 13px Segoe UI';
        ctx.fillText('VẠCH ĐẾM PHƯƠNG TIỆN', 15, lineY - 8);
    }

    if (vehicles) {
        vehicles.forEach(vehicle => {
            const [x, y, width, height] = vehicle.bbox;
            const color = getCategoryColor(vehicle.className);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = color;
            ctx.fillRect(x, y > 18 ? y - 18 : 0, 110, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Segoe UI';
            ctx.fillText(`${vehicle.className.toUpperCase()} #${vehicle.id} (${(vehicle.confidence * 100).toFixed(0)}%)`, x + 2, y > 18 ? y - 5 : 12);
        });
    }
}

export function resetLinePosition() {
    lineConfig.positionRatio = 0.35;
    drawScene(latestDetections);
}

function getCategoryColor(className) {
    switch (className) {
        case 'car': return '#2563eb';
        case 'motorcycle': return '#16a34a';
        case 'bus': return '#d97706';
        case 'truck': return '#dc2626';
        default: return '#38bdf8';
    }
}
