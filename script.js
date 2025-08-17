const imageLoader = document.getElementById('imageLoader');
const imageCanvas = document.getElementById('imageCanvas');
const imageCtx = imageCanvas.getContext('2d');
const stringArtCanvas = document.getElementById('stringArtCanvas');
const stringArtCtx = stringArtCanvas.getContext('2d');

// --- Controls ---
const pinsSlider = document.getElementById('pins');
const linesSlider = document.getElementById('lines');
const contrastSlider = document.getElementById('contrast');
const lineWidthSlider = document.getElementById('lineWidth');
const lineWeightSlider = document.getElementById('lineWeight');

const pinsValue = document.getElementById('pinsValue');
const linesValue = document.getElementById('linesValue');
const contrastValue = document.getElementById('contrastValue');
const lineWidthValue = document.getElementById('lineWidthValue');
const lineWeightValue = document.getElementById('lineWeightValue');

const calculateButton = document.getElementById('calculateButton');
const resetButton = document.getElementById('resetButton');
const toggleImage = document.getElementById('toggleImage');

let baseImageData = null; // After initial grayscale, before contrast
let workingImageData = null; // After contrast, for calculation
let animationFrameId = null;

// --- Event Listeners ---

// Update slider display values
pinsSlider.oninput = () => pinsValue.textContent = pinsSlider.value;
linesSlider.oninput = () => linesValue.textContent = linesSlider.value;
lineWidthSlider.oninput = () => lineWidthValue.textContent = lineWidthSlider.value;
lineWeightSlider.oninput = () => lineWeightValue.textContent = lineWeightSlider.value;
contrastSlider.oninput = () => {
    contrastValue.textContent = contrastSlider.value;
    if (baseImageData) {
        applyContrast();
    }
};

imageLoader.addEventListener('change', handleImage, false);
calculateButton.addEventListener('click', () => {
    if (workingImageData) {
        calculateStringArt();
    } else {
        alert('Please upload an image first.');
    }
});

resetButton.addEventListener('click', resetCalculation);
toggleImage.addEventListener('change', () => {
    imageCanvas.style.display = toggleImage.checked ? 'block' : 'none';
});

function handleImage(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            resetCalculation();
            const size = Math.min(img.width, img.height);
            const x = (img.width - size) / 2;
            const y = (img.height - size) / 2;
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
            applyContrast();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

function applyContrast() {
    const contrast = parseInt(contrastSlider.value); // from -100 to 100
    // Map the linear slider value to an exponential slope for a more intuitive feel
    const slope = Math.pow(1.04, contrast);

    const contrastedData = new Uint8ClampedArray(baseImageData.data);
    const data = contrastedData;

    for (let i = 0; i < data.length; i += 4) {
        const oldValue = data[i]; // Grayscale, so R=G=B
        // Apply a sigmoid function for smooth contrast
        const newValue = 255 / (1 + Math.exp(-slope * (oldValue / 255 - 0.5)));
        data[i] = newValue;
        data[i + 1] = newValue;
        data[i + 2] = newValue;
    }

    workingImageData = new ImageData(contrastedData, baseImageData.width, baseImageData.height);
    imageCtx.putImageData(workingImageData, 0, 0);
}

function resetCalculation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    stringArtCtx.clearRect(0, 0, 1000, 1000);
}

function calculateStringArt() {
    resetCalculation();
    // Get all parameters from sliders
    const numPins = parseInt(pinsSlider.value);
    const numLines = parseInt(linesSlider.value);
    const lineWeight = parseInt(lineWeightSlider.value);
    stringArtCtx.lineWidth = parseInt(lineWidthSlider.value);

    const radius = 499;
    const center = { x: 500, y: 500 };

    let calculationData = new ImageData(
        new Uint8ClampedArray(workingImageData.data),
        workingImageData.width,
        workingImageData.height
    );

    const pins = [];
    for (let i = 0; i < numPins; i++) {
        const angle = (i / numPins) * 2 * Math.PI;
        pins.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }

    let currentPinIndex = 0; // initPin
    let previousPinIndex = -1;
    let lineCounter = 0;

    function drawNextLine() {
        if (lineCounter >= numLines) {
            console.log("Finished calculation.");
            animationFrameId = null;
            return;
        }

        let bestNextPinIndex = -1;
        let maxDarkness = -1;

        for (let i = 0; i < numPins; i++) {
            // minLoop implementation: disallow line to current or previous pin
            if (i === currentPinIndex || i === previousPinIndex) continue;

            const linePixels = getLinePixels(pins[currentPinIndex], pins[i]);
            let currentDarkness = 0;
            for (const pixel of linePixels) {
                const pixelIndex = (pixel.y * 1000 + pixel.x) * 4;
                currentDarkness += (255 - calculationData.data[pixelIndex]);
            }

            if (currentDarkness > maxDarkness) {
                maxDarkness = currentDarkness;
                bestNextPinIndex = i;
            }
        }

        if (bestNextPinIndex === -1) {
            console.log("No more valid moves.");
            animationFrameId = null;
            return;
        }

        stringArtCtx.beginPath();
        stringArtCtx.moveTo(pins[currentPinIndex].x, pins[currentPinIndex].y);
        stringArtCtx.lineTo(pins[bestNextPinIndex].x, pins[bestNextPinIndex].y);
        stringArtCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        stringArtCtx.stroke();

        const drawnLinePixels = getLinePixels(pins[currentPinIndex], pins[bestNextPinIndex]);
        for (const pixel of drawnLinePixels) {
            const pixelIndex = (pixel.y * 1000 + pixel.x) * 4;
            calculationData.data[pixelIndex] = Math.min(255, calculationData.data[pixelIndex] + lineWeight);
            calculationData.data[pixelIndex + 1] = Math.min(255, calculationData.data[pixelIndex + 1] + lineWeight);
            calculationData.data[pixelIndex + 2] = Math.min(255, calculationData.data[pixelIndex + 2] + lineWeight);
        }

        previousPinIndex = currentPinIndex;
        currentPinIndex = bestNextPinIndex;
        lineCounter++;
        
        animationFrameId = requestAnimationFrame(drawNextLine);
    }
    
    console.log("Starting calculation...");
    drawNextLine();
}

function getLinePixels(p1, p2) {
    const pixels = [];
    let x1 = Math.round(p1.x); let y1 = Math.round(p1.y);
    const x2 = Math.round(p2.x); const y2 = Math.round(p2.y);
    const dx = Math.abs(x2 - x1); const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1; const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        if (x1 >= 0 && x1 < 1000 && y1 >= 0 && y1 < 1000) {
             pixels.push({ x: x1, y: y1 });
        }
        if ((x1 === x2) && (y1 === y2)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
    return pixels;
}