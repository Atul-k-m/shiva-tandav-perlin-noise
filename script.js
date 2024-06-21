const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const audio = document.getElementById('audio');
const startButton = document.getElementById('startButton');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const maxRadius = Math.min(canvas.width, canvas.height) / 2 * 0.9;

const colors = [
    '#ff00ff', '#00ffff', '#00ff00', '#ff0000', '#ffff00'
];

let isPlaying = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioContext.destination);
analyser.fftSize = 256;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Improved Perlin noise function with multiple layers
class Perlin {
    constructor() {
        this.gradients = {};
        this.memory = {};
    }

    randomGradient(ix, iy) {
        const w = 8 * 32;
        const s = w / 2;
        let a = ix, b = iy;
        a *= s;
        b *= s;
        const random = 2920 * Math.sin(a * 21942 + b * 171324 + 8912) * Math.cos(a * 23157 * b * 217832 + 9758);
        return {x: Math.cos(random), y: Math.sin(random)};
    }

    dotProductGrid(ix, iy, x, y) {
        let gradient;
        const distance = {x: x - ix, y: y - iy};
        if (this.gradients[[ix, iy]]) {
            gradient = this.gradients[[ix, iy]];
        } else {
            gradient = this.randomGradient(ix, iy);
            this.gradients[[ix, iy]] = gradient;
        }

        return (distance.x * gradient.x + distance.y * gradient.y);
    }

    smootherstep(x) {
        return 6*x**5 - 15*x**4 + 10*x**3;
    }

    interpolate(x0, x1, alpha) {
        return x0 * (1 - alpha) + alpha * x1;
    }

    get(x, y) {
        if (this.memory.hasOwnProperty([x,y]))
            return this.memory[[x,y]];
        const x0 = Math.floor(x);
        const x1 = x0 + 1;
        const y0 = Math.floor(y);
        const y1 = y0 + 1;
        const sx = this.smootherstep(x - x0);
        const sy = this.smootherstep(y - y0);
        const n0 = this.dotProductGrid(x0, y0, x, y);
        const n1 = this.dotProductGrid(x1, y0, x, y);
        const ix0 = this.interpolate(n0, n1, sx);
        const n2 = this.dotProductGrid(x0, y1, x, y);
        const n3 = this.dotProductGrid(x1, y1, x, y);
        const ix1 = this.interpolate(n2, n3, sx);
        const value = this.interpolate(ix0, ix1, sy);
        this.memory[[x,y]] = value;
        return value;
    }
}

const perlin = new Perlin();

function drawThread(frequencyData, color, func) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const time = audio.currentTime;
    for (let t = 0; t <= Math.PI * 2; t += 0.01) {
        const [x, y] = func(t, time, frequencyData);
        ctx.lineTo(x, y);
    }

    ctx.stroke();
}

// Complex fractal generation function
function fractal(x, y, time) {
    let value = 0;
    let frequency = 1;
    let amplitude = 1;
    const octaves = 5;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * perlin.get(x * frequency + time, y * frequency + time);
        frequency *= 2;
        amplitude *= 0.5;
    }
    return value;
}

const shapes = [
    {
        name: 'nataraja',
        func: (t, time, frequencyData) => {
            const radius = maxRadius * 0.35 * (1 + Math.cos(3 * t));
            const x = centerX + radius * Math.cos(t) * Math.sin(time + frequencyData / 255);
            const y = centerY + radius * Math.sin(t) * Math.cos(time + frequencyData / 255);
            return [x, y];
        }
    },
    {
        name: 'drum',
        func: (t, time, frequencyData) => {
            const radius = maxRadius * 0.25 * (1 + Math.sin(4 * t));
            const x = centerX + radius * Math.cos(t + fractal(t, frequencyData / 200, time));
            const y = centerY + radius * Math.sin(t + fractal(t, frequencyData / 200, time));
            return [x, y];
        }
    },
    {
        name: 'trident',
        func: (t, time, frequencyData) => {
            const radius = maxRadius * 0.3 * (1 + fractal(t, time, time));
            const x = centerX + radius * Math.cos(t + fractal(t, frequencyData / 100, time));
            const y = centerY + radius * Math.sin(t + fractal(t, frequencyData / 100, time));
            return [x, y];
        }
    },
    {
        name: 'thirdEye',
        func: (t, time, frequencyData) => {
            const radius = maxRadius * 0.2 * (1 + Math.sin(3 * t));
            const x = centerX + radius * Math.cos(t + Math.sin(time));
            const y = centerY + radius * Math.sin(t + Math.cos(time));
            return [x, y];
        }
    },
    {
        name: 'om',
        func: (t, time, frequencyData) => {
            const radius = maxRadius * 0.25 * (1 + Math.sin(4 * t));
            const x = centerX + radius * Math.cos(t + fractal(t, frequencyData / 200, time));
            const y = centerY + radius * Math.sin(t + fractal(t, frequencyData / 200, time));
            return [x, y];
        }
    }
];

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(dataArray);
    
    for (let i = 0; i < shapes.length; i++) {
        const frequencyData = dataArray[i % bufferLength];
        drawThread(frequencyData, colors[i % colors.length], shapes[i].func);
    }
}

startButton.addEventListener('click', () => {
    if (!isPlaying) {
        audioContext.resume();
        audio.play();
        animate();
        isPlaying = true;
        startButton.style.display = 'none';
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
