let video;
let img;
let depthImg;
let handPose;
let hands = [];
let osc1, osc2, osc3;
let fltr;
let gain;
let lfo;
let q = 2;
let nearCutoff = 12000;
let farCutoff = 500;
let rolloff = -48;
let nearRadius = 3;
let farRadius = 30;
let depthRadius = 3;
let sampleSteps = 11;
let dotSize = 20;
let maxDotBlur = 6;
let fundamental = 440;

async function setup() {
  img = await loadImage("assets/seurat.jpg");
  depthImg = await loadImage("assets/seurat-depthmap.png");
  // img = await loadImage("assets/rothko.jpg");

  createCanvas(img.width, img.height);

  video = createCapture(VIDEO, { flipped: true });
  video.size(img.width, img.height);
  video.hide();

  handPose = await ml5.handPose({ flipped: true });
  handPose.detectStart(video, gotHands);

  lfo = new Tone.LFO(2, 0, 1).start();
  fltr = new Tone.Filter({
    frequency: 2000,
    type: "lowpass",
    rolloff: rolloff,
    Q: q,
  }).toDestination();
  gain = new Tone.Gain(1).connect(fltr);
  osc1 = new Tone.Oscillator(fundamental, "square").connect(gain);
  osc2 = new Tone.Oscillator(fundamental, "square").connect(gain);
  osc3 = new Tone.Oscillator(fundamental, "square").connect(gain);
  lfo.connect(gain.gain);

  img.loadPixels();
  depthImg.loadPixels();
}

function draw() {
  background(220);

  image(img, 0, 0);
  // tint(255, 127);
  // image(video, 0, 0);
  // noTint();

  if (hands.length == 0) {
    osc1.stop();
    osc2.stop();
    osc3.stop();
    return;
  }

  if (osc1.state === 'stopped') {
    osc1.start();
    osc2.start();
    osc3.start();
  }

  let fingerX = floor(hands[0].index_finger_tip.x);
  let fingerY = floor(hands[0].index_finger_tip.y);

  let scaleRatios = [1, 6/5, 4/3, 3/2, 9/5];

  // depth map is bright = near, dark = far
  let near = sampleDepth(fingerX, fingerY, depthRadius);

  // near reads are tight and specific, far ones wide and averaged
  let sampleRadius = floor(map(near, 0, 1, farRadius, nearRadius));

  let colors = samplePixels(img, fingerX, fingerY, sampleRadius);

  let hueSum = colors.reduce((acc, curr) => acc + hue(curr), 0);
  let sampleHue = hueSum/colors.length || 0;

  let brightSum = colors.reduce((acc, curr) => acc + brightness(curr), 0);
  let sampleBright = brightSum / colors.length || 0;
  
  let resolution = 10;
  let samp = floor(map(sampleHue, 0, 360, 0, resolution));

  let ix = samp % scaleRatios.length;
  let octavePow = floor(samp / scaleRatios.length);

  let freq = fundamental * scaleRatios[ix] * pow(2, octavePow);
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 3/2;
  osc3.frequency.value = fundamental;

  // distance rolls off the highs, exponential
  let cutoff = farCutoff * pow(nearCutoff / farCutoff, near);
  fltr.frequency.value = lerp(fltr.frequency.value, cutoff, 0.3);

  lfo.frequency.value = map(sampleBright, 0, 100, .5, 10);

  // the dot softens with distance, so the depth control is visible
  let dotBlur = map(near, 0, 1, maxDotBlur, 0);

  drawingContext.filter = `blur(${dotBlur}px)`;
  noStroke();
  fill(255, 255, 0);
  circle(fingerX, fingerY, dotSize);
  drawingContext.filter = "none";
}

function gotHands(results) {
  hands = results;
}

function samplePixels(src, x, y, radius) {
  let colors = [];

  // fixed sample count, so a wide read costs the same as a tight one
  let step = max(1, floor((radius * 2 + 1) / sampleSteps));

  for (let xx = x - radius; xx < x + radius + 1; xx += step) {
    for (let yy = y - radius; yy < y + radius + 1; yy += step) {

      if (xx < 0 || xx >= src.width || yy < 0 || yy >= src.height ) continue;

      let pIx = (xx + yy * src.width) * 4;

      let pR = src.pixels[pIx    ] || 0;
      let pG = src.pixels[pIx + 1] || 0;
      let pB = src.pixels[pIx + 2] || 0;

      let col = color(pR, pG, pB);
      colors.push(col);
    }
  }

  return colors;
}

// 1 is nearest, 0 is farthest. the map is grayscale, so red alone is the depth.
function sampleDepth(x, y, radius) {
  let total = 0;
  let count = 0;

  for (let xx = x - radius; xx < x + radius + 1; xx++) {
    for (let yy = y - radius; yy < y + radius + 1; yy++) {

      if (xx < 0 || xx >= depthImg.width || yy < 0 || yy >= depthImg.height) continue;

      let pIx = (xx + yy * depthImg.width) * 4;

      total += depthImg.pixels[pIx] || 0;
      count++;
    }
  }

  if (count === 0) return 0;

  return total / count / 255;
}
