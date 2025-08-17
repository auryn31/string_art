
// --- Canvas & Contexts ---
const imageCanvas = document.getElementById('imageCanvas');
const imageCtx = imageCanvas.getContext('2d');
const stringArtCanvas = document.getElementById('stringArtCanvas');
const stringArtCtx = stringArtCanvas.getContext('2d');

// --- UI Controls ---
const imageLoader = document.getElementById('imageLoader');
const pinsSlider = document.getElementById('pins');
const linesSlider = document.getElementById('lines');
const contrastSlider = document.getElementById('contrast');
const lineWidthSlider = document.getElementById('lineWidth');
const lineWeightSlider = document.getElementById('lineWeight');
const distanceBiasSlider = document.getElementById('distanceBias');
const calculateButton = document.getElementById('calculateButton');
const resetButton = document.getElementById('resetButton');
const toggleImage = document.getElementById('toggleImage');

// --- UI Value Displays ---
const pinsValue = document.getElementById('pinsValue');
const linesValue = document.getElementById('linesValue');
const contrastValue = document.getElementById('contrastValue');
const lineWidthValue = document.getElementById('lineWidthValue');
const lineWeightValue = document.getElementById('lineWeightValue');
const distanceBiasValue = document.getElementById('distanceBiasValue');

// --- Progress & Playback ---
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const playbackContainer = document.getElementById('playbackContainer');
const iterationSlider = document.getElementById('iterationSlider');
const iterationValue = document.getElementById('iterationValue');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const lineInfo = document.getElementById('lineInfo');

// --- State Variables ---
let baseImageData = null; // Raw grayscale data
let workingImageData = null; // Inverted and contrasted data for the algorithm
let lineHistory = [];
let pins = [];
let renderingIntervalId = null;

// --- In-memory canvas for line subtraction ---
const lineCanvas = document.createElement('canvas');
lineCanvas.width = 1000; lineCanvas.height = 1000;
const lineCtx = lineCanvas.getContext('2d');

// --- Event Listeners ---
imageLoader.addEventListener('change', handleImage, false);
calculateButton.addEventListener('click', () => {
    if (workingImageData) calculateStringArt();
    else alert('Please upload an image first.');
});
resetButton.addEventListener('click', resetCalculation);
toggleImage.addEventListener('change', () => imageCanvas.style.display = toggleImage.checked ? 'block' : 'none');

[pinsSlider, linesSlider, lineWidthSlider, lineWeightSlider, distanceBiasSlider].forEach(slider => {
    slider.oninput = () => {
        const el = document.getElementById(slider.id + 'Value');
        if(el) el.textContent = slider.value;
    };
});

contrastSlider.oninput = () => {
    contrastValue.textContent = contrastSlider.value;
    if (baseImageData) processImage();
};

iterationSlider.oninput = () => drawState(parseInt(iterationSlider.value));
prevButton.onclick = () => drawState(parseInt(iterationSlider.value) - 1);
nextButton.onclick = () => drawState(parseInt(iterationSlider.value) + 1);


function handleImage(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            resetCalculation();
            const size = Math.min(img.width, img.height);
            const x = (img.width - size) / 2, y = (img.height - size) / 2;
            imageCtx.drawImage(img, x, y, size, size, 0, 0, 1000, 1000);

            const imageData = imageCtx.getImageData(0, 0, 1000, 1000);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
            }
            
            imageCtx.putImageData(imageData, 0, 0);
            imageCtx.globalCompositeOperation = 'destination-in';
            imageCtx.beginPath();
            imageCtx.arc(500, 500, 500, 0, Math.PI * 2);
            imageCtx.closePath();
            imageCtx.fill();
            imageCtx.globalCompositeOperation = 'source-over';

            baseImageData = imageCtx.getImageData(0, 0, 1000, 1000);
            processImage();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

// NEW: Single, unified function for all image processing
function processImage() {
    const contrast = parseInt(contrastSlider.value);
    const slope = Math.pow(1.03, contrast); // Softened the slope

    const processedData = new Uint8ClampedArray(baseImageData.data);
    for (let i = 0; i < processedData.length; i += 4) {
        // 1. Invert the image (dark becomes high value)
        const invertedValue = 255 - processedData[i];
        // 2. Apply sigmoid contrast to the inverted image
        const contrastedValue = 255 / (1 + Math.exp(-slope * (invertedValue / 255 - 0.5)));
        processedData[i] = contrastedValue; 
        processedData[i+1] = contrastedValue;
        processedData[i+2] = contrastedValue;
    }
    // This is the final data used by the algorithm
    workingImageData = new ImageData(processedData, baseImageData.width, baseImageData.height);
    // Draw this exact data to the canvas so the user sees what the algorithm sees
    imageCtx.putImageData(workingImageData, 0, 0);
}

function resetCalculation() {
    if (renderingIntervalId) {
        clearInterval(renderingIntervalId);
        renderingIntervalId = null;
    }
    stringArtCtx.clearRect(0, 0, 1000, 1000);
    lineHistory = [];
    pins = [];
    playbackContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    calculateButton.disabled = false;
}

function calculateStringArt() {
    resetCalculation();
    calculateButton.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.value = 0;

    const numPins = parseInt(pinsSlider.value);
    const numLines = parseInt(linesSlider.value);
    const lineWeight = parseInt(lineWeightSlider.value);
    const distanceBias = parseFloat(distanceBiasSlider.value);
    const lineWidth = parseInt(lineWidthSlider.value);

    const radius = 499, center = { x: 500, y: 500 };
    pins = [];
    for (let i = 0; i < numPins; i++) {
        const angle = (i / numPins) * 2 * Math.PI;
        pins.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }

    let calculationData = new ImageData(new Uint8ClampedArray(workingImageData.data), workingImageData.width, workingImageData.height);
    let currentPinIndex = 0, previousPinIndex = -1;
    let lineCounter = 0;

    function calculationStep() {
        if (lineCounter >= numLines) {
            clearInterval(renderingIntervalId);
            renderingIntervalId = null;
            drawState(numLines);
            progressContainer.style.display = 'none';
            playbackContainer.style.display = 'block';
            iterationSlider.max = numLines;
            return;
        }

        let bestNextPinIndex = -1, maxScore = -1;
        for (let i = 0; i < numPins; i++) {
            if (i === currentPinIndex || i === previousPinIndex) continue;
            const linePixels = getLinePixels(pins[currentPinIndex], pins[i]);
            let currentDarkness = 0;
            for (const pixel of linePixels) {
                currentDarkness += calculationData.data[(pixel.y * 1000 + pixel.x) * 4];
            }
            const distance = Math.hypot(pins[i].x - pins[currentPinIndex].x, pins[i].y - pins[currentPinIndex].y);
            const currentScore = currentDarkness * Math.pow(distance, distanceBias);
            if (currentScore > maxScore) {
                maxScore = currentScore; bestNextPinIndex = i;
            }
        }

        if (bestNextPinIndex === -1) { lineCounter = numLines; setTimeout(calculationStep, 0); return; }

        lineHistory.push({ startPin: currentPinIndex, endPin: bestNextPinIndex });

        lineCtx.clearRect(0, 0, 1000, 1000);
        lineCtx.beginPath();
        lineCtx.moveTo(pins[currentPinIndex].x, pins[currentPinIndex].y);
        lineCtx.lineTo(pins[bestNextPinIndex].x, pins[bestNextPinIndex].y);
        lineCtx.strokeStyle = `rgb(${lineWeight}, ${lineWeight}, ${lineWeight})`;
        lineCtx.lineWidth = lineWidth;
        lineCtx.stroke();
        const lineImageData = lineCtx.getImageData(0, 0, 1000, 1000).data;

        for (let i = 0; i < calculationData.data.length; i += 4) {
            const subtractedValue = Math.max(0, calculationData.data[i] - lineImageData[i]);
            calculationData.data[i] = subtractedValue; calculationData.data[i+1] = subtractedValue; calculationData.data[i+2] = subtractedValue;
        }

        previousPinIndex = currentPinIndex;
        currentPinIndex = bestNextPinIndex;
        lineCounter++;
        progressBar.value = (lineCounter / numLines) * 100;
        setTimeout(calculationStep, 0);
    }

    renderingIntervalId = setInterval(() => {
        drawState(lineHistory.length);
    }, 100);

    console.log("Starting calculation...");
    calculationStep();
}

function drawState(targetIteration) {
    targetIteration = Math.max(0, Math.min(lineHistory.length, targetIteration));
    stringArtCtx.clearRect(0, 0, 1000, 1000);
    stringArtCtx.lineWidth = parseInt(lineWidthSlider.value);
    stringArtCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';

    for (let i = 0; i < targetIteration; i++) {
        const line = lineHistory[i];
        stringArtCtx.beginPath();
        stringArtCtx.moveTo(pins[line.startPin].x, pins[line.startPin].y);
        stringArtCtx.lineTo(pins[line.endPin].x, pins[line.endPin].y);
        stringArtCtx.stroke();
    }

    iterationSlider.value = targetIteration;
    iterationValue.textContent = targetIteration;

    if (targetIteration > 0) {
        const lastLine = lineHistory[targetIteration - 1];
        lineInfo.textContent = `${targetIteration}: Pin ${lastLine.startPin} → Pin ${lastLine.endPin}`;
    } else {
        lineInfo.textContent = '-';
    }
}

function getLinePixels(p1, p2) {
    const pixels = [];
    let x1 = Math.round(p1.x), y1 = Math.round(p1.y);
    const x2 = Math.round(p2.x), y2 = Math.round(p2.y);
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    while (true) {
        if (x1 >= 0 && x1 < 1000 && y1 >= 0 && y1 < 1000) pixels.push({ x: x1, y: y1 });
        if ((x1 === x2) && (y1 === y2)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
    return pixels;
}
