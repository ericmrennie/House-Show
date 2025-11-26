// global variables
let lines = [] // array to store drawn lines
let current = null; // current line being drawn
let speedSlider; // slider to control playback speed
let playing = false // is playback happening?
let playIndex = 0; // index of line being played
let osc;  // oscillator for sound generation
let playStartTime; // when the current line started playing
let playDuration; // duration of the current line being played
let playPoints; // points of the current line being played
let palette = ['#ff0000', '#ff9300', '#fffb00', '#0433ff']; // drawing color palette
let colorIndex = 0; // index for cycling through colors
let thicknessPalette = [1, 7, 13, 20]; // thickness options
let thicknessIndex = 0; // index for cycling through thicknesses

// PoseNet global variables
let video;
let poseNet; 
let poses = []; 
let noseX = null;
let noseY = null;
let prevNose = null;

// Color map for waveform types
const waveMap = {
  '#ff0000': 'sine',
  '#ff9300': 'triangle',
  '#fffb00': 'sawtooth',
  '#0433ff': 'square'
};

const baseMsPerPixel = 2; // base milliseconds per pixel for playback speed

// SETUP ----------------------------------------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight); // create full-window canvas
  
  // PoseNet setup
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();

  poseNet = ml5.poseNet(video, { detectionType: 'multiple' }, () => { // detectionType: 'multiple' for multiple people
    console.log("PoseNet ready");
  });

  poseNet.on("pose", gotPoses); // pose callback

  // UI
  // speed slider
  createP('Speed').position(55, height + 8).style('font-family', 'sans-serif');
  speedSlider = createSlider(0.25, 3, 1, 0.01).position(10, height + 3);

  // play and clear buttons
  createButton('Play').position(175, height + 8).mousePressed(() => playAll());
  createButton('Clear').position(220, height + 8).mousePressed(() => { lines = []; });
}

// DRAW ----------------------------------------------------------------------------------

function draw() {
  background(255, 255, 255); 

  // draw stored lines
  strokeCap(ROUND); // rounded line endings
  for (let l of lines) drawLine(l); // draw all stored lines
  if (current) drawLine(current); // draw current line

  // draw playhead
  if (playing) drawPlayhead();

  if (!playing && noseX !== null && noseY !== null) {
    let mirroredX = width - noseX;  // mirror x coordinate in video feed
    let mirroredY = noseY; // y coordinate remains the same

    // compute jump distance using mirrored coords
    // this is to prevent lines connecting across large jumps when the 
    // nose is lost and reacquired or when more than one person is using the program
    if (prevNose) {
      let jumpDist = dist(prevNose.x, prevNose.y, mirroredX, mirroredY);

      // if the nose 'teleports', start a new line instead of connecting
      if (jumpDist > 50) {
        if (current && current.points.length > 1) {
          lines.push(current);
        }
        current = null; 
      }
    }

    // if we are not currently drawing a line, create one
    if (!current) {

      // pick next color in palette
      let nextColor = palette[colorIndex];
      colorIndex = (colorIndex + 1) % palette.length;

      // pick next thickness in palette (this one is random)
      let nextThickness = random(thicknessPalette);

      current = {
        color: nextColor,
        thickness: nextThickness,
        points: []
      };
    }

    // add mirrored nose position instead of original
    current.points.push({ x: mirroredX, y: mirroredY });

    // update prev nose every frame (ALSO mirrored)
    prevNose = { x: mirroredX, y: mirroredY };


    // if PoseNet loses the nose, finalize line
    if (poses.length === 0) {
      if (current.points.length > 1) lines.push(current);
      current = null;
      prevNose = null;
    }
  }
}

// DRAW LINE FUNCTION ----------------------------------------------------------------------------------
function drawLine(l) {
  stroke(l.color);
  strokeWeight(l.thickness);
  noFill();
  beginShape();
  for (let p of l.points) vertex(p.x, p.y);
  endShape();
}

// gotPoses callback ----------------------------------------------------------------------------------
function gotPoses(results) {
  poses = results;

  if (poses.length > 0) {
    let pose = poses[0].pose; 

    let nose = pose.keypoints[0]; // 0th index in PoseNet is the nose, so I am calling it directly

    if (nose && nose.score > 0.3) {
      noseX = nose.position.x;
      noseY = nose.position.y;
    }
  }
}

// playback --------------------------------------------------------------------------------------------------
function playAll() { // play all lines in lines array
  if (playing || lines.length === 0) return; // ignore if already playing or no lines to play
  playing = true; // sets playing to true so other parts of code know playback is happening
  playIndex = 0; // reset play index so playback starts from beginning
  playNext(); // start playback
}

function playNext() {
  // end condition - if all lines played
  if (playIndex >= lines.length) {
    playing = false;
    return;
  }

  let line = lines[playIndex++]; // get next line and increment index
  let waveform = waveMap[line.color] || 'sine'; // get waveform type from color or default to sine
  osc = new p5.Oscillator(waveform); // create oscillator
  osc.start(); // start oscillator
  let amp = map(line.thickness, 1, 20, 0.1, 1); // map thickness to amplitude
  osc.amp(amp, 0.05); // ramp up amplitude to prevent clicks or pops by fading to the new amplitude over 0.05s(50ms)

  // compute duration from line length
  let lengthPx = 0; // length in pixels
  for (let i = 1; i < line.points.length; i++) { // iterate through points
    lengthPx += dist(line.points[i-1].x, line.points[i-1].y,  // calculate distance between two x and y pairs that are sequential points in the line
                     line.points[i].x, line.points[i].y);
  }
  playDuration = lengthPx * baseMsPerPixel / speedSlider.value(); // duration adjusted by speed slider. The pixel length is multiplied by the base ms per pixel (2ms) and divided by the speed slider value.
  playPoints = line.points; // store points for playhead drawing
  playStartTime = millis(); // store start time for playhead drawing

  // schedule freq ramps
  let segMs = playDuration / (playPoints.length - 1); // time per segment. The play duration is divided by the number of segments (points - 1). If playDuration = 2000 ms and playPoints.length = 11, then segMs = 2000 / 10 = 200 ms per segment.
  for (let i = 0; i < playPoints.length - 1; i++) { // iterate through points
    let p1 = playPoints[i], p2 = playPoints[i+1]; // get current and next point. Each is an object with x and y properties.
    let f1 = map(p1.y, height, 0, 40, 2000); // converts the y-value of each point into a frequnecy (inverted so top is high freq)
    let f2 = map(p2.y, height, 0, 40, 2000); // converts the y-value of each point into a frequency (inverted so top is high freq)
    setTimeout(() => osc.freq(f2, segMs/1000), i * segMs); // change the oscillator's pitch to f2, gradually over the course of segMs milliseconds, starting at i * segMs milliseconds after the line starts playing.
  }

  // stop and move to next
  setTimeout(() => {
    osc.amp(0, 0.05); // smoothy fade out the oscillator's volume to 0 over 0.05 seconds
    // after 100ms (to allow fade out to complete), stop the oscillator and play the next line 
    setTimeout(() => { osc.stop(); playNext(); }, 100);
  }, playDuration); // wait until the line's total playback duration has elapsed before fading out
}

function drawPlayhead() {
  let t = (millis() - playStartTime) / playDuration; // millis() gives the current time (in ms since program started), so we subtract when playback started and divide by total duration.
  if (t < 0 || t > 1 || !playPoints) return; // exit early if playback hasn't started yet (t<0), has finished (t>1), or there are no points to play

  // find position along the polyline
  let total = 0; // total length of the polyline (sum of all segments)
  let segLens = []; // array to store length of each segment

  for (let i = 1; i < playPoints.length; i++) { // iterate through all consecutive pairs of points to measure the distance between them
    let l = dist(playPoints[i-1].x, playPoints[i-1].y,
                 playPoints[i].x, playPoints[i].y);
    segLens.push(l); // store segment length
    total += l; // accumulate total path length
  }

  let target = total * t // determine the target distance along the polyline based on the current playback time

  // find which segment the playhead is currently on
  let sum = 0, idx = 0; 
  while (idx < segLens.length && sum + segLens[idx] < target) {
    sum += segLens[idx++];
  }

  // if we've reached the end of the points, stop drawing the playhead
  if (idx >= playPoints.length - 1) return;

  // get the two points that define the current segment
  let a = playPoints[idx], b = playPoints[idx+1];

  // compute how far along the current segment the playhead should be (0 to 1)
  let localT = (target - sum) / segLens[idx];

  // interpolate (linearly) between point a and b to get playhead's current x and y position
  let x = lerp(a.x, b.x, localT);
  let y = lerp(a.y, b.y, localT);

  // draw playhead as a white circle
  noStroke();
  fill(255);
  circle(x, y, 10);
}

// spacebar to play
function keyPressed() {
  if (key === ' ') playAll();
}

// window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

