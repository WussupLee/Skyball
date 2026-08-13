import "@fontsource/orbitron/400.css";
import "@fontsource/orbitron/500.css";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/800.css";
import "@fontsource/orbitron/900.css";
import * as THREE from "three";
import soundtrackUrl from "../assets/audio/Chrome Drift.mp3?url";
import marbleRollingUrl from "../assets/audio/Big Marble Rolling Continuous Sound Effect.mp3?url";

const root = document.querySelector("#skyball-game");
const canvas = root.querySelector("#game-canvas");
const intro = root.querySelector("#intro");
const complete = root.querySelector("#complete");
const failed = root.querySelector("#failed");
const menuOverlay = root.querySelector("#menu-overlay");
const hint = root.querySelector("#control-hint");
const restartButton = root.querySelector("#restart-btn");
const menuButton = root.querySelector("#menu-btn");
const resumeButton = root.querySelector("#resume-btn");
const menuRestartButton = root.querySelector("#menu-restart-btn");
const startButton = root.querySelector("#start-btn");
const retryButton = root.querySelector("#retry-btn");
const againButton = root.querySelector("#again-btn");
const levelPill = root.querySelector("#level-pill");
const statusPill = root.querySelector("#status-pill");
const levelProgress = root.querySelector("#level-progress");
const objectiveGuide = root.querySelector("#objective-guide");
const keyStep = root.querySelector("#key-step");
const goalStep = root.querySelector("#goal-step");
const completeTitle = root.querySelector("#complete-title");
const completeCopy = root.querySelector("#complete-copy");
const failedIcon = root.querySelector("#failed-icon");
const failedTitle = root.querySelector("#failed-title");
const failedCopy = root.querySelector("#failed-copy");
const countdown = root.querySelector("#countdown");
const musicButton = root.querySelector("#music-btn");
const backgroundMusic = root.querySelector("#bg-music");
const loading = root.querySelector("#loading");

backgroundMusic.src = soundtrackUrl;

const MAX_LEVELS = 20;
const ROUND_SECONDS = 20;
const BOARD_THICKNESS = 0.3;
const MARBLE_RADIUS = 0.31;
const MAX_TILT = THREE.MathUtils.degToRad(10.5);
const SURFACE_Y = BOARD_THICKNESS;
const UNLOCK_ANIMATION_SPEED = 1.25;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x4b8fd0, 0.044);

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 110);
camera.position.set(0, 12.2, 9.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

scene.add(new THREE.HemisphereLight(0xd9f8ff, 0x08194b, 3.1));

const sun = new THREE.DirectionalLight(0xffffff, 5.3);
sun.position.set(-5, 9, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -9,
  right: 9,
  top: 9,
  bottom: -9,
  near: 1,
  far: 32,
});
scene.add(sun);

const blueLight = new THREE.PointLight(0x45cfff, 24, 28, 2);
blueLight.position.set(7, 4, -7);
scene.add(blueLight);

const undersideLight = new THREE.PointLight(0x8fe9ff, 18, 18, 2);
undersideLight.position.set(0, -4, 0);
scene.add(undersideLight);

const rig = new THREE.Group();
scene.add(rig);

const boardMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x74abc8,
  metalness: 0.72,
  roughness: 0.2,
  clearcoat: 0.95,
  clearcoatRoughness: 0.07,
  reflectivity: 0.85,
  specularIntensity: 0.8,
  specularColor: new THREE.Color(0xdff7ff),
  sheen: 0.18,
  sheenColor: new THREE.Color(0x9ee8ff),
  sheenRoughness: 0.28,
  emissive: new THREE.Color(0x12384f),
  emissiveIntensity: 0.12,
  side: THREE.DoubleSide,
});

const boardSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x123b82,
  metalness: 0.62,
  roughness: 0.3,
  clearcoat: 0.72,
  clearcoatRoughness: 0.16,
  emissive: new THREE.Color(0x071d4e),
  emissiveIntensity: 0.18,
});

const rimMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x123977,
  metalness: 0.78,
  roughness: 0.24,
  clearcoat: 0.82,
  clearcoatRoughness: 0.1,
  emissive: new THREE.Color(0x06183c),
  emissiveIntensity: 0.12,
});

const levelGroup = new THREE.Group();
rig.add(levelGroup);

const startPosition = new THREE.Vector2();
const goalPosition = new THREE.Vector2();
const unlockPosition = new THREE.Vector2();
const marblePosition = new THREE.Vector2();
const marbleVelocity = new THREE.Vector2();
const holes = [];
const keys = new Set();

let level = 1;
let boardRadius = 4.55;
let holeRadius = 0.62;
let holeCount = 6;
let roundDuration = ROUND_SECONDS;
let currentMaxTilt = MAX_TILT;
let currentAcceleration = 8.8;
let currentDamping = 0.58;
let currentMaxSpeed = 5.75;
let keyCaptureRadius = 0.72;
let goalCaptureRadius = 0.65;
let state = "intro";
let stateElapsed = 0;
let unlockAnimationActive = false;
let unlockAnimationElapsed = 0;
let timeRemaining = ROUND_SECONDS;
let paused = false;
let bounceHeight = 3;
let bounceVelocity = -0.35;
let bounceCount = 0;
let goalPulse = 0;
let currentLayoutSeed = 0;
let boardMesh;
let rimMesh;
let gridMinor;
let gridMajor;
let startPad;
let goalPad;
let goalReceiver;
let goalRing;
let goalAura;
let goalBeacon;
let goalLight;
let goalLockIcon;
let unlockCube;
let unlockCore;
let unlockEdges;
let unlockHalo;
let unlockBeam;
let unlockLight;
let unlockEffect;
let unlockEnergy;
let marble;
let shatterGroup;
let goalUnlocked = false;
let fallTarget;
let fallHazard;
let fallReason = "";
let lockedReminderCooldown = 0;
let cubePulse = 0;
let rollingAudio;
let audioContext;
let sfxInput;
let sfxDelay;
let sfxFeedback;
let sfxReverb;
let musicMuted = false;
let touchStart;
let touchTilt = new THREE.Vector2();

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, min, max) {
  return min + (max - min) * random();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        if (![boardMaterial, boardSideMaterial, rimMaterial].includes(material)) material.dispose();
      });
    } else if (child.material && ![boardMaterial, boardSideMaterial, rimMaterial].includes(child.material)) {
      child.material.dispose();
    }
  });
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

function setLevelParameters() {
  const difficulty = (level - 1) / (MAX_LEVELS - 1);
  const difficultyCurve = Math.pow(difficulty, 1.15);
  boardRadius = THREE.MathUtils.lerp(4.55, 7.35, difficulty);
  if (level === 1) {
    holeCount = 5;
    holeRadius = 0.58;
    roundDuration = ROUND_SECONDS;
    currentMaxTilt = MAX_TILT;
    currentAcceleration = 8.8;
    currentDamping = 0.58;
    currentMaxSpeed = 5.75;
    keyCaptureRadius = 0.72;
    goalCaptureRadius = 0.65;
  } else {
    holeCount = Math.round(THREE.MathUtils.lerp(10, 44, difficultyCurve));
    holeRadius = THREE.MathUtils.lerp(0.66, 1.02, Math.pow(difficulty, 1.08));
    roundDuration = THREE.MathUtils.lerp(19, 14, Math.pow(difficulty, 1.05));
    currentMaxTilt = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(11.5, 14, difficulty));
    currentAcceleration = THREE.MathUtils.lerp(9.5, 11, difficulty);
    currentDamping = THREE.MathUtils.lerp(0.54, 0.4, difficulty);
    currentMaxSpeed = THREE.MathUtils.lerp(6.15, 7.5, difficulty);
    keyCaptureRadius = THREE.MathUtils.lerp(0.68, 0.54, difficulty);
    goalCaptureRadius = THREE.MathUtils.lerp(0.62, 0.5, difficulty);
  }
  if (level === MAX_LEVELS) holeCount += 2;
  currentLayoutSeed = 0x51a7 + level * 0x9e37;

  levelPill.textContent = `LEVEL ${String(level).padStart(2, "0")} / ${MAX_LEVELS}`;
  levelProgress.style.width = `${(level / MAX_LEVELS) * 100}%`;

  const cameraScale = 1 + (boardRadius - 4.55) * 0.16;
  camera.position.set(0, 12.2 * cameraScale, 9.2 * cameraScale);
  camera.lookAt(0, 0, 0);
}

function randomPointOnBoard(random, edgeBias = 0.7) {
  const angle = random() * Math.PI * 2;
  const radius = boardRadius * (edgeBias + random() * 0.12);
  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function generateStartAndGoal(random) {
  const difficulty = (level - 1) / (MAX_LEVELS - 1);
  const returnTripProgress = THREE.MathUtils.smoothstep(difficulty, 0.08, 1);
  const startAngle = random() * Math.PI * 2;
  const homeRadius = boardRadius * THREE.MathUtils.lerp(0.7, 0.8, difficulty);
  startPosition.set(Math.cos(startAngle) * homeRadius, Math.sin(startAngle) * homeRadius);

  if (level === 1) {
    const goalAngle = startAngle + Math.PI;
    goalPosition.set(Math.cos(goalAngle) * homeRadius, Math.sin(goalAngle) * homeRadius);
    return;
  }

  // As the campaign advances, the locked receiver migrates back toward the
  // launch pad. The player must cross the arena for the key and then reverse
  // the entire route instead of completing a convenient one-way trip.
  const separation = THREE.MathUtils.lerp(
    Math.PI * 0.92,
    0.24,
    Math.pow(returnTripProgress, 0.86),
  );
  const side = level % 2 === 0 ? 1 : -1;
  const goalAngle = startAngle + separation * side;
  const goalRadius = homeRadius - boardRadius * THREE.MathUtils.lerp(0.08, 0.012, returnTripProgress);
  goalPosition.set(Math.cos(goalAngle) * goalRadius, Math.sin(goalAngle) * goalRadius);
}

function generateUnlockPosition(random) {
  const route = goalPosition.clone().sub(startPosition);
  const routeLength = route.length() || 1;
  const direction = route.clone().multiplyScalar(1 / routeLength);
  const perpendicular = new THREE.Vector2(-direction.y, direction.x);

  if (level === 1) {
    unlockPosition.copy(startPosition).lerp(goalPosition, 0.5);
    return;
  }

  const difficulty = (level - 1) / (MAX_LEVELS - 1);
  const returnTripProgress = THREE.MathUtils.smoothstep(difficulty, 0.08, 1);
  const routeProgress = randomBetween(random, 0.38, 0.62);
  const detourSide = level % 2 === 0 ? 1 : -1;
  const guidedPosition = startPosition
    .clone()
    .lerp(goalPosition, routeProgress)
    .addScaledVector(
      perpendicular,
      boardRadius * THREE.MathUtils.lerp(0.16, 0.34, Math.min(1, difficulty / 0.32)) * detourSide,
    );

  const guidedSafeRadius = boardRadius * 0.74;
  if (guidedPosition.length() > guidedSafeRadius) guidedPosition.setLength(guidedSafeRadius);

  const homeCenter = startPosition.clone().add(goalPosition).multiplyScalar(0.5);
  const awayDirection = homeCenter.lengthSq() > 0.001
    ? homeCenter.normalize().multiplyScalar(-1)
    : startPosition.clone().normalize().multiplyScalar(-1);
  const arcDirection = new THREE.Vector2(-awayDirection.y, awayDirection.x);
  const farPosition = awayDirection
    .multiplyScalar(boardRadius * THREE.MathUtils.lerp(0.76, 0.9, returnTripProgress))
    .addScaledVector(
      arcDirection,
      Math.sin(level * 1.73) * boardRadius * THREE.MathUtils.lerp(0.12, 0.035, returnTripProgress),
    );
  const maximumKeyRadius = boardRadius * 0.91;
  if (farPosition.length() > maximumKeyRadius) farPosition.setLength(maximumKeyRadius);

  const farKeyBlend = THREE.MathUtils.smoothstep(difficulty, 0.05, 0.48);
  unlockPosition.copy(guidedPosition).lerp(farPosition, farKeyBlend);
}

function validHazardCandidate(hazard, minGap) {
  const difficulty = (level - 1) / (MAX_LEVELS - 1);
  const startClearance = THREE.MathUtils.lerp(1.18, 0.72, Math.pow(difficulty, 1.05));
  const goalClearance = THREE.MathUtils.lerp(1.18, 0.68, Math.pow(difficulty, 1.05));
  const keyClearance = THREE.MathUtils.lerp(1.12, 0.62, Math.pow(difficulty, 1.05));
  if (Math.hypot(hazard.x, hazard.z) > boardRadius - hazard.r - 0.28) return false;
  if (Math.hypot(hazard.x - startPosition.x, hazard.z - startPosition.y) < hazard.r + startClearance) return false;
  if (Math.hypot(hazard.x - goalPosition.x, hazard.z - goalPosition.y) < hazard.r + goalClearance) return false;
  if (Math.hypot(hazard.x - unlockPosition.x, hazard.z - unlockPosition.y) < hazard.r + keyClearance) return false;
  return holes.every(
    (other) => Math.hypot(hazard.x - other.x, hazard.z - other.z) > other.r + hazard.r + minGap,
  );
}

function generateHoles(random) {
  holes.length = 0;
  const dx = goalPosition.x - startPosition.x;
  const dz = goalPosition.y - startPosition.y;
  const distance = Math.hypot(dx, dz) || 1;
  const perpendicularX = -dz / distance;
  const perpendicularZ = dx / distance;
  const difficulty = (level - 1) / (MAX_LEVELS - 1);
  const minGap = level === 1 ? 0.76 : THREE.MathUtils.lerp(0.46, 0.02, Math.pow(difficulty, 1.05));
  const blockerCount = level === 1 ? 1 : Math.round(THREE.MathUtils.lerp(3, 14, Math.pow(difficulty, 1.1)));

  // Hard stages use paired cutouts as slalom gates on both mandatory route
  // legs. At level 20 the clear opening is only 0.72 units across, versus a
  // 0.62-unit marble, so carrying excess speed through a gate is dangerous.
  if (level >= 7) {
    const corridorDifficulty = THREE.MathUtils.smoothstep(difficulty, 0.28, 1);
    const gateGap = THREE.MathUtils.lerp(1.12, 0.68, corridorDifficulty);
    const gatesPerLeg = Math.round(THREE.MathUtils.lerp(2, 5, corridorDifficulty));
    const addRouteGates = (from, to, phase) => {
      const routeVector = to.clone().sub(from);
      const routeDistance = routeVector.length() || 1;
      const routeDirection = routeVector.multiplyScalar(1 / routeDistance);
      const routePerpendicular = new THREE.Vector2(-routeDirection.y, routeDirection.x);

      for (let gateIndex = 0; gateIndex < gatesPerLeg; gateIndex += 1) {
        const progress = (gateIndex + 1) / (gatesPerLeg + 1);
        const center = from.clone().lerp(to, progress);
        const gateRadius = holeRadius * randomBetween(random, 1.02, 1.34);
        const halfSpan = gateRadius + gateGap * 0.5;
        const weave = Math.sin((gateIndex + phase) * Math.PI * 0.72)
          * THREE.MathUtils.lerp(0.18, 0.42, corridorDifficulty);
        center.addScaledVector(routePerpendicular, weave);

        for (const side of [-1, 1]) {
          const hazard = {
            x: center.x + routePerpendicular.x * halfSpan * side,
            z: center.y + routePerpendicular.y * halfSpan * side,
            r: gateRadius,
          };
          if (validHazardCandidate(hazard, Math.max(0.02, minGap * 0.18))) holes.push(hazard);
        }
      }
    };

    addRouteGates(startPosition, unlockPosition, 0);
    addRouteGates(unlockPosition, goalPosition, 1);
  }

  for (let index = 0; index < blockerCount; index += 1) {
    const progress = (index + 1) / (blockerCount + 1);
    const centerX = startPosition.x + dx * progress;
    const centerZ = startPosition.y + dz * progress;
    const side = index % 2 === 0 ? 1 : -1;
    const offsetStrength = THREE.MathUtils.lerp(0.7, 0.03, Math.pow(difficulty, 1.05));
    const offset = side * offsetStrength * randomBetween(random, 0.55, 1);
    const blockerRadius = holeRadius * THREE.MathUtils.lerp(1.1, 1.5, difficulty);
    const hazard = {
      x: centerX + perpendicularX * offset,
      z: centerZ + perpendicularZ * offset,
      r: blockerRadius,
    };
    if (validHazardCandidate(hazard, minGap * 0.65)) holes.push(hazard);
  }

  let attempts = 0;
  while (holes.length < holeCount && attempts < 3200) {
    attempts += 1;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (boardRadius - holeRadius - 0.45);
    const sizeJitter = randomBetween(random, 0.9, 1.16 + level * 0.008);
    const candidate = {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      r: holeRadius * sizeJitter,
    };
    if (validHazardCandidate(candidate, minGap)) holes.push(candidate);
  }
}

function buildBoardGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, boardRadius, 0, Math.PI * 2, false);

  holes.forEach((hole) => {
    const cutout = new THREE.Path();
    cutout.absarc(hole.x, -hole.z, hole.r, 0, Math.PI * 2, true);
    shape.holes.push(cutout);
  });

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BOARD_THICKNESS,
    bevelEnabled: false,
    curveSegments: 72,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function segmentIsVisible(x, z) {
  if (Math.hypot(x, z) > boardRadius - 0.07) return false;
  return holes.every((hole) => Math.hypot(x - hole.x, z - hole.z) > hole.r + 0.035);
}

function createGrid(spacing, opacity, color, lineStep) {
  const positions = [];
  const limit = Math.ceil(boardRadius / spacing) * spacing;

  for (let fixed = -limit; fixed <= limit + 0.001; fixed += spacing) {
    for (let variable = -boardRadius; variable < boardRadius; variable += lineStep) {
      const next = Math.min(variable + lineStep, boardRadius);
      const middle = (variable + next) * 0.5;
      if (segmentIsVisible(fixed, middle)) positions.push(fixed, SURFACE_Y + 0.014, variable, fixed, SURFACE_Y + 0.014, next);
      if (segmentIsVisible(middle, fixed)) positions.push(variable, SURFACE_Y + 0.015, fixed, next, SURFACE_Y + 0.015, fixed);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geometry, material);
}

function createLockTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);
  context.strokeStyle = "#d9f7ff";
  context.fillStyle = "#d9f7ff";
  context.lineWidth = 27;
  context.lineCap = "round";
  context.beginPath();
  context.arc(128, 101, 51, Math.PI, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.roundRect(54, 101, 148, 112, 22);
  context.fill();
  context.fillStyle = "#183d72";
  context.beginPath();
  context.arc(128, 151, 14, 0, Math.PI * 2);
  context.fill();
  context.fillRect(119, 151, 18, 30);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWhiteCubeMaterials(emissiveIntensity = 1.5) {
  const faces = [
    [0xf7ffff, 0xc6e8ef],
    [0xc7d9e2, 0x8db7c7],
    [0xffffff, 0xf2ffff],
    [0xaabec9, 0x7397a8],
    [0xebfaff, 0xbdeaf4],
    [0xd0e1e8, 0x92b9c7],
  ];
  return faces.map(([color, emissive]) => new THREE.MeshPhysicalMaterial({
    color,
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    metalness: 0.34,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    transparent: true,
    opacity: 0.98,
  }));
}

function createPad(position, isGoal) {
  const group = new THREE.Group();
  group.position.set(position.x, 0, position.y);

  if (!isGoal) {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.64, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x79d8ec,
        metalness: 0.48,
        roughness: 0.3,
        clearcoat: 0.8,
        transparent: true,
        opacity: 0.68,
        emissive: new THREE.Color(0x106583),
        emissiveIntensity: 0.36,
      }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = SURFACE_Y + 0.021;
    group.add(pad);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.57, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xb7f8ff, transparent: true, opacity: 0.72 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = SURFACE_Y + 0.03;
    group.add(ring);
    return group;
  }

  const receiver = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.72, 0.075, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.18,
      roughness: 0.1,
      clearcoat: 1,
      emissive: new THREE.Color(0xe9fcff),
      emissiveIntensity: 2.8,
    }),
  );
  receiver.position.y = SURFACE_Y + 0.05;
  receiver.receiveShadow = true;
  group.add(receiver);
  goalReceiver = receiver;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.79, 0.055, 10, 72),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = SURFACE_Y + 0.09;
  group.add(ring);
  goalRing = ring;

  const aura = new THREE.Mesh(
    new THREE.RingGeometry(0.76, 1.22, 72),
    new THREE.MeshBasicMaterial({
      color: 0xf4feff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = SURFACE_Y + 0.055;
  group.add(aura);
  goalAura = aura;

  const beacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.34, 0.34),
    createWhiteCubeMaterials(2.25),
  );
  beacon.position.y = SURFACE_Y + 1.12;
  group.add(beacon);
  goalBeacon = beacon;

  const light = new THREE.PointLight(0xf4feff, 27, 6.2, 1.8);
  light.position.y = SURFACE_Y + 0.48;
  group.add(light);
  goalLight = light;

  const lockIcon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.58),
    new THREE.MeshBasicMaterial({
      map: createLockTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  lockIcon.rotation.x = -Math.PI / 2;
  lockIcon.position.y = SURFACE_Y + 0.095;
  lockIcon.renderOrder = 4;
  group.add(lockIcon);
  goalLockIcon = lockIcon;
  return group;
}

function createUnlockCube() {
  const group = new THREE.Group();
  group.position.set(unlockPosition.x, 0, unlockPosition.y);

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.48, 0.48),
    createWhiteCubeMaterials(1.8),
  );
  core.position.y = SURFACE_Y + 0.76;
  core.castShadow = true;
  group.add(core);
  unlockCore = core;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(core.geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }),
  );
  core.add(edges);
  unlockEdges = edges;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.53, 0.04, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0x8dffff, transparent: true, opacity: 0.86 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = SURFACE_Y + 0.11;
  group.add(halo);
  unlockHalo = halo;

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.43, 0.82, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x40e9ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  beam.position.y = SURFACE_Y + 0.43;
  group.add(beam);
  unlockBeam = beam;

  const light = new THREE.PointLight(0x45efff, 15, 4.2, 2);
  light.position.y = SURFACE_Y + 0.62;
  group.add(light);
  unlockLight = light;
  return group;
}

function createUnlockEffect() {
  unlockEffect = new THREE.Group();
  levelGroup.add(unlockEffect);

  unlockEnergy = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  unlockEnergy.position.set(unlockPosition.x, SURFACE_Y + 0.76, unlockPosition.y);
  unlockEffect.add(unlockEnergy);

  const random = mulberry32(currentLayoutSeed ^ 0x93e71);
  for (let index = 0; index < 24; index += 1) {
    const particle = new THREE.Mesh(
      new THREE.IcosahedronGeometry(randomBetween(random, 0.025, 0.065), 0),
      new THREE.MeshBasicMaterial({
        color: index % 4 === 0 ? 0x8ff6ff : 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    particle.position.copy(unlockEnergy.position);
    const angle = random() * Math.PI * 2;
    const speed = randomBetween(random, 0.55, 1.65);
    particle.userData.direction = new THREE.Vector3(
      Math.cos(angle) * speed,
      randomBetween(random, 0.35, 1.5),
      Math.sin(angle) * speed,
    );
    particle.userData.delay = randomBetween(random, 0, 0.12);
    unlockEffect.add(particle);
  }
}

function removeUnlockEffect() {
  if (!unlockEffect) return;
  levelGroup.remove(unlockEffect);
  disposeObject(unlockEffect);
  unlockEffect = undefined;
  unlockEnergy = undefined;
  unlockAnimationActive = false;
  unlockAnimationElapsed = 0;
}

function setGoalUnlocked(unlocked) {
  goalUnlocked = unlocked;
  if (!goalReceiver) return;

  goalReceiver.material.color.setHex(unlocked ? 0xffffff : 0x31557d);
  goalReceiver.material.emissive.setHex(unlocked ? 0xe9fcff : 0x0c2346);
  goalReceiver.material.emissiveIntensity = unlocked ? 2.8 : 0.18;
  goalReceiver.material.roughness = unlocked ? 0.1 : 0.38;
  goalRing.visible = unlocked;
  goalAura.visible = unlocked;
  goalBeacon.visible = unlocked;
  goalLight.visible = unlocked;
  goalLockIcon.visible = !unlocked;

  keyStep.classList.toggle("is-active", !unlocked);
  keyStep.classList.toggle("is-complete", unlocked);
  keyStep.textContent = unlocked ? "01 KEY ACQUIRED" : "01 FIND KEY CUBE";
  goalStep.classList.toggle("is-locked", !unlocked);
  goalStep.classList.toggle("is-active", unlocked);
  goalStep.textContent = unlocked ? "02 ENTER RECEIVER" : "02 RECEIVER LOCKED";
  root.dataset.gate = unlocked ? "open" : "locked";
}

function createMarble() {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(MARBLE_RADIUS, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xdff8ff,
      metalness: 0.86,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      reflectivity: 1,
      specularIntensity: 1,
      specularColor: new THREE.Color(0xffffff),
      emissive: new THREE.Color(0x172837),
      emissiveIntensity: 0.18,
    }),
  );
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  return sphere;
}

function buildLevel() {
  clearGroup(levelGroup);
  removeShatter();
  goalReceiver = undefined;
  goalRing = undefined;
  goalAura = undefined;
  goalBeacon = undefined;
  goalLight = undefined;
  goalLockIcon = undefined;
  unlockCube = undefined;
  unlockCore = undefined;
  unlockEdges = undefined;
  unlockHalo = undefined;
  unlockBeam = undefined;
  unlockLight = undefined;
  unlockEffect = undefined;
  unlockEnergy = undefined;

  setLevelParameters();
  const random = mulberry32(currentLayoutSeed);
  generateStartAndGoal(random);
  generateUnlockPosition(random);
  generateHoles(random);

  boardMesh = new THREE.Mesh(buildBoardGeometry(), [boardMaterial, boardSideMaterial]);
  boardMesh.castShadow = true;
  boardMesh.receiveShadow = true;
  levelGroup.add(boardMesh);

  rimMesh = new THREE.Mesh(new THREE.TorusGeometry(boardRadius - 0.025, 0.105, 8, 128), rimMaterial);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = SURFACE_Y - 0.13;
  levelGroup.add(rimMesh);

  gridMinor = createGrid(0.38, 0.21, 0x7feeff, 0.12);
  levelGroup.add(gridMinor);
  gridMajor = createGrid(1.9, 0.34, 0xa5f6ff, 0.12);
  levelGroup.add(gridMajor);

  startPad = createPad(startPosition, false);
  goalPad = createPad(goalPosition, true);
  unlockCube = createUnlockCube();
  levelGroup.add(startPad, goalPad, unlockCube);
  setGoalUnlocked(false);

  marble = createMarble();
  levelGroup.add(marble);

  marblePosition.copy(startPosition);
  marbleVelocity.set(0, 0);
  marble.scale.setScalar(1);
  bounceHeight = 3;
  bounceVelocity = -0.35;
  bounceCount = 0;
  marble.position.set(marblePosition.x, SURFACE_Y + MARBLE_RADIUS + bounceHeight, marblePosition.y);

  rig.rotation.set(0, 0, 0);
  timeRemaining = roundDuration;
  countdown.textContent = roundDuration.toFixed(1);
  countdown.classList.remove("is-low");
  fallTarget = undefined;
  fallHazard = undefined;
  fallReason = "";
  lockedReminderCooldown = 0;
  statusPill.textContent = "Find the key cube · receiver locked";
  stateElapsed = 0;
  updateLevelVisibility(true);
}

function updateLevelVisibility(visible) {
  if (boardMesh) boardMesh.visible = visible;
  if (rimMesh) rimMesh.visible = visible;
  if (gridMinor) gridMinor.visible = visible;
  if (gridMajor) gridMajor.visible = visible;
  if (startPad) startPad.visible = visible;
  if (goalPad) goalPad.visible = visible;
  if (unlockCube) unlockCube.visible = visible && !goalUnlocked;
}

function resetLevel() {
  hideOverlays();
  objectiveGuide.classList.remove("is-unlocking");
  buildLevel();
  state = "playing";
  paused = false;
  menuOverlay.classList.add("hidden");
  statusPill.textContent = "Find the key cube · receiver locked";
  root.scrollTop = 0;
  root.scrollLeft = 0;
  root.focus({ preventScroll: true });
}

function hideOverlays() {
  intro.classList.add("hidden");
  complete.classList.add("hidden");
  failed.classList.add("hidden");
  menuOverlay.classList.add("hidden");
}

function showPlayingUi() {
  restartButton.classList.remove("hidden");
  menuButton.classList.remove("hidden");
  hint.classList.remove("hidden");
  objectiveGuide.classList.remove("hidden");
}

function pointInHole(x, z) {
  // A sphere remains supported until its center of mass has rolled just beyond
  // the inner lip. Keep this geometric threshold consistent across levels so
  // the rim feels physical rather than changing its collision rules.
  const rimInset = MARBLE_RADIUS * 0.16;
  return holes.find(
    (hole) => Math.hypot(x - hole.x, z - hole.z) < hole.r - rimInset,
  );
}

function inputVector() {
  let horizontal = 0;
  let vertical = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) horizontal -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) horizontal += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) vertical -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) vertical += 1;
  horizontal = THREE.MathUtils.clamp(horizontal + touchTilt.x, -1, 1);
  vertical = THREE.MathUtils.clamp(vertical + touchTilt.y, -1, 1);
  return { horizontal, vertical };
}

function updateBoardTilt(delta) {
  const input = inputVector();
  const targetX = input.vertical * currentMaxTilt;
  const targetZ = -input.horizontal * currentMaxTilt;
  const response = 1 - Math.exp(-delta * 5.4);
  rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, targetX, response);
  rig.rotation.z = THREE.MathUtils.lerp(rig.rotation.z, targetZ, response);
}

function beginFall(reason, hazard) {
  if (state !== "playing") return;
  state = "falling";
  stateElapsed = 0;
  fallReason = reason;
  fallTarget = hazard ? new THREE.Vector2(hazard.x, hazard.z) : undefined;
  fallHazard = hazard;
  bounceVelocity = reason === "hole" ? -0.08 : -1.4;
  statusPill.textContent = reason === "hole" ? "Cutout detected" : "Marble lost";
  setRollingVolume(0);
}

function collectUnlockCube() {
  if (goalUnlocked || state !== "playing") return;
  unlockAnimationActive = true;
  unlockAnimationElapsed = 0;
  setGoalUnlocked(true);
  createUnlockEffect();
  objectiveGuide.classList.add("is-unlocking");
  statusPill.textContent = "Key acquired · opening portal";

  goalReceiver.scale.set(0.08, 0.35, 0.08);
  goalRing.scale.setScalar(0.01);
  goalAura.scale.setScalar(0.01);
  goalBeacon.scale.setScalar(0.01);
  goalLight.intensity = 0;
  goalLockIcon.visible = true;
  goalLockIcon.scale.setScalar(1);
  setRollingVolume(0);
  playUnlockSound();
}

function updateUnlock(delta) {
  unlockAnimationElapsed += delta * UNLOCK_ANIMATION_SPEED;
  const capture = THREE.MathUtils.clamp(unlockAnimationElapsed / 0.46, 0, 1);
  const burst = THREE.MathUtils.clamp((unlockAnimationElapsed - 0.08) / 0.48, 0, 1);
  const travel = THREE.MathUtils.clamp((unlockAnimationElapsed - 0.24) / 0.68, 0, 1);
  const opening = THREE.MathUtils.clamp((unlockAnimationElapsed - 0.68) / 0.72, 0, 1);
  const captureEase = 1 - Math.pow(1 - capture, 3);
  const travelEase = travel * travel * (3 - 2 * travel);
  const openingEase = 1 - Math.pow(1 - opening, 3);

  if (unlockCore) {
    const width = Math.max(0.025, 1 - captureEase * 0.975);
    const height = Math.max(0.025, 1 + Math.sin(capture * Math.PI) * 0.5 - captureEase * 0.975);
    unlockCore.scale.set(width, height, width);
    unlockCore.rotation.x += delta * (4 + capture * 16);
    unlockCore.rotation.y += delta * (6 + capture * 22);
    const materials = Array.isArray(unlockCore.material) ? unlockCore.material : [unlockCore.material];
    materials.forEach((material) => { material.opacity = Math.max(0, 1 - captureEase); });
  }
  if (unlockHalo) {
    unlockHalo.scale.setScalar(1 + captureEase * 2.8);
    unlockHalo.material.opacity = capture < 0.72 ? Math.max(0, 0.84 * (1 - captureEase * 1.55)) : 0;
    unlockHalo.visible = capture < 0.72;
    unlockHalo.rotation.z += delta * 4.8;
  }
  if (unlockEdges) unlockEdges.material.opacity = Math.max(0, 0.95 * (1 - captureEase));
  if (unlockBeam) {
    unlockBeam.scale.y = Math.max(0.02, 1 - captureEase);
    unlockBeam.material.opacity = capture < 0.68 ? Math.max(0, 0.16 * (1 - captureEase * 1.6)) : 0;
    unlockBeam.visible = capture < 0.68;
  }
  if (unlockLight) {
    const lightFadeProgress = THREE.MathUtils.clamp((unlockAnimationElapsed - 0.02) / 0.58, 0, 1);
    const lightFade = 1 - lightFadeProgress * lightFadeProgress * (3 - 2 * lightFadeProgress);
    unlockLight.intensity = 15 * Math.max(0, lightFade);
  }

  // Remove the captured marker as soon as its dissolve finishes. Leaving the
  // parent group alive through the portal travel used to expose a late ring and
  // a patch of light on some layouts (most noticeably level 2).
  if (unlockCube && capture >= 0.92) unlockCube.visible = false;

  if (unlockEffect) {
    unlockEffect.children.slice(1).forEach((particle) => {
      const localTime = THREE.MathUtils.clamp((burst - particle.userData.delay) / (1 - particle.userData.delay), 0, 1);
      particle.position.set(
        unlockPosition.x + particle.userData.direction.x * localTime,
        SURFACE_Y + 0.76 + particle.userData.direction.y * localTime - localTime * localTime * 0.55,
        unlockPosition.y + particle.userData.direction.z * localTime,
      );
      particle.material.opacity = Math.sin(localTime * Math.PI) * 0.95;
      particle.scale.setScalar(1 + localTime * 1.7);
    });
  }

  if (unlockEnergy) {
    unlockEnergy.visible = unlockAnimationElapsed >= 0.18 && travel < 1;
    unlockEnergy.position.set(
      THREE.MathUtils.lerp(unlockPosition.x, goalPosition.x, travelEase),
      SURFACE_Y + 0.76 + Math.sin(travel * Math.PI) * 1.05,
      THREE.MathUtils.lerp(unlockPosition.y, goalPosition.y, travelEase),
    );
    unlockEnergy.material.opacity = Math.sin(Math.min(travel * 1.12, 1) * Math.PI) * 0.98;
    const energyScale = 0.85 + Math.sin(unlockAnimationElapsed * 24) * 0.22;
    unlockEnergy.scale.setScalar(energyScale);
    unlockEnergy.rotation.x += delta * 8;
    unlockEnergy.rotation.y += delta * 11;
  }

  const portalScale = openingEase * (1 + Math.sin(opening * Math.PI) * 0.13);
  goalReceiver.scale.set(Math.max(0.08, portalScale), 0.35 + openingEase * 0.65, Math.max(0.08, portalScale));
  goalRing.scale.setScalar(Math.max(0.01, portalScale));
  goalAura.scale.setScalar(Math.max(0.01, portalScale * 1.12));
  goalBeacon.scale.setScalar(Math.max(0.01, openingEase));
  goalBeacon.rotation.x += delta * (2.5 + opening * 4);
  goalBeacon.rotation.y += delta * (4 + opening * 5);
  goalLight.intensity = 27 * openingEase;
  goalRing.material.opacity = openingEase;
  goalAura.material.opacity = openingEase * 0.46;
  goalLockIcon.scale.setScalar(Math.max(0.01, 1 - openingEase));
  goalLockIcon.material.opacity = Math.max(0, 1 - openingEase * 1.35);
  if (opening > 0.74) goalLockIcon.visible = false;

  if (unlockAnimationElapsed >= 1.48) {
    unlockAnimationActive = false;
    unlockAnimationElapsed = 0;
    if (unlockCube) unlockCube.visible = false;
    if (unlockLight) unlockLight.intensity = 0;
    removeUnlockEffect();
    objectiveGuide.classList.remove("is-unlocking");
    if (state === "playing") statusPill.textContent = "Gate open · enter the receiver";
    goalReceiver.scale.set(1, 1, 1);
    goalRing.scale.setScalar(1);
    goalAura.scale.setScalar(1);
    goalBeacon.scale.setScalar(1);
    goalLight.intensity = 27;
  }
}

function beginGoal() {
  if (state !== "playing") return;
  state = "goal";
  stateElapsed = 0;
  marbleVelocity.multiplyScalar(0.12);
  if (goalBeacon) {
    goalBeacon.visible = true;
    goalBeacon.scale.setScalar(1);
    const beaconMaterials = Array.isArray(goalBeacon.material) ? goalBeacon.material : [goalBeacon.material];
    beaconMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.98;
    });
  }
  statusPill.textContent = "Receiver reached";
  setRollingVolume(0);
  playCompletionArpeggio();
}

function updateMarble(delta) {
  const input = inputVector();
  const acceleration = currentAcceleration;
  marbleVelocity.x += input.horizontal * acceleration * delta;
  marbleVelocity.y += input.vertical * acceleration * delta;

  const damping = Math.exp(-currentDamping * delta);
  marbleVelocity.multiplyScalar(damping);
  const speed = marbleVelocity.length();
  const maxSpeed = currentMaxSpeed;
  if (speed > maxSpeed) marbleVelocity.multiplyScalar(maxSpeed / speed);

  marblePosition.addScaledVector(marbleVelocity, delta);

  if (bounceHeight > 0 || bounceVelocity !== 0) {
    bounceVelocity -= 16.5 * delta;
    bounceHeight += bounceVelocity * delta;
    if (bounceHeight <= 0) {
      const impactSpeed = Math.abs(bounceVelocity);
      bounceHeight = 0;
      if (bounceCount === 0) playLandingImpact(impactSpeed);
      if (bounceCount < 2 && Math.abs(bounceVelocity) > 1.4) {
        bounceVelocity = Math.abs(bounceVelocity) * (bounceCount === 0 ? 0.42 : 0.25);
        bounceCount += 1;
      } else {
        bounceVelocity = 0;
      }
    }
  }

  marble.position.set(marblePosition.x, SURFACE_Y + MARBLE_RADIUS + bounceHeight, marblePosition.y);
  marble.rotation.z -= marbleVelocity.x * delta / MARBLE_RADIUS;
  marble.rotation.x += marbleVelocity.y * delta / MARBLE_RADIUS;

  const onSurface = bounceHeight < 0.08;
  if (onSurface) {
    const hazard = pointInHole(marblePosition.x, marblePosition.y);
    if (hazard) beginFall("hole", hazard);
    else if (marblePosition.length() > boardRadius - MARBLE_RADIUS * 0.42) beginFall("edge");
    else if (!goalUnlocked && marblePosition.distanceTo(unlockPosition) < keyCaptureRadius) collectUnlockCube();
    else if (marblePosition.distanceTo(goalPosition) < goalCaptureRadius) {
      if (goalUnlocked) beginGoal();
      else if (lockedReminderCooldown <= 0) {
        statusPill.textContent = "Receiver locked · find the key cube";
        lockedReminderCooldown = 1.4;
      }
    }
  }

  lockedReminderCooldown = Math.max(0, lockedReminderCooldown - delta);

  const rollingSpeed = onSurface && state === "playing" ? marbleVelocity.length() : 0;
  setRollingVolume(rollingSpeed);
}

function updateFall(delta) {
  stateElapsed += delta;
  if (fallReason === "hole" && fallTarget && fallHazard) {
    const toCenter = fallTarget.clone().sub(marblePosition);
    const distance = Math.max(toCenter.length(), 0.0001);
    const inward = toCenter.multiplyScalar(1 / distance);
    const overhang = THREE.MathUtils.clamp(
      (fallHazard.r - distance + MARBLE_RADIUS * 0.16) / (MARBLE_RADIUS * 0.9),
      0,
      1,
    );
    const release = THREE.MathUtils.smoothstep(Math.min(stateElapsed / 0.42, 1), 0, 1);

    // Preserve the approach velocity and add only the torque gravity creates at
    // the rim. This lets the marble skim or teeter before dropping instead of
    // snapping toward the center of every opening.
    marbleVelocity.addScaledVector(inward, (1.1 + overhang * 3.4) * delta);
    marbleVelocity.multiplyScalar(Math.exp(-(0.48 + overhang * 0.75) * delta));
    marblePosition.addScaledVector(marbleVelocity, delta);
    bounceVelocity -= THREE.MathUtils.lerp(2.4, 13.8, Math.max(overhang, release)) * delta;
  } else {
    bounceVelocity -= 11.8 * delta;
    marblePosition.addScaledVector(marbleVelocity, delta * 0.92);
  }
  marble.position.x = marblePosition.x;
  marble.position.z = marblePosition.y;
  marble.position.y += bounceVelocity * delta;
  marble.rotation.x += marbleVelocity.y * delta * 2.4;
  marble.rotation.z -= marbleVelocity.x * delta * 2.4;

  if (marble.position.y < -4.5 || stateElapsed > 1.7) {
    state = "overlay";
    failedIcon.textContent = "↓";
    failedTitle.textContent = "Marble lost";
    failedCopy.textContent = "The marble fell from the board.";
    failed.classList.remove("hidden");
  }
}

function updateGoal(delta) {
  stateElapsed += delta;
  const transform = THREE.MathUtils.smoothstep(Math.min(stateElapsed / 0.82, 1), 0, 1);
  const beaconCollapse = THREE.MathUtils.smoothstep(Math.min(stateElapsed / 0.52, 1), 0, 1);
  const hover = THREE.MathUtils.smoothstep(Math.max(Math.min((stateElapsed - 0.58) / 0.32, 1), 0), 0, 1);
  marble.position.x = THREE.MathUtils.lerp(marble.position.x, goalPosition.x, 1 - Math.exp(-delta * 7.2));
  marble.position.z = THREE.MathUtils.lerp(marble.position.z, goalPosition.y, 1 - Math.exp(-delta * 7.2));
  marble.position.y = THREE.MathUtils.lerp(
    marble.position.y,
    SURFACE_Y + 1.12 + Math.sin(stateElapsed * 3.2) * 0.08 * hover,
    1 - Math.exp(-delta * 6.6),
  );
  marble.rotation.y += delta * 4.6;
  marble.rotation.x += delta * 2.2;

  if (goalBeacon) {
    const beaconScale = Math.max(0.001, 1 - beaconCollapse);
    goalBeacon.scale.setScalar(beaconScale);
    const beaconMaterials = Array.isArray(goalBeacon.material) ? goalBeacon.material : [goalBeacon.material];
    beaconMaterials.forEach((material) => { material.opacity = Math.max(0, 0.98 * (1 - beaconCollapse)); });
    if (beaconCollapse >= 0.995) goalBeacon.visible = false;
  }

  marble.material.color.setRGB(
    THREE.MathUtils.lerp(0.87, 1, transform),
    THREE.MathUtils.lerp(0.97, 1, transform),
    1,
  );
  marble.material.emissive.setRGB(transform, transform, transform);
  marble.material.emissiveIntensity = THREE.MathUtils.lerp(0.18, 4.2, transform);
  marble.material.metalness = THREE.MathUtils.lerp(0.86, 0.18, transform);
  marble.material.roughness = THREE.MathUtils.lerp(0.1, 0.035, transform);
  if (goalLight) goalLight.intensity = THREE.MathUtils.lerp(27, 42, transform);

  if (stateElapsed > 1.52) {
    state = "overlay";
    if (level === MAX_LEVELS) {
      completeTitle.textContent = "Skyball complete";
      completeCopy.textContent = "All twenty gates are unlocked. The skyway is clear.";
      againButton.textContent = "PLAY AGAIN";
    } else {
      completeTitle.textContent = "Level complete";
      completeCopy.textContent = "Gate traversed. Ready for the next board.";
      againButton.textContent = "NEXT LEVEL";
    }
    complete.classList.remove("hidden");
  }
}

function makeShardGeometry(innerRadius, outerRadius, startAngle, endAngle) {
  const points = [
    new THREE.Vector2(Math.cos(startAngle) * innerRadius, -Math.sin(startAngle) * innerRadius),
    new THREE.Vector2(Math.cos(startAngle) * outerRadius, -Math.sin(startAngle) * outerRadius),
    new THREE.Vector2(Math.cos(endAngle) * outerRadius, -Math.sin(endAngle) * outerRadius),
  ];
  if (innerRadius > 0.02) {
    points.push(new THREE.Vector2(Math.cos(endAngle) * innerRadius, -Math.sin(endAngle) * innerRadius));
  }

  const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector2()).multiplyScalar(1 / points.length);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x - center.x, points[0].y - center.y);
  points.slice(1).forEach((point) => shape.lineTo(point.x - center.x, point.y - center.y));
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BOARD_THICKNESS,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return { geometry, center };
}

function angleInsideSector(angle, startAngle, endAngle) {
  const fullTurn = Math.PI * 2;
  const relative = ((angle - startAngle) % fullTurn + fullTurn) % fullTurn;
  return relative <= endAngle - startAngle;
}

function createShardGrid(innerRadius, outerRadius, startAngle, endAngle, center, spacing, color, opacity) {
  const positions = [];
  const lineStep = 0.105;
  const limit = Math.ceil(outerRadius / spacing) * spacing;
  const centerX = center.x;
  const centerZ = -center.y;
  const contains = (x, z) => {
    const radius = Math.hypot(x, z);
    if (radius < Math.max(0, innerRadius + 0.018) || radius > outerRadius - 0.018) return false;
    return angleInsideSector(Math.atan2(z, x), startAngle, endAngle);
  };

  for (let fixed = -limit; fixed <= limit + 0.001; fixed += spacing) {
    for (let variable = -outerRadius; variable < outerRadius; variable += lineStep) {
      const next = Math.min(variable + lineStep, outerRadius);
      const middle = (variable + next) * 0.5;
      if (contains(fixed, middle)) {
        positions.push(fixed - centerX, SURFACE_Y + 0.016, variable - centerZ, fixed - centerX, SURFACE_Y + 0.016, next - centerZ);
      }
      if (contains(middle, fixed)) {
        positions.push(variable - centerX, SURFACE_Y + 0.017, fixed - centerZ, next - centerX, SURFACE_Y + 0.017, fixed - centerZ);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geometry, material);
}

function beginShatter() {
  if (state !== "playing") return;
  state = "shattering";
  stateElapsed = 0;
  statusPill.textContent = "Time out";
  updateLevelVisibility(false);
  setRollingVolume(0);
  playGlassShatter();

  shatterGroup = new THREE.Group();
  rig.add(shatterGroup);
  const random = mulberry32(currentLayoutSeed ^ 0xa5a5f00d);
  const ringFractions = [0, 0.28, 0.62, 1];
  const sectorCounts = [7, 11, 16];

  for (let ring = 0; ring < sectorCounts.length; ring += 1) {
    const inner = boardRadius * ringFractions[ring];
    const outer = boardRadius * ringFractions[ring + 1];
    const sectors = sectorCounts[ring];
    const angleOffset = ring % 2 === 0 ? 0 : Math.PI / sectors;
    for (let sector = 0; sector < sectors; sector += 1) {
      const gap = 0.018;
      const startAngle = angleOffset + (sector / sectors) * Math.PI * 2 + gap;
      const endAngle = angleOffset + ((sector + 1) / sectors) * Math.PI * 2 - gap;
      const shardData = makeShardGeometry(inner, outer, startAngle, endAngle);
      const shard = new THREE.Mesh(shardData.geometry, [boardMaterial, boardSideMaterial]);
      shard.position.set(shardData.center.x, 0, -shardData.center.y);
      shard.castShadow = true;
      shard.add(
        createShardGrid(inner, outer, startAngle, endAngle, shardData.center, 0.38, 0x7feeff, 0.32),
        createShardGrid(inner, outer, startAngle, endAngle, shardData.center, 1.9, 0xc5fbff, 0.5),
      );
      const direction = new THREE.Vector3(shard.position.x, 0, shard.position.z).normalize();
      shard.userData.velocity = direction.multiplyScalar(randomBetween(random, 1.4, 4.8));
      shard.userData.velocity.y = randomBetween(random, 1.2, 4.8);
      shard.userData.spin = new THREE.Vector3(
        randomBetween(random, -3.8, 3.8),
        randomBetween(random, -3, 3),
        randomBetween(random, -3.8, 3.8),
      );
      shatterGroup.add(shard);
    }
  }
}

function updateShatter(delta) {
  stateElapsed += delta;
  const slowDelta = delta * 0.32;
  shatterGroup?.children.forEach((shard) => {
    shard.userData.velocity.y -= 7.2 * slowDelta;
    shard.position.addScaledVector(shard.userData.velocity, slowDelta);
    shard.rotation.x += shard.userData.spin.x * slowDelta;
    shard.rotation.y += shard.userData.spin.y * slowDelta;
    shard.rotation.z += shard.userData.spin.z * slowDelta;
  });

  marble.position.y -= 4.2 * slowDelta;
  marble.rotation.x += 3.6 * slowDelta;
  marble.rotation.z -= 2.8 * slowDelta;

  if (stateElapsed > 1.75) {
    state = "overlay";
    failedIcon.textContent = "×";
    failedTitle.textContent = "TIME // OUT";
    failedCopy.textContent = "The suspended stage lost structural lock.";
    failed.classList.remove("hidden");
  }
}

function removeShatter() {
  if (!shatterGroup) return;
  rig.remove(shatterGroup);
  disposeObject(shatterGroup);
  shatterGroup = undefined;
}

function updateGoalVisuals(delta) {
  goalPulse += delta;
  cubePulse += delta;
  if (goalUnlocked && !unlockAnimationActive && goalRing) {
    const scale = 1 + Math.sin(goalPulse * 3.2) * 0.045;
    goalRing.scale.setScalar(scale);
    goalRing.material.opacity = 0.84 + Math.sin(goalPulse * 3.2) * 0.14;
  }
  if (goalUnlocked && !unlockAnimationActive && goalAura) {
    const auraScale = 1 + Math.sin(goalPulse * 2.2) * 0.08;
    goalAura.scale.setScalar(auraScale);
    goalAura.material.opacity = 0.32 + Math.sin(goalPulse * 2.2) * 0.1;
  }
  if (goalUnlocked && !unlockAnimationActive && goalBeacon) {
    goalBeacon.rotation.x += delta * 0.42;
    goalBeacon.rotation.y += delta * 1.6;
    goalBeacon.position.y = SURFACE_Y + 1.12 + Math.sin(goalPulse * 2.4) * 0.14;
  }
  if (!goalUnlocked && unlockCore) {
    unlockCore.rotation.x += delta * 0.72;
    unlockCore.rotation.y += delta * 1.35;
    unlockCore.position.y = SURFACE_Y + 0.76 + Math.sin(cubePulse * 3.1) * 0.12;
  }
  if (!goalUnlocked && unlockHalo) {
    const haloScale = 1 + Math.sin(cubePulse * 3.1) * 0.08;
    unlockHalo.scale.setScalar(haloScale);
    unlockHalo.material.opacity = 0.68 + Math.sin(cubePulse * 3.1) * 0.18;
    unlockHalo.rotation.z += delta * 0.45;
  }
}

function updateTimer(delta) {
  timeRemaining = Math.max(0, timeRemaining - delta);
  countdown.textContent = timeRemaining.toFixed(1);
  countdown.classList.toggle("is-low", timeRemaining <= 7);
  if (timeRemaining <= 0) beginShatter();
}

function createImpulseResponse(context, duration = 6.8, decay = 2.5) {
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let sample = 0; sample < length; sample += 1) {
      data[sample] = (Math.random() * 2 - 1) * Math.pow(1 - sample / length, decay);
    }
  }
  return impulse;
}

function ensureAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.value = 0.78;
  master.connect(audioContext.destination);

  sfxInput = audioContext.createGain();
  const dry = audioContext.createGain();
  dry.gain.value = 0.72;
  sfxInput.connect(dry).connect(master);

  sfxDelay = audioContext.createDelay(2.2);
  sfxDelay.delayTime.value = 0.24;
  sfxFeedback = audioContext.createGain();
  sfxFeedback.gain.value = 0.54;
  sfxInput.connect(sfxDelay);
  sfxDelay.connect(sfxFeedback).connect(sfxDelay);
  sfxDelay.connect(master);

  sfxReverb = audioContext.createConvolver();
  sfxReverb.buffer = createImpulseResponse(audioContext);
  const reverbGain = audioContext.createGain();
  reverbGain.gain.value = 0.82;
  sfxInput.connect(sfxReverb).connect(reverbGain).connect(master);

  // Rolling marble sound is broadband surface contact plus tiny, irregular
  // impacts. The noise bed stays almost fixed in pitch while the micro-impact
  // cadence increases with speed, avoiding the engine-like pitch sweep that a
  // conventional oscillator creates.
  const noiseLength = audioContext.sampleRate * 4;
  const noiseBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  let lowNoise = 0;
  for (let index = 0; index < noiseLength; index += 1) {
    const white = Math.random() * 2 - 1;
    lowNoise = lowNoise * 0.965 + white * 0.035;
    const grain = Math.random() < 0.0018 ? (Math.random() * 2 - 1) * 0.3 : 0;
    noiseData[index] = white * 0.46 + lowNoise * 1.48 + grain;
  }

  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseSource.playbackRate.value = 0.94;

  const impactBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
  const impactData = impactBuffer.getChannelData(0);
  let impactIndex = 0;
  while (impactIndex < noiseLength) {
    impactIndex += Math.floor(520 + Math.random() * 2400);
    const amplitude = 0.28 + Math.random() * 0.72;
    const burstLength = 20 + Math.floor(Math.random() * 54);
    for (let burst = 0; burst < burstLength && impactIndex + burst < noiseLength; burst += 1) {
      impactData[impactIndex + burst] += (Math.random() * 2 - 1) * amplitude * Math.exp(-burst / 11);
    }
  }

  const impactSource = audioContext.createBufferSource();
  impactSource.buffer = impactBuffer;
  impactSource.loop = true;
  impactSource.playbackRate.value = 0.55;

  const rollingBus = audioContext.createDynamicsCompressor();
  rollingBus.threshold.value = -24;
  rollingBus.knee.value = 18;
  rollingBus.ratio.value = 3;
  rollingBus.attack.value = 0.008;
  rollingBus.release.value = 0.16;
  rollingBus.connect(master);

  // Use the supplied real marble recording as the main rolling voice. A
  // dedicated long convolution tail gives it the requested spacious reverb,
  // while the gain node lets gameplay velocity silence it completely at rest.
  const sampleElement = new Audio(marbleRollingUrl);
  sampleElement.loop = true;
  sampleElement.preload = "auto";
  sampleElement.volume = 1;
  const sampleSource = audioContext.createMediaElementSource(sampleElement);
  const sampleTone = audioContext.createBiquadFilter();
  sampleTone.type = "lowpass";
  sampleTone.frequency.value = 5200;
  sampleTone.Q.value = 0.45;
  const sampleGain = audioContext.createGain();
  sampleGain.gain.value = 0;
  const sampleDry = audioContext.createGain();
  sampleDry.gain.value = 0.68;
  const sampleReverb = audioContext.createConvolver();
  sampleReverb.buffer = createImpulseResponse(audioContext, 7.4, 2.15);
  const sampleWet = audioContext.createGain();
  sampleWet.gain.value = 0.92;
  sampleSource.connect(sampleTone).connect(sampleGain);
  sampleGain.connect(sampleDry).connect(rollingBus);
  sampleGain.connect(sampleReverb).connect(sampleWet).connect(rollingBus);

  const contactFilter = audioContext.createBiquadFilter();
  contactFilter.type = "bandpass";
  contactFilter.frequency.value = 430;
  contactFilter.Q.value = 0.82;
  const contactGain = audioContext.createGain();
  contactGain.gain.value = 0;

  const surfaceFilter = audioContext.createBiquadFilter();
  surfaceFilter.type = "bandpass";
  surfaceFilter.frequency.value = 1180;
  surfaceFilter.Q.value = 1.05;
  const surfaceGain = audioContext.createGain();
  surfaceGain.gain.value = 0;

  const edgeFilter = audioContext.createBiquadFilter();
  edgeFilter.type = "highpass";
  edgeFilter.frequency.value = 3050;
  edgeFilter.Q.value = 0.65;
  const edgeGain = audioContext.createGain();
  edgeGain.gain.value = 0;

  const metalFrequencies = [1120, 2380, 4100];
  const metalFilters = metalFrequencies.map((frequency, index) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = [6.5, 8.5, 7.5][index];
    return filter;
  });
  const metalGains = metalFilters.map(() => {
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    return gain;
  });

  const impactFilter = audioContext.createBiquadFilter();
  impactFilter.type = "bandpass";
  impactFilter.frequency.value = 2150;
  impactFilter.Q.value = 1.35;
  const impactGain = audioContext.createGain();
  impactGain.gain.value = 0;

  noiseSource.connect(contactFilter).connect(contactGain).connect(rollingBus);
  noiseSource.connect(surfaceFilter).connect(surfaceGain).connect(rollingBus);
  noiseSource.connect(edgeFilter).connect(edgeGain).connect(rollingBus);
  impactSource.connect(impactFilter).connect(impactGain).connect(rollingBus);
  metalFilters.forEach((filter, index) => {
    noiseSource.connect(filter).connect(metalGains[index]).connect(rollingBus);
  });
  noiseSource.start();
  impactSource.start();

  rollingAudio = {
    sampleElement,
    sampleGain,
    sampleTone,
    noiseSource,
    impactSource,
    contactFilter,
    contactGain,
    surfaceFilter,
    surfaceGain,
    edgeFilter,
    edgeGain,
    impactFilter,
    impactGain,
    metalGains,
  };
}

async function startAudio() {
  ensureAudio();
  const rollingPlayback = rollingAudio.sampleElement.play();
  if (audioContext.state === "suspended") await audioContext.resume();
  try {
    await rollingPlayback;
  } catch (error) {
    console.warn("The supplied marble rolling sound could not start.", error);
  }
  backgroundMusic.volume = 0.5;
  backgroundMusic.muted = musicMuted;
  if (!musicMuted) {
    try {
      await backgroundMusic.play();
      musicButton.classList.remove("has-error");
    } catch (error) {
      console.warn("Skyball background music could not start.", error);
      musicButton.classList.add("has-error");
      musicButton.title = "Music file could not be loaded";
    }
  }
}

function setRollingVolume(speed) {
  if (!rollingAudio || !audioContext) return;
  const now = audioContext.currentTime;
  const normalized = THREE.MathUtils.clamp(speed / 5.5, 0, 1);
  const sampleLevel = Math.pow(normalized, 0.72) * 0.5;
  const contactLevel = Math.pow(normalized, 0.76) * 0.018;
  const surfaceLevel = Math.pow(normalized, 1.08) * 0.032;
  const edgeLevel = Math.pow(normalized, 1.55) * 0.012;
  const impactLevel = Math.pow(normalized, 1.12) * 0.026;

  rollingAudio.sampleGain.gain.setTargetAtTime(sampleLevel, now, 0.055);
  rollingAudio.contactGain.gain.setTargetAtTime(contactLevel, now, 0.065);
  rollingAudio.surfaceGain.gain.setTargetAtTime(surfaceLevel, now, 0.06);
  rollingAudio.edgeGain.gain.setTargetAtTime(edgeLevel, now, 0.075);
  rollingAudio.impactGain.gain.setTargetAtTime(impactLevel, now, 0.055);
  rollingAudio.metalGains.forEach((gain, index) => {
    const level = Math.pow(normalized, 1.2) * [0.007, 0.005, 0.003][index];
    gain.gain.setTargetAtTime(level, now, 0.08);
  });

  rollingAudio.contactFilter.frequency.setTargetAtTime(360 + normalized * 320, now, 0.1);
  rollingAudio.surfaceFilter.frequency.setTargetAtTime(930 + normalized * 880, now, 0.1);
  rollingAudio.edgeFilter.frequency.setTargetAtTime(3250 - normalized * 520, now, 0.12);
  rollingAudio.impactFilter.frequency.setTargetAtTime(1780 + normalized * 1350, now, 0.08);
  rollingAudio.sampleTone.frequency.setTargetAtTime(3600 + normalized * 3100, now, 0.12);
  rollingAudio.sampleElement.playbackRate = 0.76 + normalized * 0.54;
  rollingAudio.noiseSource.playbackRate.setTargetAtTime(0.92 + normalized * 0.1, now, 0.1);
  rollingAudio.impactSource.playbackRate.setTargetAtTime(0.52 + normalized * 2.05, now, 0.08);
}

function playCompletionArpeggio() {
  if (!audioContext || !sfxInput) return;
  const now = audioContext.currentTime + 0.015;
  // Chrome Drift centers on E-flat minor (D-sharp minor), so the flourish
  // stays inside that scale instead of introducing an unrelated major key.
  const notes = [311.13, 369.99, 466.16, 554.37, 622.25, 739.99, 831.61, 932.33, 1108.73, 1244.51];

  notes.forEach((frequency, index) => {
    const start = now + index * 0.047;
    const oscillator = audioContext.createOscillator();
    const shimmer = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const shimmerGain = audioContext.createGain();

    oscillator.type = index % 2 ? "triangle" : "sine";
    shimmer.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    shimmer.frequency.setValueAtTime(frequency * 2.002, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.17, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.96);
    shimmerGain.gain.setValueAtTime(0.0001, start);
    shimmerGain.gain.exponentialRampToValueAtTime(0.042, start + 0.015);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.68);

    oscillator.connect(gain).connect(sfxInput);
    shimmer.connect(shimmerGain).connect(sfxInput);
    oscillator.start(start);
    shimmer.start(start);
    oscillator.stop(start + 1.02);
    shimmer.stop(start + 0.74);
  });
}

function playUnlockSound() {
  if (!audioContext || !sfxInput) return;
  const now = audioContext.currentTime + 0.01;
  // E-flat minor tonic arpeggio: Eb4, Gb4, Bb4, Eb5.
  [311.13, 369.99, 466.16, 622.25].forEach((frequency, index) => {
    const start = now + index * 0.055;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index % 2 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.68);
    oscillator.connect(gain).connect(sfxInput);
    oscillator.start(start);
    oscillator.stop(start + 0.72);
  });
}

function playLandingImpact(impactSpeed = 5) {
  if (!audioContext || !sfxInput) return;
  const now = audioContext.currentTime + 0.005;
  const strength = THREE.MathUtils.clamp(impactSpeed / 7.2, 0.48, 1);

  // A short low body resonance sells the marble's mass; the high partials
  // provide the hard metallic contact without turning the hit into a chime.
  [145, 720, 1860].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * (index === 0 ? 0.72 : 0.91), now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime([0.28, 0.085, 0.038][index] * strength, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + [0.3, 0.18, 0.11][index]);
    oscillator.connect(gain).connect(sfxInput);
    oscillator.start(now);
    oscillator.stop(now + 0.34);
  });
}

function playGlassShatter() {
  if (!audioContext || !sfxInput) return;
  const now = audioContext.currentTime + 0.006;
  const duration = 1.25;
  const buffer = audioContext.createBuffer(2, Math.floor(audioContext.sampleRate * duration), audioContext.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const time = index / audioContext.sampleRate;
      const initialCrack = Math.exp(-time * 34);
      const fallingFragments = Math.exp(-time * 3.8);
      const sparkle = Math.random() < 0.018 * Math.exp(-time * 1.5) ? Math.random() * 2 - 1 : 0;
      data[index] = (Math.random() * 2 - 1) * (initialCrack * 0.82 + fallingFragments * 0.24) + sparkle * 0.72;
    }
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 1250;
  highpass.Q.value = 0.7;
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.42, now + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(highpass).connect(noiseGain).connect(sfxInput);
  noise.start(now);
  noise.stop(now + duration);

  // Detuned, staggered shard resonances make the break read as glass, and the
  // shared effects bus carries them into the existing long reverb and echo.
  const shardFrequencies = [1620, 1985, 2470, 3090, 3860, 4720, 5710, 6840];
  shardFrequencies.forEach((frequency, index) => {
    const start = now + index * 0.019 + Math.random() * 0.025;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index % 3 === 0 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency * (0.985 + Math.random() * 0.03), start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + 0.62);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045 + Math.random() * 0.045, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48 + index * 0.035);
    oscillator.connect(gain).connect(sfxInput);
    oscillator.start(start);
    oscillator.stop(start + 0.82);
  });
}

function toggleMusic() {
  musicMuted = !musicMuted;
  backgroundMusic.muted = musicMuted;
  musicButton.classList.toggle("is-muted", musicMuted);
  musicButton.setAttribute("aria-label", musicMuted ? "Unmute music" : "Mute music");
  musicButton.title = musicMuted ? "Unmute music" : "Mute music";
  if (!musicMuted) startAudio();
}

function openMenu() {
  if (state !== "playing") return;
  paused = true;
  keys.clear();
  touchTilt.set(0, 0);
  setRollingVolume(0);
  menuOverlay.classList.remove("hidden");
  resumeButton.focus();
}

function closeMenu() {
  paused = false;
  menuOverlay.classList.add("hidden");
  root.scrollTop = 0;
  root.scrollLeft = 0;
  root.focus({ preventScroll: true });
}

function startGame() {
  hideOverlays();
  showPlayingUi();
  state = "playing";
  paused = false;
  statusPill.textContent = "Find the key cube · receiver locked";
  startAudio();
  root.scrollTop = 0;
  root.scrollLeft = 0;
  root.focus({ preventScroll: true });
}

function advanceLevel() {
  if (level === MAX_LEVELS) level = 1;
  else level += 1;
  resetLevel();
}

function resize() {
  const width = root.clientWidth;
  const height = root.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - animate.lastTime) / 1000 || 0, 0.04);
  animate.lastTime = now;

  if (!paused) {
    if (state === "playing") {
      updateBoardTilt(delta);
      updateMarble(delta);
      updateTimer(delta);
    } else if (state === "falling") {
      updateFall(delta);
      updateBoardTilt(delta);
    } else if (state === "goal") {
      updateGoal(delta);
      updateBoardTilt(delta);
    } else if (state === "shattering") {
      updateShatter(delta);
    } else {
      updateBoardTilt(delta);
    }
    if (unlockAnimationActive) updateUnlock(delta);
    updateGoalVisuals(delta);
  }

  renderer.render(scene, camera);
}
animate.lastTime = performance.now();

window.addEventListener("keydown", (event) => {
  const controlledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "Escape", "Space"];
  if (controlledKeys.includes(event.code)) event.preventDefault();
  if (event.code === "Space" && state === "overlay") {
    if (!event.repeat) {
      if (!complete.classList.contains("hidden")) advanceLevel();
      else if (!failed.classList.contains("hidden")) resetLevel();
    }
    return;
  }
  if (event.code === "KeyR" && !["intro", "shattering"].includes(state)) {
    resetLevel();
    return;
  }
  if (event.code === "Escape" && state === "playing") {
    if (paused) closeMenu();
    else openMenu();
    return;
  }
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  touchTilt.set(0, 0);
  setRollingVolume(0);
});
window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", (event) => {
  touchStart = new THREE.Vector2(event.clientX, event.clientY);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!touchStart) return;
  touchTilt.set(
    THREE.MathUtils.clamp((event.clientX - touchStart.x) / 85, -1, 1),
    THREE.MathUtils.clamp((event.clientY - touchStart.y) / 85, -1, 1),
  );
});

function endTouch(event) {
  touchStart = undefined;
  touchTilt.set(0, 0);
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener("pointerup", endTouch);
canvas.addEventListener("pointercancel", endTouch);

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", resetLevel);
retryButton.addEventListener("click", resetLevel);
againButton.addEventListener("click", advanceLevel);
menuButton.addEventListener("click", openMenu);
resumeButton.addEventListener("click", closeMenu);
menuRestartButton.addEventListener("click", resetLevel);
musicButton.addEventListener("click", toggleMusic);

backgroundMusic.addEventListener("error", () => {
  musicButton.classList.add("has-error");
  musicButton.title = "Music file could not be loaded";
});

buildLevel();
resize();
loading.classList.add("hidden");
requestAnimationFrame(animate);
