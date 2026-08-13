import "@fontsource/orbitron/400.css";
import "@fontsource/orbitron/500.css";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/800.css";
import "@fontsource/orbitron/900.css";
import * as THREE from "three";
import soundtrackUrl from "../assets/audio/Chrome Drift.mp3?url";
import marbleRollingUrl from "../assets/audio/Big Marble Rolling Continuous Sound Effect.mp3?url";
import {
  currentMonthLabel,
  fetchLeaderboard,
  fetchPersonalBest,
  formatRunTime,
  leaderboardConfigured,
  loadLocalPlayer,
  sanitizePlayerName,
  saveLocalPlayer,
  submitRun,
  updateLocalBest,
  updateRemoteName,
  validatePlayerName,
} from "./leaderboard.js";
import { RunTracker } from "./run-tracker.js";

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
const menuMainMenuButton = root.querySelector("#menu-main-menu-btn");
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
const failedTitle = root.querySelector("#failed-title");
const countdown = root.querySelector("#countdown");
const musicButton = root.querySelector("#music-btn");
const backgroundMusic = root.querySelector("#bg-music");
const loading = root.querySelector("#loading");
const runTimer = root.querySelector("#run-timer");
const runTimerValue = runTimer.querySelector("strong");
const leaderboardButton = root.querySelector("#leaderboards-btn");
const menuLeaderboardButton = root.querySelector("#menu-leaderboards-btn");
const leaderboardsOverlay = root.querySelector("#leaderboards");
const closeLeaderboardsButton = root.querySelector("#close-leaderboards-btn");
const leaderboardTabs = [...root.querySelectorAll(".leaderboard-tab")];
const leaderboardList = root.querySelector("#leaderboard-list");
const personalBestPanel = root.querySelector("#personal-best-panel");
const leaderboardPeriod = root.querySelector("#leaderboard-period");
const leaderboardPagination = root.querySelector("#leaderboard-pagination");
const leaderboardPage = root.querySelector("#leaderboard-page");
const previousPageButton = root.querySelector("#previous-page-btn");
const nextPageButton = root.querySelector("#next-page-btn");
const editNameButton = root.querySelector("#edit-name-btn");
const nameEntry = root.querySelector("#name-entry");
const nameForm = root.querySelector("#name-form");
const playerNameInput = root.querySelector("#player-name");
const nameError = root.querySelector("#name-error");
const cancelNameButton = root.querySelector("#cancel-name-btn");
const runResults = root.querySelector("#run-results");
const resultsDialog = runResults.querySelector(".results-dialog");
const finalRunTime = root.querySelector("#final-run-time");
const achievementList = root.querySelector("#achievement-list");
const submissionStatus = root.querySelector("#submission-status");
const resultsLeaderboardsButton = root.querySelector("#results-leaderboards-btn");
const playAgainButton = root.querySelector("#play-again-btn");
const mainMenuButton = root.querySelector("#main-menu-btn");

backgroundMusic.src = soundtrackUrl;
const rollingSampleBytes = fetch(marbleRollingUrl).then((response) => {
  if (!response.ok) throw new Error(`Rolling sound failed to load (${response.status})`);
  return response.arrayBuffer();
});

const MAX_LEVELS = 20;
const ROUND_SECONDS = 20;
const BOARD_THICKNESS = 0.3;
const MARBLE_RADIUS = 0.31;
const MAX_TILT = THREE.MathUtils.degToRad(10.5);
const SURFACE_Y = BOARD_THICKNESS;
const UNLOCK_ANIMATION_SPEED = 1.25;
const BASE_FOG_DENSITY = 0.044;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x4b8fd0, BASE_FOG_DENSITY);

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

const waterUniforms = { uTime: { value: 0 } };
const fishSchool = [];

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
let marbleGlow;
let marbleGoalLight;
let shatterGroup;
let goalUnlocked = false;
let fallTarget;
let fallHazard;
let fallReason = "";
let fallCommitted = false;
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
const runTracker = new RunTracker(MAX_LEVELS);
let localPlayer = loadLocalPlayer();
let leaderboardTab = "monthly";
let leaderboardCurrentPage = 1;
let leaderboardRowsOnPage = 0;
let leaderboardReturnOverlay = intro;
let pendingNameAction = null;
let pendingNameCancelAction = null;
let latestRunResult = null;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createAquaticEnvironment() {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 transformed = position;
          transformed.z += sin(position.x * 0.42 + uTime * 0.55) * 0.055;
          transformed.z += sin(position.y * 0.51 - uTime * 0.42) * 0.045;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        float causticLayer(vec2 point, float time) {
          vec2 warped = point;
          warped.x += sin(point.y * 0.73 + time * 0.62) * 1.3;
          warped.y += sin(point.x * 0.81 - time * 0.48) * 1.15;
          float a = abs(sin(warped.x + sin(warped.y * 0.66 + time)));
          float b = abs(sin(warped.y * 1.08 + sin(warped.x * 0.58 - time * 0.8)));
          return pow(clamp(1.0 - abs(a - b), 0.0, 1.0), 11.0);
        }

        void main() {
          vec2 point = (vUv - 0.5) * 31.0;
          float broad = causticLayer(point, uTime * 0.36);
          float fine = causticLayer(point * 1.63 + vec2(4.2, -2.7), -uTime * 0.27);
          float caustic = clamp(broad * 0.72 + fine * 0.46, 0.0, 1.0);
          float swell = sin(point.x * 0.16 + point.y * 0.11 + uTime * 0.24) * 0.5 + 0.5;
          vec3 deep = vec3(0.015, 0.30, 0.58);
          vec3 shallow = vec3(0.02, 0.68, 0.82);
          vec3 color = mix(deep, shallow, 0.36 + swell * 0.22);
          color += vec3(0.48, 0.94, 1.0) * caustic * 0.88;
          gl_FragColor = vec4(color, 0.62);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2.05;
  water.renderOrder = -2;
  scene.add(water);

  const seabed = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshBasicMaterial({ color: 0x087da8, transparent: true, opacity: 0.58, toneMapped: false }),
  );
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -3.45;
  seabed.renderOrder = -4;
  scene.add(seabed);

  const bodyGeometry = new THREE.SphereGeometry(1, 20, 12);
  const bodyPositions = bodyGeometry.attributes.position;
  for (let vertexIndex = 0; vertexIndex < bodyPositions.count; vertexIndex += 1) {
    const x = bodyPositions.getX(vertexIndex);
    const rearTaper = x < -0.08 ? THREE.MathUtils.lerp(1, 0.7, (-x - 0.08) / 0.92) : 1;
    bodyPositions.setY(vertexIndex, bodyPositions.getY(vertexIndex) * rearTaper);
    bodyPositions.setZ(vertexIndex, bodyPositions.getZ(vertexIndex) * rearTaper);
  }
  bodyGeometry.computeVertexNormals();

  const makeHorizontalFin = (shape) => {
    const geometry = new THREE.ShapeGeometry(shape, 5);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  };

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0.12, 0.16);
  tailShape.quadraticCurveTo(-0.22, 0.17, -0.48, 0.42);
  tailShape.quadraticCurveTo(-0.74, 0.68, -1.08, 0.72);
  tailShape.quadraticCurveTo(-0.9, 0.34, -0.94, 0.08);
  tailShape.quadraticCurveTo(-0.7, 0.02, -0.5, 0);
  tailShape.quadraticCurveTo(-0.7, -0.02, -0.94, -0.08);
  tailShape.quadraticCurveTo(-0.9, -0.34, -1.08, -0.72);
  tailShape.quadraticCurveTo(-0.74, -0.68, -0.48, -0.42);
  tailShape.quadraticCurveTo(-0.22, -0.17, 0.12, -0.16);
  tailShape.closePath();
  const tailGeometry = makeHorizontalFin(tailShape);

  const pectoralShape = new THREE.Shape();
  pectoralShape.moveTo(0.18, 0);
  pectoralShape.quadraticCurveTo(-0.08, 0.08, -0.38, 0.37);
  pectoralShape.quadraticCurveTo(-0.66, 0.64, -0.9, 0.6);
  pectoralShape.quadraticCurveTo(-0.7, 0.25, -0.42, 0.08);
  pectoralShape.quadraticCurveTo(-0.12, -0.02, 0.18, 0);
  pectoralShape.closePath();
  const pectoralGeometry = makeHorizontalFin(pectoralShape);

  const dorsalMarkShape = new THREE.Shape();
  dorsalMarkShape.moveTo(0.7, 0);
  dorsalMarkShape.quadraticCurveTo(0.25, 0.07, -0.12, 0.22);
  dorsalMarkShape.quadraticCurveTo(-0.55, 0.3, -0.92, 0.04);
  dorsalMarkShape.quadraticCurveTo(-1, 0, -0.92, -0.04);
  dorsalMarkShape.quadraticCurveTo(-0.55, -0.3, -0.12, -0.22);
  dorsalMarkShape.quadraticCurveTo(0.25, -0.07, 0.7, 0);
  dorsalMarkShape.closePath();
  const dorsalMarkGeometry = makeHorizontalFin(dorsalMarkShape);

  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0.58, 0);
  dorsalShape.quadraticCurveTo(0.22, 0.08, -0.12, 0.34);
  dorsalShape.quadraticCurveTo(-0.5, 0.58, -0.78, 0.3);
  dorsalShape.quadraticCurveTo(-0.9, 0.16, -0.98, 0);
  dorsalShape.closePath();
  const dorsalGeometry = new THREE.ShapeGeometry(dorsalShape, 5);
  const gillGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.54, 0, -0.42),
    new THREE.Vector3(0.66, 0, -0.2),
    new THREE.Vector3(0.7, 0, 0),
    new THREE.Vector3(0.66, 0, 0.2),
    new THREE.Vector3(0.54, 0, 0.42),
  ]);
  const colors = [0x2af2ff, 0xff718f, 0xffdd3f, 0x55f58a, 0x9c83ff, 0xff9d45, 0x5cbcff];
  const random = mulberry32(0xa9f120);

  for (let index = 0; index < 30; index += 1) {
    const group = new THREE.Group();
    const size = THREE.MathUtils.lerp(0.14, 0.29, random());
    const color = colors[index % colors.length];
    const accentColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.52);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: THREE.MathUtils.lerp(0.88, 0.98, random()),
      fog: false,
      toneMapped: false,
    });
    const body = new THREE.Mesh(bodyGeometry, material);
    body.scale.set(size * 1.68, size * 0.6, size * 0.7);
    group.add(body);

    const tail = new THREE.Mesh(
      tailGeometry,
      new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
      }),
    );
    tail.position.x = -size * 1.46;
    tail.scale.set(size * 1.05, size * 1.05, size * 0.88);
    group.add(tail);

    const backMark = new THREE.Mesh(
      dorsalMarkGeometry,
      new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide, fog: false, toneMapped: false }),
    );
    backMark.position.set(-size * 0.02, size * 0.57, 0);
    backMark.scale.set(size * 0.98, size * 0.98, size * 0.98);
    group.add(backMark);

    const finMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    const pectoralFins = [-1, 1].map((side) => {
      const fin = new THREE.Mesh(pectoralGeometry, finMaterial.clone());
      fin.position.set(size * 0.4, -size * 0.01, side * size * 0.4);
      fin.scale.set(size * 0.6, size * 0.6, side * size * 0.54);
      group.add(fin);
      return fin;
    });

    const dorsalFin = new THREE.Mesh(dorsalGeometry, finMaterial.clone());
    dorsalFin.position.set(-size * 0.08, size * 0.43, 0);
    dorsalFin.scale.set(size * 0.74, size * 0.48, size * 0.74);
    group.add(dorsalFin);

    const gill = new THREE.Line(
      gillGeometry,
      new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.88, fog: false, toneMapped: false }),
    );
    gill.position.y = size * 0.5;
    gill.scale.setScalar(size);
    group.add(gill);

    group.renderOrder = -3;
    scene.add(group);
    fishSchool.push({
      group,
      tail,
      pectoralFins,
      radius: THREE.MathUtils.lerp(3.1, 11.8, random()),
      angle: random() * Math.PI * 2,
      speed: THREE.MathUtils.lerp(0.055, 0.16, random()) * (random() > 0.5 ? 1 : -1),
      phase: random() * Math.PI * 2,
      depth: THREE.MathUtils.lerp(-2.38, -3.05, random()),
      drift: THREE.MathUtils.lerp(0.2, 0.85, random()),
    });
  }
}

function updateAquaticEnvironment(time) {
  waterUniforms.uTime.value = time;
  fishSchool.forEach((fish) => {
    const angle = fish.angle + time * fish.speed;
    const radius = fish.radius + Math.sin(time * 0.22 + fish.phase) * fish.drift;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.78;
    const direction = fish.speed > 0 ? 1 : -1;
    const dx = -Math.sin(angle) * direction;
    const dz = Math.cos(angle) * 0.78 * direction;
    fish.group.position.set(x, fish.depth + Math.sin(time * 0.7 + fish.phase) * 0.11, z);
    fish.group.rotation.y = -Math.atan2(dz, dx);
    fish.tail.rotation.y = Math.sin(time * 6.4 + fish.phase) * 0.42;
    fish.pectoralFins.forEach((fin, index) => {
      fin.rotation.x = Math.sin(time * 4.8 + fish.phase + index * Math.PI) * 0.18;
    });
  });
}

createAquaticEnvironment();

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
    roundDuration = ROUND_SECONDS;
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

  updateCameraFraming();
}

function updateCameraFraming() {
  const { width: measuredWidth, height: measuredHeight } = root.getBoundingClientRect();
  const width = Math.max(measuredWidth, 1);
  const height = Math.max(measuredHeight, 1);
  const aspect = width / height;
  const levelScale = 1 + (boardRadius - 4.55) * 0.16;
  // A perspective camera's vertical field of view stays fixed as the viewport
  // narrows, which crops the disc on phones. Pull back only in portrait layouts
  // so the entire playable rim remains visible without changing desktop scale.
  const portraitScale = THREE.MathUtils.clamp(1.02 / aspect, 1, 1.95);
  const framingScale = levelScale * portraitScale;
  camera.position.set(0, 12.2 * framingScale, 9.2 * framingScale);
  camera.lookAt(0, 0, 0);
  // Exponential fog is based on camera-to-object distance. Without this
  // compensation, portrait framing and larger late-game boards wash the white
  // and cyan materials toward gray simply because the camera is farther away.
  scene.fog.density = BASE_FOG_DENSITY / framingScale;
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
  marbleGlow = new THREE.Mesh(
    new THREE.SphereGeometry(MARBLE_RADIUS * 1.18, 32, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  marbleGlow.visible = false;
  sphere.add(marbleGlow);

  marbleGoalLight = new THREE.PointLight(0xffffff, 0, 5.5, 2);
  sphere.add(marbleGoalLight);
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
  fallCommitted = false;
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
  runTracker.resume(performance.now());
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
  leaderboardsOverlay.classList.add("hidden");
  nameEntry.classList.add("hidden");
  runResults.classList.add("hidden");
}

function showPlayingUi() {
  restartButton.classList.remove("hidden");
  menuButton.classList.remove("hidden");
  hint.classList.remove("hidden");
  objectiveGuide.classList.remove("hidden");
}

function elapsedRunTime(now = performance.now()) {
  return runTracker.elapsed(now);
}

function updateRunTimer(now = performance.now()) {
  if (!runTracker.active && runTracker.finalTimeMs <= 0) return;
  runTimerValue.textContent = formatRunTime(elapsedRunTime(now));
}

function startNewRun() {
  runTracker.start(performance.now());
  latestRunResult = null;
  runTimer.classList.remove("hidden");
  updateRunTimer(performance.now());
}

function recordLevelSplit() {
  if (runTracker.completeLevel(level, performance.now())) updateRunTimer();
}

function abortRun() {
  runTracker.reset();
  runTimer.classList.add("hidden");
  runTimerValue.textContent = "00:00.00";
}

function createLeaderboardMessage(className, text) {
  const message = document.createElement("div");
  message.className = className;
  message.textContent = text;
  return message;
}

function renderLeaderboardRows(rows) {
  leaderboardList.replaceChildren();
  if (!rows.length) {
    leaderboardList.append(createLeaderboardMessage("leaderboard-empty", "NO VALIDATED RUNS ON THIS PAGE"));
    return;
  }
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "leaderboard-row";
    if (row.publicPlayerId === localPlayer.publicPlayerId) item.classList.add("is-player");
    const rank = document.createElement("span");
    rank.textContent = String(row.rank).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = row.displayName;
    const time = document.createElement("strong");
    time.textContent = formatRunTime(row.totalTimeMs);
    const you = document.createElement("span");
    you.className = "leaderboard-you";
    you.textContent = row.publicPlayerId === localPlayer.publicPlayerId ? "YOU" : "";
    item.append(rank, name, time, you);
    fragment.append(item);
  });
  leaderboardList.append(fragment);
}

function renderPersonalBest(best) {
  personalBestPanel.replaceChildren();
  if (!best?.total_time_ms && !Number.isFinite(localPlayer.personalBest)) {
    const empty = createLeaderboardMessage("leaderboard-empty", "NO COMPLETE RUN YET\nComplete all 20 levels to set your first time.");
    personalBestPanel.append(empty);
    return;
  }
  const timeMs = best?.total_time_ms ?? localPlayer.personalBest;
  const splits = best?.level_splits ?? localPlayer.bestSplits ?? [];
  const time = document.createElement("strong");
  time.className = "personal-best-time";
  time.textContent = formatRunTime(timeMs);
  const ranks = document.createElement("div");
  ranks.className = "personal-best-ranks";
  if (best?.allTimeRank) ranks.append(Object.assign(document.createElement("span"), { textContent: `ALL TIME #${best.allTimeRank}` }));
  if (best?.monthlyRank) ranks.append(Object.assign(document.createElement("span"), { textContent: `THIS MONTH #${best.monthlyRank}` }));
  const splitList = document.createElement("div");
  splitList.className = "split-list";
  splits.forEach((split, index) => splitList.append(Object.assign(document.createElement("span"), {
    textContent: `L${String(index + 1).padStart(2, "0")} ${formatRunTime(split)}`,
  })));
  personalBestPanel.append(time, ranks, splitList);
}

async function loadLeaderboard() {
  leaderboardPage.textContent = String(leaderboardCurrentPage);
  previousPageButton.disabled = leaderboardCurrentPage === 1;
  leaderboardPeriod.textContent = leaderboardTab === "monthly" ? currentMonthLabel() : leaderboardTab === "all-time" ? "FASTEST COMPLETE RUNS" : (localPlayer.displayName || "LOCAL PLAYER");
  const isPersonal = leaderboardTab === "personal";
  leaderboardList.classList.toggle("hidden", isPersonal);
  personalBestPanel.classList.toggle("hidden", !isPersonal);
  leaderboardPagination.classList.toggle("hidden", isPersonal);
  editNameButton.textContent = localPlayer.displayName ? "EDIT NAME" : "SET NAME";

  if (isPersonal) {
    personalBestPanel.replaceChildren(createLeaderboardMessage("leaderboard-loading", "LOADING PERSONAL BEST…"));
    try {
      const best = leaderboardConfigured ? await fetchPersonalBest(localPlayer) : null;
      renderPersonalBest(best);
    } catch {
      renderPersonalBest(null);
    }
    return;
  }

  leaderboardList.replaceChildren(createLeaderboardMessage("leaderboard-loading", "CONTACTING SKYBALL NETWORK…"));
  if (!leaderboardConfigured) {
    leaderboardRowsOnPage = 0;
    nextPageButton.disabled = true;
    leaderboardList.replaceChildren(createLeaderboardMessage("leaderboard-empty", "GLOBAL LEADERBOARD UNAVAILABLE\nLocal personal best tracking remains active."));
    return;
  }
  try {
    const rows = await fetchLeaderboard(leaderboardTab, leaderboardCurrentPage);
    leaderboardRowsOnPage = rows.length;
    nextPageButton.disabled = rows.length < 50;
    renderLeaderboardRows(rows);
  } catch {
    leaderboardRowsOnPage = 0;
    nextPageButton.disabled = true;
    leaderboardList.replaceChildren(createLeaderboardMessage("leaderboard-empty", "LEADERBOARD TEMPORARILY UNAVAILABLE\nGameplay and local timing are unaffected."));
  }
}

function openLeaderboards(origin = intro) {
  leaderboardReturnOverlay = origin;
  [intro, complete, failed, menuOverlay, runResults, nameEntry].forEach((overlay) => overlay.classList.add("hidden"));
  leaderboardsOverlay.classList.remove("hidden");
  root.scrollTop = 0;
  root.scrollLeft = 0;
  leaderboardTab = "monthly";
  leaderboardCurrentPage = 1;
  leaderboardTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === leaderboardTab));
  void loadLeaderboard();
}

function closeLeaderboards() {
  leaderboardsOverlay.classList.add("hidden");
  leaderboardReturnOverlay.classList.remove("hidden");
  root.scrollTop = 0;
  root.scrollLeft = 0;
  if (leaderboardReturnOverlay === menuOverlay) resumeButton.focus();
  else leaderboardReturnOverlay.querySelector("button")?.focus();
}

function requestPlayerName(action, allowCancel = true, cancelAction = null) {
  pendingNameAction = action;
  pendingNameCancelAction = cancelAction;
  nameError.textContent = "";
  playerNameInput.value = localPlayer.displayName || "";
  cancelNameButton.classList.toggle("hidden", !allowCancel);
  [leaderboardsOverlay, runResults].forEach((overlay) => overlay.classList.add("hidden"));
  nameEntry.classList.remove("hidden");
  requestAnimationFrame(() => playerNameInput.focus());
}

async function savePlayerName() {
  const displayName = sanitizePlayerName(playerNameInput.value).toUpperCase();
  const error = validatePlayerName(displayName);
  if (error) {
    nameError.textContent = error;
    return;
  }
  localPlayer.displayName = displayName;
  saveLocalPlayer(localPlayer);
  if (leaderboardConfigured) void updateRemoteName(localPlayer).catch(() => {});
  nameEntry.classList.add("hidden");
  const action = pendingNameAction;
  pendingNameAction = null;
  pendingNameCancelAction = null;
  await action?.();
}

function renderRunResults(result) {
  hideOverlays();
  runResults.classList.remove("hidden");
  finalRunTime.textContent = formatRunTime(runTracker.finalTimeMs);
  achievementList.replaceChildren();
  const achievements = [];
  if (result.isPersonalBest) achievements.push("NEW PERSONAL BEST");
  if (result.allTimeRank) achievements.push(`#${result.allTimeRank} ALL TIME`);
  if (result.monthlyRank) achievements.push(`#${result.monthlyRank} THIS MONTH`);
  achievements.forEach((text) => achievementList.append(Object.assign(document.createElement("span"), { textContent: text })));
  const elevated = result.isPersonalBest || (result.allTimeRank && result.allTimeRank <= 10) || (result.monthlyRank && result.monthlyRank <= 10);
  resultsDialog.classList.toggle("is-achievement", Boolean(elevated));
  if (elevated) playAchievementSound();
  submissionStatus.textContent = result.submitted
    ? "Validated run saved to the Skyball network"
    : "Local result saved · global service unavailable";
}

async function finishRunSubmission() {
  const isPersonalBest = updateLocalBest(localPlayer, runTracker.finalTimeMs, runTracker.splits);
  const result = { isPersonalBest, submitted: false, allTimeRank: null, monthlyRank: null };
  if (leaderboardConfigured && localPlayer.displayName) {
    try {
      const remote = await submitRun(localPlayer, runTracker.finalTimeMs, runTracker.splits);
      if (remote?.validation_status === "valid") {
        result.submitted = true;
        result.allTimeRank = remote.all_time_rank || null;
        result.monthlyRank = remote.monthly_rank || null;
      }
    } catch {
      // Local PB remains authoritative when the network is unavailable.
    }
  }
  latestRunResult = result;
  renderRunResults(result);
}

function completeRun() {
  if (!localPlayer.displayName) requestPlayerName(finishRunSubmission, true, finishRunSubmission);
  else void finishRunSubmission();
}

function returnToMainMenu() {
  hideOverlays();
  abortRun();
  level = 1;
  buildLevel();
  state = "intro";
  paused = false;
  restartButton.classList.add("hidden");
  menuButton.classList.add("hidden");
  hint.classList.add("hidden");
  objectiveGuide.classList.add("hidden");
  intro.classList.remove("hidden");
  startButton.focus();
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
  fallCommitted = false;
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
  recordLevelSplit();
  runTracker.pause(performance.now());
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
    const top = SURFACE_Y;
    const bottom = SURFACE_Y - BOARD_THICKNESS;
    const noReturnRadius = Math.max(fallHazard.r - MARBLE_RADIUS * 1.08, 0.02);

    // Until the center crosses the inner threshold, tilt and momentum can
    // still carry the marble back across the lip. Once it drops too deep or
    // moves too far toward the center, the fall becomes irreversible.
    if (distance <= noReturnRadius || marble.position.y < top - MARBLE_RADIUS * 0.28) {
      fallCommitted = true;
    }
    if (!fallCommitted) {
      const input = inputVector();
      marbleVelocity.x += input.horizontal * currentAcceleration * 0.82 * delta;
      marbleVelocity.y += input.vertical * currentAcceleration * 0.82 * delta;
    }
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

    let nextHeight = marble.position.y + bounceVelocity * delta;
    const radialOffset = marblePosition.clone().sub(fallTarget);
    let radialDistance = Math.max(radialOffset.length(), 0.0001);
    const radialDirection = radialOffset.multiplyScalar(1 / radialDistance);
    const tangentDirection = new THREE.Vector2(-radialDirection.y, radialDirection.x);
    let radialSpeed = marbleVelocity.dot(radialDirection);
    let tangentSpeed = marbleVelocity.dot(tangentDirection);

    const applyContactVelocity = (normalRadial, normalVertical, restitution = 0.16) => {
      const normalSpeed = radialSpeed * normalRadial + bounceVelocity * normalVertical;
      if (normalSpeed < 0) {
        radialSpeed -= normalSpeed * (1 + restitution) * normalRadial;
        bounceVelocity -= normalSpeed * (1 + restitution) * normalVertical;
      }
      tangentSpeed *= 0.94;
    };

    // Resolve the sphere against the rounded upper and lower edges of the
    // cutout. The contact normal redirects an off-center fall along the lip,
    // instead of allowing the sphere mesh to pass through the cylinder wall.
    const resolveCorner = (cornerHeight) => {
      const horizontal = radialDistance - fallHazard.r;
      const vertical = nextHeight - cornerHeight;
      const cornerDistance = Math.hypot(horizontal, vertical);
      if (cornerDistance >= MARBLE_RADIUS || cornerDistance < 0.0001) return;
      const normalRadial = horizontal / cornerDistance;
      const normalVertical = vertical / cornerDistance;
      const correction = MARBLE_RADIUS - cornerDistance;
      radialDistance += normalRadial * correction;
      nextHeight += normalVertical * correction;
      applyContactVelocity(normalRadial, normalVertical, 0.18);
    };

    if (nextHeight > top && nextHeight < top + MARBLE_RADIUS) {
      resolveCorner(top);
    } else if (nextHeight >= bottom && nextHeight <= top) {
      const wallLimit = Math.max(fallHazard.r - MARBLE_RADIUS, 0.02);
      if (radialDistance > wallLimit) {
        radialDistance = wallLimit;
        if (radialSpeed > 0) radialSpeed *= -0.2;
        tangentSpeed *= 0.92;
        bounceVelocity *= 0.96;
      }
    } else if (nextHeight < bottom && nextHeight > bottom - MARBLE_RADIUS) {
      resolveCorner(bottom);
    }

    marblePosition.copy(fallTarget).addScaledVector(radialDirection, radialDistance);
    marbleVelocity.set(
      radialDirection.x * radialSpeed + tangentDirection.x * tangentSpeed,
      radialDirection.y * radialSpeed + tangentDirection.y * tangentSpeed,
    );
    marble.position.y = nextHeight;

    const exitThreshold = fallHazard.r - MARBLE_RADIUS * 0.16;
    const escapedRim = (
      !fallCommitted
      && radialDistance >= exitThreshold
      && nextHeight > top - MARBLE_RADIUS * 0.18
      && radialSpeed > 0.02
    );
    if (escapedRim) {
      state = "playing";
      stateElapsed = 0;
      fallReason = "";
      fallTarget = undefined;
      fallHazard = undefined;
      fallCommitted = false;
      bounceHeight = 0.018;
      bounceVelocity = Math.max(0.18, Math.abs(bounceVelocity) * 0.14);
      marbleVelocity.multiplyScalar(0.9);
      marble.position.set(
        marblePosition.x,
        SURFACE_Y + MARBLE_RADIUS + bounceHeight,
        marblePosition.y,
      );
      statusPill.textContent = goalUnlocked ? "Gate open · enter the receiver" : "Recovered · find the key cube";
      return;
    }
  } else {
    bounceVelocity -= 11.8 * delta;
    marblePosition.addScaledVector(marbleVelocity, delta * 0.92);
    marble.position.y += bounceVelocity * delta;
  }
  marble.position.x = marblePosition.x;
  marble.position.z = marblePosition.y;
  marble.rotation.x += marbleVelocity.y * delta * 2.4;
  marble.rotation.z -= marbleVelocity.x * delta * 2.4;

  if (marble.position.y < -4.5 || stateElapsed > 2.1) {
    state = "overlay";
    runTracker.pause(performance.now());
    failedTitle.textContent = "MARBLE LOST";
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
  marble.material.emissiveIntensity = THREE.MathUtils.lerp(0.18, 7.2, transform);
  marble.material.metalness = THREE.MathUtils.lerp(0.86, 0.18, transform);
  marble.material.roughness = THREE.MathUtils.lerp(0.1, 0.035, transform);
  if (marbleGlow) {
    marbleGlow.visible = transform > 0.01;
    marbleGlow.material.opacity = THREE.MathUtils.lerp(0, 0.32, transform);
    marbleGlow.scale.setScalar(1 + Math.sin(stateElapsed * 5.2) * 0.025 * transform);
  }
  if (marbleGoalLight) marbleGoalLight.intensity = THREE.MathUtils.lerp(0, 18, transform);
  if (goalLight) goalLight.intensity = THREE.MathUtils.lerp(27, 42, transform);

  if (stateElapsed > 1.52) {
    state = "overlay";
    if (level === MAX_LEVELS) {
      completeRun();
      return;
    } else {
      completeTitle.textContent = "LEVEL COMPLETE";
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
    runTracker.pause(performance.now());
    failedTitle.textContent = "TIME // OUT";
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
  sampleTone.connect(sampleGain);
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
    sampleSource: undefined,
    sampleLoading: undefined,
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

async function startRollingSample() {
  if (!rollingAudio || rollingAudio.sampleSource || rollingAudio.sampleLoading) return rollingAudio?.sampleLoading;
  rollingAudio.sampleLoading = rollingSampleBytes
    .then((bytes) => audioContext.decodeAudioData(bytes.slice(0)))
    .then((buffer) => {
      if (rollingAudio.sampleSource) return;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = 0.76;
      source.connect(rollingAudio.sampleTone);
      source.start();
      rollingAudio.sampleSource = source;
    })
    .catch((error) => {
      console.warn("The supplied marble rolling sound could not start.", error);
      rollingAudio.sampleLoading = undefined;
    });
  return rollingAudio.sampleLoading;
}

async function startAudio() {
  ensureAudio();
  // Invoke every mobile-restricted audio operation synchronously inside the
  // user's tap, then await their results. Web Audio owns the rolling loop so
  // Safari only has one HTML media element competing for playback resources.
  const resumePlayback = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
  void startRollingSample();
  backgroundMusic.volume = 0.5;
  backgroundMusic.muted = musicMuted;
  const musicPlayback = musicMuted ? Promise.resolve() : backgroundMusic.play();
  await resumePlayback;
  if (!musicMuted) {
    try {
      await musicPlayback;
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
  if (rollingAudio.sampleSource) {
    rollingAudio.sampleSource.playbackRate.setTargetAtTime(0.76 + normalized * 0.54, now, 0.08);
  }
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

function playAchievementSound() {
  if (!audioContext || !sfxInput) return;
  const now = audioContext.currentTime + 0.02;
  // Elevated E-flat minor flourish: the same tonal family as the gate cue,
  // voiced more quickly with a longer shimmer tail for rare achievements.
  const notes = [311.13, 369.99, 466.16, 554.37, 622.25, 739.99, 932.33, 1244.51];
  notes.forEach((frequency, index) => {
    const start = now + index * 0.042;
    const oscillator = audioContext.createOscillator();
    const shimmer = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const shimmerGain = audioContext.createGain();
    oscillator.type = index % 2 ? "triangle" : "sine";
    shimmer.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    shimmer.frequency.setValueAtTime(frequency * 2.004, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.18);
    shimmerGain.gain.setValueAtTime(0.0001, start);
    shimmerGain.gain.exponentialRampToValueAtTime(0.05, start + 0.012);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.42);
    oscillator.connect(gain).connect(sfxInput);
    shimmer.connect(shimmerGain).connect(sfxInput);
    oscillator.start(start);
    shimmer.start(start);
    oscillator.stop(start + 1.24);
    shimmer.stop(start + 1.48);
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
  runTracker.pause(performance.now());
  keys.clear();
  touchTilt.set(0, 0);
  setRollingVolume(0);
  menuOverlay.classList.remove("hidden");
  resumeButton.focus();
}

function closeMenu() {
  paused = false;
  runTracker.resume(performance.now());
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
  if (level === 1 && !runTracker.active) startNewRun();
  else runTracker.resume(performance.now());
  startAudio();
  root.scrollTop = 0;
  root.scrollLeft = 0;
  root.focus({ preventScroll: true });
}

function advanceLevel() {
  level += 1;
  resetLevel();
}

function resize() {
  const { width: measuredWidth, height: measuredHeight } = root.getBoundingClientRect();
  const width = Math.max(Math.round(measuredWidth), 1);
  const height = Math.max(Math.round(measuredHeight), 1);
  camera.aspect = width / height;
  updateCameraFraming();
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - animate.lastTime) / 1000 || 0, 0.04);
  animate.lastTime = now;
  updateAquaticEnvironment(now / 1000);
  if (runTracker.active) updateRunTimer(now);

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
  const retryOverlayOpen = state === "overlay" && !failed.classList.contains("hidden");
  if (event.code === "KeyR" && (["playing", "falling"].includes(state) || retryOverlayOpen)) {
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
window.visualViewport?.addEventListener("resize", resize);
const rootResizeObserver = new ResizeObserver(resize);
rootResizeObserver.observe(root);

canvas.addEventListener("pointerdown", (event) => {
  if (event.cancelable) event.preventDefault();
  if (audioContext?.state === "suspended") void audioContext.resume();
  void startRollingSample();
  touchStart = new THREE.Vector2(event.clientX, event.clientY);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!touchStart) return;
  if (event.cancelable) event.preventDefault();
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
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

startButton.addEventListener("click", startGame);
leaderboardButton.addEventListener("click", () => openLeaderboards(intro));
restartButton.addEventListener("click", resetLevel);
retryButton.addEventListener("click", resetLevel);
againButton.addEventListener("click", advanceLevel);
menuButton.addEventListener("click", openMenu);
resumeButton.addEventListener("click", closeMenu);
menuRestartButton.addEventListener("click", resetLevel);
menuLeaderboardButton.addEventListener("click", () => openLeaderboards(menuOverlay));
menuMainMenuButton.addEventListener("click", returnToMainMenu);
musicButton.addEventListener("click", toggleMusic);
closeLeaderboardsButton.addEventListener("click", closeLeaderboards);

leaderboardTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    leaderboardTab = tab.dataset.tab;
    leaderboardCurrentPage = 1;
    leaderboardTabs.forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
    void loadLeaderboard();
  });
});

previousPageButton.addEventListener("click", () => {
  if (leaderboardCurrentPage <= 1) return;
  leaderboardCurrentPage -= 1;
  void loadLeaderboard();
});

nextPageButton.addEventListener("click", () => {
  if (leaderboardRowsOnPage < 50) return;
  leaderboardCurrentPage += 1;
  void loadLeaderboard();
});

editNameButton.addEventListener("click", () => {
  const restoreLeaderboard = async () => {
    leaderboardsOverlay.classList.remove("hidden");
    await loadLeaderboard();
  };
  requestPlayerName(restoreLeaderboard, true, restoreLeaderboard);
});

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void savePlayerName();
});

playerNameInput.addEventListener("input", () => {
  const sanitized = sanitizePlayerName(playerNameInput.value).toUpperCase();
  if (playerNameInput.value !== sanitized) playerNameInput.value = sanitized;
  nameError.textContent = "";
});

cancelNameButton.addEventListener("click", () => {
  nameEntry.classList.add("hidden");
  const cancelAction = pendingNameCancelAction;
  pendingNameAction = null;
  pendingNameCancelAction = null;
  void cancelAction?.();
});

resultsLeaderboardsButton.addEventListener("click", () => openLeaderboards(runResults));
playAgainButton.addEventListener("click", () => {
  level = 1;
  buildLevel();
  startNewRun();
  startGame();
});
mainMenuButton.addEventListener("click", returnToMainMenu);

backgroundMusic.addEventListener("error", () => {
  musicButton.classList.add("has-error");
  musicButton.title = "Music file could not be loaded";
});

buildLevel();
resize();
loading.classList.add("hidden");
requestAnimationFrame(animate);
