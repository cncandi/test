<?php
?><!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roboterskizze & 3D-Simulation (A1–A6)</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #22d3ee;
      --border: #374151;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
    h1 { margin: 0; font-size: 1.2rem; }
    .app {
      display: grid;
      grid-template-columns: 420px 1fr;
      min-height: calc(100vh - 64px);
    }
    .panel {
      padding: 16px;
      border-right: 1px solid var(--border);
      overflow: auto;
      background: var(--panel);
    }
    .section { margin-bottom: 20px; }
    .section h2 { margin: 0 0 10px; font-size: 1rem; color: var(--accent); }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
    .row > label { grid-column: 1 / -1; color: var(--muted); font-size: 0.85rem; }
    input[type="number"], input[type="range"] {
      width: 100%;
      background: #0b1220;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px;
    }
    .joint-row { display: grid; grid-template-columns: 58px 1fr 54px; gap: 8px; align-items: center; margin-bottom: 8px; }
    .joint-row output { text-align: right; color: var(--muted); }
    #sketch {
      width: 100%;
      height: 220px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #020617;
      display: block;
    }
    #scene { position: relative; }
    #three { width: 100%; height: 100%; display:block; }
    .hint { color: var(--muted); font-size: 0.82rem; margin-top: 8px; }
  </style>
</head>
<body>
<header>
  <h1>Roboterskizze (2D) + 3D-Bewegung für A1–A6</h1>
</header>
<div class="app">
  <aside class="panel">
    <div class="section">
      <h2>1) Linien/Segmente (A1→A2 ... A5→A6)</h2>
      <div id="segments"></div>
      <canvas id="sketch" width="380" height="220"></canvas>
      <div class="hint">2D-Skizze zeigt die XY-Projektion. Z wird nur in 3D berücksichtigt.</div>
    </div>

    <div class="section">
      <h2>2) Achsen bewegen (Grad)</h2>
      <div id="joints"></div>
    </div>

    <div class="section">
      <h2>3) Tool-Offset ab A6</h2>
      <div class="row">
        <label>Offset XY</label>
        <input type="number" id="toolX" value="20" step="1" title="Tool X">
        <input type="number" id="toolY" value="0" step="1" title="Tool Y">
        <span></span>
      </div>
      <div class="row">
        <label>Rotation RX/RY/RZ (Grad)</label>
        <input type="number" id="toolRx" value="0" step="1" title="Tool RX">
        <input type="number" id="toolRy" value="0" step="1" title="Tool RY">
        <input type="number" id="toolRz" value="0" step="1" title="Tool RZ">
      </div>
    </div>
  </aside>

  <main id="scene">
    <canvas id="three"></canvas>
  </main>
</div>

<script type="module">
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js';

const segmentContainer = document.getElementById('segments');
const jointContainer = document.getElementById('joints');
const sketch = document.getElementById('sketch');
const sctx = sketch.getContext('2d');
const jointAxes = ['y','z','z','x','z','x'];

const defaultSegments = [
  [0, 0, 60],
  [70, 0, 0],
  [70, 0, 0],
  [35, 0, 0],
  [20, 0, 0]
];

const segmentInputs = [];
defaultSegments.forEach((vals, i) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <label>A${i+1} → A${i+2} (dx, dy, dz)</label>
    <input type="number" step="1" value="${vals[0]}" data-seg="${i}" data-axis="x">
    <input type="number" step="1" value="${vals[1]}" data-seg="${i}" data-axis="y">
    <input type="number" step="1" value="${vals[2]}" data-seg="${i}" data-axis="z">
  `;
  segmentContainer.appendChild(row);
  segmentInputs.push(...row.querySelectorAll('input'));
});

const jointInputs = [];
for (let i = 0; i < 6; i++) {
  const row = document.createElement('div');
  row.className = 'joint-row';
  row.innerHTML = `
    <label>A${i+1}</label>
    <input type="range" min="-180" max="180" value="0" step="1" data-joint="${i}">
    <output>0°</output>
  `;
  const slider = row.querySelector('input');
  slider.addEventListener('input', () => {
    row.querySelector('output').value = `${slider.value}°`;
    updateRobot();
  });
  jointContainer.appendChild(row);
  jointInputs.push(slider);
}

const toolInputs = ['toolX','toolY','toolRx','toolRy','toolRz'].map(id => document.getElementById(id));
[...segmentInputs, ...toolInputs].forEach(el => el.addEventListener('input', updateRobot));

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 2000);
camera.position.set(220, 180, 240);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(60, 40, 0);
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.85);
dir.position.set(200, 300, 150);
scene.add(dir);

scene.add(new THREE.GridHelper(500, 20, 0x335577, 0x223344));
scene.add(new THREE.AxesHelper(120));

const base = new THREE.Group();
scene.add(base);

const joints = [];
const markers = [];
const jointGeom = new THREE.SphereGeometry(4, 18, 18);
const jointMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9 });

for (let i = 0; i < 6; i++) {
  const g = new THREE.Group();
  const mark = new THREE.Mesh(jointGeom, jointMat);
  g.add(mark);
  markers.push(mark);
  joints.push(g);
  if (i === 0) base.add(g); else joints[i-1].add(g);
}

const linkLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(new Array(6).fill(0).map(() => new THREE.Vector3())),
  new THREE.LineBasicMaterial({ color: 0xf8fafc })
);
scene.add(linkLine);

const toolGroup = new THREE.Group();
const toolMesh = new THREE.Mesh(
  new THREE.ConeGeometry(4, 14, 18),
  new THREE.MeshStandardMaterial({ color: 0xf59e0b })
);
toolMesh.rotation.x = Math.PI / 2;
toolGroup.add(toolMesh);
joints[5].add(toolGroup);

function deg(d) { return THREE.MathUtils.degToRad(Number(d) || 0); }

function getSegments() {
  const segs = Array.from({ length: 5 }, () => ({ x:0,y:0,z:0 }));
  segmentInputs.forEach(inp => {
    const i = Number(inp.dataset.seg);
    segs[i][inp.dataset.axis] = Number(inp.value) || 0;
  });
  return segs;
}

function updateSketch(segs) {
  sctx.clearRect(0, 0, sketch.width, sketch.height);
  const pts = [{x:0,y:0}];
  segs.forEach(s => pts.push({ x: pts.at(-1).x + s.x, y: pts.at(-1).y + s.y }));

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
  const scale = Math.min((sketch.width - 30) / w, (sketch.height - 30) / h);

  const map = p => ({
    x: 15 + (p.x - minX) * scale,
    y: sketch.height - (15 + (p.y - minY) * scale)
  });

  sctx.strokeStyle = '#67e8f9';
  sctx.lineWidth = 2;
  sctx.beginPath();
  const p0 = map(pts[0]);
  sctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const p = map(pts[i]);
    sctx.lineTo(p.x, p.y);
  }
  sctx.stroke();

  sctx.fillStyle = '#f8fafc';
  pts.forEach((p, i) => {
    const q = map(p);
    sctx.beginPath();
    sctx.arc(q.x, q.y, 3, 0, Math.PI*2);
    sctx.fill();
    sctx.fillText(`A${i+1}`, q.x + 6, q.y - 6);
  });
}

function updateRobot() {
  const segs = getSegments();
  updateSketch(segs);

  joints.forEach((j, i) => {
    j.rotation.set(0,0,0);
    j.rotation[jointAxes[i]] = deg(jointInputs[i].value);
  });

  for (let i = 1; i < 6; i++) {
    const s = segs[i-1];
    joints[i].position.set(s.x, s.y, s.z);
  }

  toolGroup.position.set(Number(toolX.value)||0, Number(toolY.value)||0, 0);
  toolGroup.rotation.set(deg(toolRx.value), deg(toolRy.value), deg(toolRz.value));

  const pts = [];
  for (let i = 0; i < 6; i++) {
    const wp = new THREE.Vector3();
    joints[i].getWorldPosition(wp);
    pts.push(wp);
  }
  linkLine.geometry.setFromPoints(pts);
}

function onResize() {
  const w = document.getElementById('scene').clientWidth;
  const h = document.getElementById('scene').clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateRobot();
onResize();
animate();
</script>
</body>
</html>
