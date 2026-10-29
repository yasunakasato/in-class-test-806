let bgImg;
let spriteSheet;
let eatImg;
let frames = [];
let numFrames = 4;

let catX, catY;
let bowlX, bowlY;
let bowlRadius = 45;
let easing = 0.04;

let currentFrame = 0;
let frameCounter = 0;
let frameDelay = 7;
let isMovingLeft = false;

let currentBgRenderH = 0;

// States: "idle", "walking_to_bowl", "eating"
let catState = "idle";
let eatStartTime = 0;
const EAT_DURATION = 8000; // 8 seconds

function preload() {
  bgImg = loadImage("background.jpeg");
  spriteSheet = loadImage("image_7.png");

  // Load eating image
  eatImg = loadImage(
    "image_8.png",
    () => console.log("image_8.png loaded"),
    () => {
      eatImg = loadImage(
        "image_8.jpg",
        () => console.log("image_8.jpg loaded"),
        () => console.warn("image_8 not found"),
      );
    },
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  // Cat starts standing on the carpet to the left
  catX = width * 0.22;
  catY = height * 0.68;

  // Bowl position on the carpet
  bowlX = width * 0.72;
  bowlY = height * 0.77;

  // Slice walking spritesheet
  if (spriteSheet && spriteSheet.width > 0 && spriteSheet.height > 0) {
    let sw = spriteSheet.width;
    let sh = spriteSheet.height;

    let sliceBoxes = [
      { y: sh * 0.01, h: sh * 0.22 }, // Cat 1
      { y: sh * 0.28, h: sh * 0.21 }, // Cat 2
      { y: sh * 0.53, h: sh * 0.21 }, // Cat 3
      { y: sh * 0.77, h: sh * 0.22 }, // Cat 4
    ];

    for (let i = 0; i < numFrames; i++) {
      let b = sliceBoxes[i];
      frames[i] = spriteSheet.get(0, b.y, sw, b.h);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bowlX = width * 0.72;
  bowlY = height * 0.82;
  if (catState === "idle") {
    catX = width * 0.22;
    catY = height * 0.68;
  }
}

function draw() {
  let isHoveringBowl = dist(mouseX, mouseY, bowlX, bowlY) < bowlRadius + 20;
  cursor(isHoveringBowl && catState !== "eating" ? HAND : ARROW);

  // 1. Proportional Room Background
  if (bgImg && bgImg.width > 0) {
    let imgAspect = bgImg.width / bgImg.height;
    let screenAspect = width / height;
    let renderW, renderH;

    if (screenAspect > imgAspect) {
      renderW = width;
      renderH = width / imgAspect;
    } else {
      renderH = height;
      renderW = height * imgAspect;
    }

    currentBgRenderH = renderH;
    image(bgImg, width / 2, height / 2, renderW, renderH);
  } else {
    background(240, 235, 225);
    currentBgRenderH = height;
  }

  let catTargetHeight = currentBgRenderH * 0.16;

  // Stop position: Cat body stands back so her forward head lands right over the bowl
  let targetWalkX = bowlX - 140;
  let targetWalkY = bowlY - 164;

  let prevX = catX;

  // 2. Movement & Instant Stop Logic
  if (catState === "walking_to_bowl") {
    catX = lerp(catX, targetWalkX, easing);
    catY = lerp(catY, targetWalkY, easing);

    isMovingLeft = false;

    // Stop immediately when close to the bowl (no sliding)
    if (dist(catX, catY, targetWalkX, targetWalkY) < 16) {
      catX = targetWalkX;
      catY = targetWalkY;
      currentFrame = 0;
      catState = "eating";
      eatStartTime = millis();
    }
  } else if (catState === "eating") {
    // Keep her anchored firmly in place
    catX = targetWalkX;
    catY = targetWalkY;

    if (millis() - eatStartTime >= EAT_DURATION) {
      catState = "idle";
    }
  }

  let speed = dist(prevX, 0, catX, 0);

  // Animation cycle: only steps while actively walking
  if (catState === "walking_to_bowl" && speed > 0.4) {
    frameCounter++;
    if (frameCounter >= frameDelay) {
      currentFrame = (currentFrame + 1) % numFrames;
      frameCounter = 0;
    }
  } else {
    currentFrame = 0;
  }

  // --------------------------------------------------
  // 3. LAYER ORDER: Cat behind, Bowl in front
  // --------------------------------------------------

  // STEP A: Render Zoi
  push();
  if (catState === "eating") {
    let munchY = sin(frameCount * 0.35) * 2.5;

    if (eatImg && eatImg.width > 0) {
      let ew = eatImg.width;
      let eh = eatImg.height;
      let croppedEat = eatImg.get(0, eh * 0.72, ew, eh * 0.28);
      let imgH = catTargetHeight * 1.05;
      let imgW = (croppedEat.width / croppedEat.height) * imgH;

      // Position body so her downward snout reaches directly into the bowl
      translate(catX, catY + munchY);
      image(croppedEat, 0, 0, imgW, imgH);
    } else {
      let currentSprite = frames[3] || frames[0];
      if (currentSprite) {
        let imgH = catTargetHeight;
        let imgW = (currentSprite.width / currentSprite.height) * imgH;
        translate(catX, catY + munchY);
        image(currentSprite, 0, 0, imgW, imgH);
      }
    }
  } else {
    // Idle or walking pose
    translate(catX, catY);
    if (isMovingLeft) {
      scale(-1, 1);
    }

    let currentSprite = frames[currentFrame];
    if (currentSprite && currentSprite.width > 0) {
      let imgH = catTargetHeight * 0.85;
      let imgW = (currentSprite.width / currentSprite.height) * imgH;
      image(currentSprite, 0, 0, imgW, imgH);
    }
  }
  pop();

  // STEP B: Render 3D Bowl positioned right beneath her face
  draw3DBowl(bowlX, bowlY);

  // STEP C: UI overlays
  if (catState === "eating") {
    drawEatingEffects(bowlX, bowlY);
  } else {
    drawBowlArrowUI(bowlX, bowlY);
  }
}

// --------------------------------------------------
// 3D FOOD BOWL
// --------------------------------------------------
function draw3DBowl(x, y) {
  push();
  translate(x, y);

  // Soft Floor Shadows
  noStroke();
  fill(25, 15, 10, 40);
  ellipse(4, 24, 120, 38);
  fill(15, 10, 5, 70);
  ellipse(0, 16, 92, 26);

  // Ceramic Wall Extrusion
  for (let i = 18; i >= 0; i--) {
    let p = i / 18;
    fill(lerp(140, 225, 1 - p), lerp(40, 75, 1 - p), lerp(35, 65, 1 - p));
    ellipse(0, i, 94 - p * 14, 40 - p * 8);
  }

  // Ceramic Top Rim
  stroke(160, 45, 35);
  strokeWeight(2.5);
  fill(240, 95, 80);
  ellipse(0, 0, 94, 42);

  // Inner Bowl Cavity
  noStroke();
  fill(85, 20, 15);
  ellipse(0, -5, 88, 38);

  // Food Mound
  fill(75, 42, 20);
  ellipse(0, -8, 82, 32);

  // Kibble pieces
  let kibbles = [
    { x: -24, y: -4, r: 8.5 },
    { x: -15, y: 2, r: 9.5 },
    { x: -9, y: -6, r: 10.0 },
    { x: 3, y: 1, r: 9.0 },
    { x: 14, y: -5, r: 9.5 },
    { x: 22, y: 0, r: 8.5 },
    { x: -2, y: -8, r: 10.0 },
    { x: -20, y: -8, r: 8.0 },
    { x: 18, y: -8, r: 8.5 },
    { x: 0, y: -2, r: 10.5 },
  ];

  for (let k of kibbles) {
    fill(35, 18, 8, 180);
    ellipse(k.x + 1, k.y + 2, k.r * 1.4, k.r * 0.9);
    fill(135, 75, 35);
    ellipse(k.x, k.y, k.r * 1.3, k.r * 0.9);
    fill(185, 120, 65);
    ellipse(k.x - 1, k.y - 1, k.r * 0.7, k.r * 0.5);
  }

  // Glossy reflection
  noFill();
  stroke(255, 255, 255, 130);
  strokeWeight(2.5);

  pop();
}

// --------------------------------------------------
// UI: ARROW & EFFECTS
// --------------------------------------------------
function drawBowlArrowUI(x, y) {
  push();
  translate(x, y);

  let bounce = sin(frameCount * 0.12) * 6;
  let arrowY = -55 + bounce;

  fill(0, 0, 0, 70);
  noStroke();
  ellipse(2, arrowY + 22, 18, 6);

  fill(255, 215, 0);
  stroke(50, 40, 10);
  strokeWeight(2);
  beginShape();
  vertex(0, arrowY + 16);
  vertex(-11, arrowY + 2);
  vertex(-5, arrowY + 2);
  vertex(-5, arrowY - 14);
  vertex(5, arrowY - 14);
  vertex(5, arrowY + 2);
  vertex(11, arrowY + 2);
  endShape(CLOSE);

  fill(255);
  stroke(25, 20, 15);
  strokeWeight(3.5);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(13);
  text("CLICK TO FEED", 0, arrowY - 26);
  pop();
}

function drawEatingEffects(x, y) {
  push();
  textAlign(CENTER, CENTER);

  let remainingSec = ceil((EAT_DURATION - (millis() - eatStartTime)) / 1000);

  fill(255);
  stroke(30, 20, 15);
  strokeWeight(3.5);
  textStyle(BOLD);
  textSize(21);

  let heartOffset = (frameCount * 2.2) % 65;
  let heartAlpha = map(heartOffset, 0, 65, 255, 0);
  textSize(24);
  noStroke();
  fill(255, 75, 115, heartAlpha);
  text("❤️", x - 25, y - 45 - heartOffset);
  pop();
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------
function mousePressed() {
  let d = dist(mouseX, mouseY, bowlX, bowlY);

  if (d < bowlRadius + 25 && catState !== "eating") {
    catState = "walking_to_bowl";
  }
}
