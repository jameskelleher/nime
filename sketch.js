let video;
let img;
let handPose;
let hands = [];
let osc1, osc2, osc3;
let filter;
let tremolo;
let gain;
let lfo;
let q = 2;
let defaultDuration = 200;
let duration;

async function setup() {
  img = await loadImage("assets/seurat.jpg");
  // img = await loadImage("assets/rothko.jpg");

  createCanvas(img.width, img.height);

  video = createCapture(VIDEO, { flipped: true });
  video.size(img.width, img.height);
  video.hide();

  handPose = await ml5.handPose({ flipped: true });
  handPose.detectStart(video, gotHands);


  lfo = new Tone.LFO(2, 0, 1).start();
  filter = new Tone.Filter(2000, "lowpass").toDestination();
  gain = new Tone.Gain(1).connect(filter);
  // gain = new Tone.Gain(1).toDestination();
  osc1 = new Tone.Oscillator(440, "square").connect(gain);
  osc2 = new Tone.Oscillator(440, "square").connect(gain);
  osc3 = new Tone.Oscillator(440, "square").connect(gain);
  lfo.connect(gain.gain);

  img.loadPixels();
  duration = defaultDuration;
}

function draw() {
  background(220);

  let fingerX;
  let fingerY;

  image(img, 0, 0);
  // tint(255, 127);
  // image(video, 0, 0);
  // noTint();

  if (hands.length == 0) {
    osc1.stop();
    osc2.stop();
    osc3.stop();
    return;
  };

  if (osc1.state = 'stopped') {
    osc1.start();
    osc2.start();
    osc3.start();
  }

  fingerX = hands[0].index_finger_tip.x;
  fingerY = hands[0].index_finger_tip.y;
  
  noStroke();
  fill(255, 255, 0);
  circle(fingerX, fingerY, 20);
  fill(255, 0, 0);

  fingerX = floor(fingerX);
  fingerY = floor(fingerY);

  let scaleRatios = [1, 6/5, 4/3, 3/2, 9/5];
  let fundamental = 440;

  let colors = samplePixels(fingerX, fingerY, 5);

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

  // filter.Q.value = q;
  // filter.frequency.value = lerp(map(sampleBright, 0, 100, 1000, 2000), filter.frequency.value, 0.1);

  lfo.frequency.value = map(sampleBright, 0, 100, .5, 10);

  img.updatePixels();
}

function gotHands(results) {
  hands = results;
}

function samplePixels(x, y, radius) {
  colors = [];
  for (let xx = x - radius; xx < x + radius + 1; xx++) {
    for (let yy = y - radius; yy < y + radius + 1; yy++) {

      if (xx < 0 || xx >= img.width || yy < 0 || yy >= img.height ) continue;

      pIx = (xx + yy * img.width) * 4;

      pR = img.pixels[pIx    ] || 0;
      pG = img.pixels[pIx + 1] || 0;
      pB = img.pixels[pIx + 2] || 0;

      let col = color(pR, pG, pB);
      colors.push(col);
    }
  }

  return colors;
}