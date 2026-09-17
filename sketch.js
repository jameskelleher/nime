let video;
let img;
let handPose;
let hands = [];
let osc;

async function setup() {
  img = await loadImage("assets/seurat.jpg");

  createCanvas(img.width, img.height);

  video = createCapture(VIDEO, { flipped: true });
  video.size(img.width, img.height);
  video.hide();

  handPose = await ml5.handPose({ flipped: true });
  handPose.detectStart(video, gotHands);

  osc = new Tone.Oscillator(440, "sine").toDestination().start();

  img.loadPixels();
}

function draw() {
  background(220);

  let fingerX;
  let fingerY;
  // let thumbX = 0;
  // let thumbY = 0;

  image(img, 0, 0);
  tint(255, 127);
  image(video, 0, 0);
  noTint();

  if (hands.length > 0) {

    fingerX = hands[0].index_finger_tip.x;
    fingerY = hands[0].index_finger_tip.y;

    // console.log(fingerX, fingerY);
    // let thumbX = hands[0].thumb_tip.x;
    // let thumbY = hands[0].thumb_tip.y;
  };

  noStroke();
  fill(255, 255, 0);
  circle(fingerX, fingerY, 20);
  fill(255, 0, 0);
  circle(thumbX, thumbY, 20);

  fingerX = floor(fingerX);
  fingerY = floor(fingerY);

  let sampleHue = samplePixels(fingerX, fingerY, 5) || 0;
  let freq = map(sampleHue, 0, 360, 220, 2000);
  osc.frequency.value = freq;

  img.updatePixels();
}

function gotHands(results) {
  hands = results;
}

function samplePixels(x, y, radius) {
  hues = [];
  for (let xx = x - radius; xx < x + radius + 1; xx++) {
    for (let yy = y - radius; yy < y + radius + 1; yy++) {

      if (xx < 0 || xx >= img.width || yy < 0 || yy >= img.height ) continue;

      pIx = (xx + yy * img.width) * 4;

      pR = img.pixels[pIx    ] || 0;
      pG = img.pixels[pIx + 1] || 0;
      pB = img.pixels[pIx + 2] || 0;

      let col = color(pR, pG, pB);
      hues.push(hue(col));
    }
  }

  let sum = hues.reduce((acc, curr) => acc + curr, 0);
  let avg = sum/hues.length;
  return floor(avg);
}