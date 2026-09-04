import { loadModel, classConfidenceThresholds, session } from './model.js';
import { initChart, setStatus, updateUIStats } from './dashboard.js';
import { drawScene, resetLinePosition } from './counting.js';
import { resetTracking } from './tracking.js';
import { captureFrame, startAI, stopAI } from './video.js';

export const videoElement = document.getElementById('video-source');
export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
export const inferenceCanvas = document.createElement('canvas');
export const inferenceCtx = inferenceCanvas.getContext('2d');

export const countsLeft = { car: 0, motorcycle: 0, bus: 0, truck: 0, total: 0 };
export const countsRight = { car: 0, motorcycle: 0, bus: 0, truck: 0, total: 0 };
export const countsTotal = { car: 0, motorcycle: 0, bus: 0, truck: 0, total: 0 };
export const recentVehicles = new Map();
export const lineConfig = { positionRatio: 0.35 };
export let latestDetections = [];

let running = false;
let inferencing = false;
let draggingLine = false;
let countingLineEnabled = true;
let videoObjectUrl = null;

export const isRunning = () => running;
export const setRunning = value => { running = value; };
export const isInferencing = () => inferencing;
export const setInferencing = value => { inferencing = value; };
export const setLatestDetections = value => { latestDetections = value; };
export const getCountingLineEnabled = () => countingLineEnabled;
export const getDraggingLine = () => draggingLine;

setInterval(() => {
    const clockElement = document.getElementById('clock');
    if (clockElement) clockElement.innerText = new Date().toTimeString().split(' ')[0];
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-start').addEventListener('click', startAI);
    document.getElementById('btn-stop').addEventListener('click', stopAI);
    document.getElementById('btn-reset').addEventListener('click', resetSystem);
    document.getElementById('btn-capture').addEventListener('click', captureFrame);
    document.getElementById('btn-toggle-line').addEventListener('click', toggleCountingLineUI);
    document.getElementById('btn-reset-line').addEventListener('click', resetLinePosition);

    setupSlider('conf-moto-slider', 'motorcycle', 'conf-moto-val');
    setupSlider('conf-car-slider', 'car', 'conf-car-val');
    setupSlider('conf-bus-slider', 'bus', 'conf-bus-val');
    setupSlider('conf-truck-slider', 'truck', 'conf-truck-val');
    setupLineDragging();
    setupVideoUpload();

    initChart();
    loadModel(setStatus, () => {
        if (videoElement.src) document.getElementById('btn-start').disabled = false;
    });
});

function setupSlider(sliderId, vehicleKey, valueSpanId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueSpanId);
    if (slider && valueSpan) {
        slider.value = classConfidenceThresholds[vehicleKey];
        valueSpan.innerText = classConfidenceThresholds[vehicleKey].toFixed(2);
        slider.addEventListener('input', event => {
            const value = parseFloat(event.target.value);
            classConfidenceThresholds[vehicleKey] = value;
            valueSpan.innerText = value.toFixed(2);
        });
    }
}

function toggleCountingLineUI() {
    countingLineEnabled = !countingLineEnabled;
    const button = document.getElementById('btn-toggle-line');
    button.className = countingLineEnabled ? 'btn btn-success' : 'btn btn-danger';
    button.innerText = countingLineEnabled ? 'Vạch: ON' : 'Vạch: OFF';
    drawScene(latestDetections);
}

function setupLineDragging() {
    canvas.addEventListener('pointerdown', event => {
        if (!countingLineEnabled) return;
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const mouseY = (event.clientY - rect.top) * scaleY;
        const lineY = canvas.height * lineConfig.positionRatio;
        if (Math.abs(mouseY - lineY) < 40) {
            draggingLine = true;
            canvas.setPointerCapture(event.pointerId);
        }
    });

    window.addEventListener('pointermove', event => {
        if (!draggingLine || !countingLineEnabled) return;
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const mouseY = (event.clientY - rect.top) * scaleY;
        lineConfig.positionRatio = Math.max(0.05, Math.min(0.95, mouseY / canvas.height));
        drawScene(latestDetections);
    });
    window.addEventListener('pointerup', () => { draggingLine = false; });
    window.addEventListener('pointercancel', () => { draggingLine = false; });
}

function setupVideoUpload() {
    const uploadInput = document.getElementById('upload-video');
    if (!uploadInput) return;
    uploadInput.addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        if (running) stopAI();
        resetSystemDataOnly();
        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
        videoObjectUrl = URL.createObjectURL(file);
        videoElement.src = videoObjectUrl;
        videoElement.load();
        videoElement.onloadedmetadata = () => {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            inferenceCanvas.width = canvas.width;
            inferenceCanvas.height = canvas.height;
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            drawScene([]);
            if (session) {
                document.getElementById('btn-start').disabled = false;
                setStatus('ready', 'AI READY');
            }
        };
    });
}

function resetSystemDataOnly() {
    [countsLeft, countsRight, countsTotal].forEach(counts => {
        counts.car = 0;
        counts.motorcycle = 0;
        counts.bus = 0;
        counts.truck = 0;
        counts.total = 0;
    });
    resetTracking();
    setLatestDetections([]);
    updateUIStats();
}

function resetSystem() {
    stopAI();
    resetSystemDataOnly();
    resetLinePosition();
    if (videoElement && videoElement.src) {
        videoElement.currentTime = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        drawScene([]);
    }
}

window.addEventListener('beforeunload', () => {
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
});
