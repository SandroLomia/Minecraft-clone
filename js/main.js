import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.2;
const MOVE_SPEED = 0.1;

const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    SAND: 6,
    GLASS: 7,
    WATER: 8,
    COAL_ORE: 9,
    COBBLESTONE: 10,
    PLANKS: 11,
    BRICK: 12,
    IRON_ORE: 13,
    GOLD_ORE: 14
};

const BLOCK_COLORS = {
    [BLOCK_TYPES.GRASS]: 0x4caf50,
    [BLOCK_TYPES.DIRT]: 0x8b4513,
    [BLOCK_TYPES.STONE]: 0x808080,
    [BLOCK_TYPES.WOOD]: 0x5d4037,
    [BLOCK_TYPES.LEAVES]: 0x2e7d32,
    [BLOCK_TYPES.SAND]: 0xffecb3,
    [BLOCK_TYPES.GLASS]: 0xffffff,
    [BLOCK_TYPES.WATER]: 0x2196f3,
    [BLOCK_TYPES.COAL_ORE]: 0x424242,
    [BLOCK_TYPES.COBBLESTONE]: 0x9e9e9e,
    [BLOCK_TYPES.PLANKS]: 0xbc9862,
    [BLOCK_TYPES.BRICK]: 0x9c413b,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfcee4b
};

const BLOCK_CANVASES = {};

function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustHexColor(hexColor, amount) {
    const r = clampColor(((hexColor >> 16) & 0xff) + amount);
    const g = clampColor(((hexColor >> 8) & 0xff) + amount);
    const b = clampColor((hexColor & 0xff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
}

function createBlockTexture(blockType, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    const paintPixel = (x, y, shade) => {
        ctx.fillStyle = adjustHexColor(color, shade);
        ctx.fillRect(x, y, 1, 1);
    };

    ctx.fillStyle = adjustHexColor(color, 0);
    ctx.fillRect(0, 0, 16, 16);

    if (blockType === BLOCK_TYPES.GRASS) {
        // Dirt-like body with greener top strip to mimic Minecraft grass side texture.
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 0.9 + 4.2, y * 0.9 + 12.8);
                const shade = y < 5 ? 22 + noise * 14 : -6 + noise * 18;
                paintPixel(x, y, shade);
            }
        }

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 16; x++) {
                const grassNoise = textureNoise.noise2D(x * 1.1 + 30.3, y * 1.3 + 11.7);
                const blend = y === 4 ? -8 : 0;
                ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.GRASS], 10 + grassNoise * 16 + blend);
                ctx.fillRect(x, y, 1, 1);
            }
        }
    } else if (blockType === BLOCK_TYPES.DIRT) {
        // Chunky earthy dithering pattern close to the classic Minecraft dirt look.
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const coarse = textureNoise.noise2D(x * 0.75 + 9.1, y * 0.75 + 17.4);
                const fine = textureNoise.noise2D(x * 1.7 + 2.3, y * 1.7 + 21.6);
                const shade = coarse * 28 + fine * 10 - 3;
                paintPixel(x, y, shade);
            }
        }
    } else if (blockType === BLOCK_TYPES.STONE) {
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = adjustHexColor(color, y % 8 === 0 ? 12 : -8);
            ctx.fillRect(0, y, 16, 2);
        }
    } else if (blockType === BLOCK_TYPES.WOOD) {
        for (let y = 0; y < 16; y += 3) {
            ctx.fillStyle = adjustHexColor(color, y % 6 === 0 ? 18 : -12);
            ctx.fillRect(0, y, 16, 1);
        }
    } else if (blockType === BLOCK_TYPES.SAND) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 1.2 + 5.1, y * 1.2 + 8.7);
                const shade = 6 + noise * 14;
                paintPixel(x, y, shade);
            }
        }
    } else if (blockType === BLOCK_TYPES.GLASS) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(2, 2, 12, 12);
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.9)';
        ctx.strokeRect(1, 1, 14, 14);
        ctx.beginPath();
        ctx.moveTo(2, 12);
        ctx.lineTo(12, 2);
        ctx.stroke();
    } else if (blockType === BLOCK_TYPES.LEAVES) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 1.5 + 40, y * 1.5 + 50);
                if (noise > 0) {
                    paintPixel(x, y, -10 + noise * 15);
                } else {
                    ctx.clearRect(x, y, 1, 1);
                }
            }
        }
    } else if (blockType === BLOCK_TYPES.COAL_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        for (let i = 0; i < 6; i++) {
            const rx = Math.floor(Math.random() * 12) + 2;
            const ry = Math.floor(Math.random() * 12) + 2;
            ctx.fillStyle = '#222';
            ctx.fillRect(rx, ry, Math.random() * 3 + 1, Math.random() * 3 + 1);
        }
    } else if (blockType === BLOCK_TYPES.COBBLESTONE) {
        for (let y = 0; y < 16; y += 4) {
            for (let x = 0; x < 16; x += 4) {
                ctx.fillStyle = adjustHexColor(color, (x + y) % 8 === 0 ? 10 : -10);
                ctx.fillRect(x, y, 4, 4);
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.strokeRect(x, y, 4, 4);
            }
        }
    } else if (blockType === BLOCK_TYPES.PLANKS) {
        // Wooden planks with 4 horizontal slats and seam lines
        for (let y = 0; y < 16; y++) {
            const plankIndex = Math.floor(y / 4);
            const plankBaseShade = (plankIndex % 2 === 0) ? 8 : -8;
            for (let x = 0; x < 16; x++) {
                const grain = textureNoise.noise2D(x * 0.4 + plankIndex * 10, y * 2.0);
                paintPixel(x, y, plankBaseShade + grain * 12);
            }
        }
        ctx.fillStyle = 'rgba(40, 20, 5, 0.45)';
        for (let y = 3; y < 16; y += 4) {
            ctx.fillRect(0, y, 16, 1);
        }
        // Vertical divider joints
        ctx.fillRect(8, 0, 1, 4);
        ctx.fillRect(4, 4, 1, 4);
        ctx.fillRect(12, 8, 1, 4);
        ctx.fillRect(7, 12, 1, 4);
    } else if (blockType === BLOCK_TYPES.BRICK) {
        // Red bricks with light gray mortar joints
        ctx.fillStyle = '#b0a99f';
        ctx.fillRect(0, 0, 16, 16);
        const brickH = 3;
        const brickW = 7;
        for (let row = 0; row < 4; row++) {
            const y = row * 4 + 1;
            const xOffset = (row % 2) * 4;
            for (let col = -1; col < 3; col++) {
                const x = col * (brickW + 1) + xOffset;
                for (let by = 0; by < brickH; by++) {
                    for (let bx = 0; bx < brickW; bx++) {
                        const px = x + bx;
                        const py = y + by;
                        if (px >= 0 && px < 16 && py >= 0 && py < 16) {
                            const n = textureNoise.noise2D(px * 1.5, py * 1.5);
                            ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.BRICK], -10 + n * 20);
                            ctx.fillRect(px, py, 1, 1);
                        }
                    }
                }
            }
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE || blockType === BLOCK_TYPES.GOLD_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], y % 8 === 0 ? 10 : -8);
            ctx.fillRect(0, y, 16, 2);
        }
        const oreColor = blockType === BLOCK_TYPES.IRON_ORE ? '#e8c4a2' : '#f9db43';
        const oreShade = blockType === BLOCK_TYPES.IRON_ORE ? '#a88062' : '#b89410';
        const clusters = [
            [3, 4], [4, 4], [4, 5], [10, 3], [11, 3], [10, 4],
            [6, 10], [7, 10], [7, 11], [12, 11], [13, 11]
        ];
        clusters.forEach(([cx, cy]) => {
            ctx.fillStyle = oreColor;
            ctx.fillRect(cx, cy, 1, 1);
            ctx.fillStyle = oreShade;
            ctx.fillRect(cx, Math.min(15, cy + 1), 1, 1);
        });
    }

    if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && blockType !== BLOCK_TYPES.BRICK && blockType !== BLOCK_TYPES.PLANKS) {
        for (let i = 0; i < 80; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const opacity = Math.random() * 0.22;
            ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.strokeRect(0, 0, 16, 16);

    BLOCK_CANVASES[blockType] = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

const BLOCK_TEXTURES = {};
Object.entries(BLOCK_COLORS).forEach(([type, color]) => {
    BLOCK_TEXTURES[type] = createBlockTexture(Number(type), color);
});

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Held Item / Hand Setup
const HELD_BLOCK_MATERIALS = {};
Object.keys(BLOCK_COLORS).forEach(type => {
    const numType = Number(type);
    HELD_BLOCK_MATERIALS[numType] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[numType],
        transparent: numType === BLOCK_TYPES.GLASS || numType === BLOCK_TYPES.WATER || numType === BLOCK_TYPES.LEAVES,
        opacity: numType === BLOCK_TYPES.GLASS ? 0.6 : (numType === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: numType === BLOCK_TYPES.LEAVES ? 0.5 : 0,
        side: numType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
    });
});

const heldBlockGroup = new THREE.Group();
const heldBlockGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const heldBlockMesh = new THREE.Mesh(heldBlockGeometry, HELD_BLOCK_MATERIALS[BLOCK_TYPES.STONE]);
heldBlockMesh.position.set(0, 0, 0);
heldBlockMesh.rotation.set(0.2, -0.4, 0.1);
heldBlockGroup.add(heldBlockMesh);
camera.add(heldBlockGroup);

// Default held block resting position relative to camera
const HELD_REST_POS = new THREE.Vector3(0.48, -0.42, -0.65);
heldBlockGroup.position.copy(HELD_REST_POS);

let swingProgress = 0;
let isSwinging = false;
let bobTimer = 0;

function triggerSwing() {
    isSwinging = true;
    swingProgress = 0;
}

function updateHeldBlockModel() {
    if (HELD_BLOCK_MATERIALS[selectedBlock]) {
        heldBlockMesh.material = HELD_BLOCK_MATERIALS[selectedBlock];
    }
}

function updateHeldBlock(delta = 1) {
    // Bobbing when moving
    const isMoving = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || joystickVector.length() > 0.1;
    if (isMoving && isGrounded) {
        bobTimer += 0.12 * delta;
    } else {
        bobTimer = 0;
    }

    const bobX = Math.cos(bobTimer) * 0.025;
    const bobY = Math.abs(Math.sin(bobTimer)) * 0.035;

    // Swing animation
    let swingOffsetZ = 0;
    let swingOffsetY = 0;
    let swingRotX = 0;
    let swingRotY = 0;

    if (isSwinging) {
        swingProgress += 0.1 * delta;
        if (swingProgress >= 1) {
            isSwinging = false;
            swingProgress = 0;
        } else {
            const swingFactor = Math.sin(swingProgress * Math.PI);
            swingOffsetY = -swingFactor * 0.12;
            swingOffsetZ = -swingFactor * 0.18;
            swingRotX = -swingFactor * 0.6;
            swingRotY = swingFactor * 0.4;
        }
    }

    heldBlockGroup.position.set(
        HELD_REST_POS.x + bobX,
        HELD_REST_POS.y - bobY + swingOffsetY,
        HELD_REST_POS.z + swingOffsetZ
    );
    heldBlockMesh.rotation.set(
        0.2 + swingRotX,
        -0.4 + swingRotY,
        0.1 + (bobX * 1.5)
    );
}

// Sound system
function createOscillatorSound(frequency, duration, type = 'sine', gain = 0.07, attack = 0.005) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const context = THREE.AudioContext.getContext();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(40, frequency * 0.85),
            context.currentTime + duration
        );
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        gainNode.gain.setValueAtTime(0.0001, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(gain, context.currentTime + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    } catch (e) {
        console.warn('Sound could not be played', e);
    }
}

function playSound(action) {
    if (action === 'break') {
        createOscillatorSound(140, 0.08, 'square', 0.05, 0.002);
        createOscillatorSound(92, 0.11, 'triangle', 0.03, 0.003);
    }
    if (action === 'place') {
        createOscillatorSound(280, 0.07, 'sine', 0.035, 0.002);
        createOscillatorSound(420, 0.06, 'triangle', 0.022, 0.002);
    }
    if (action === 'jump') {
        createOscillatorSound(210, 0.12, 'triangle', 0.045, 0.003);
        createOscillatorSound(300, 0.08, 'sine', 0.022, 0.002);
    }
    if (action === 'click') {
        createOscillatorSound(520, 0.03, 'sine', 0.03, 0.001);
    }
    if (action === 'footstep') {
        createOscillatorSound(90 + Math.random() * 20, 0.05, 'triangle', 0.02, 0.002);
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    let skyColor, lightIntensity;

    if (gameTime < 2000) { // Sunrise
        const t = gameTime / 2000;
        skyColor = new THREE.Color(0xffad60).lerp(new THREE.Color(0x87CEEB), t);
        lightIntensity = 0.4 + t * 0.4;
    } else if (gameTime < 10000) { // Day
        skyColor = new THREE.Color(0x87CEEB);
        lightIntensity = 0.8;
    } else if (gameTime < 12000) { // Sunset
        const t = (gameTime - 10000) / 2000;
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0xff7043), t);
        lightIntensity = 0.8 - t * 0.4;
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.1;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.1 + t * 0.3;
    }

    scene.background.copy(skyColor);
    scene.fog.color.copy(skyColor);
    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const orbitDistance = 140;
    const sunX = camera.position.x + Math.cos(sunAngle) * orbitDistance;
    const sunY = camera.position.y + Math.sin(sunAngle) * orbitDistance;
    const sunZ = camera.position.z + 40;

    directionalLight.position.set(sunX, sunY, sunZ);

    if (sunMesh && moonMesh) {
        sunMesh.position.set(sunX, sunY, sunZ);
        sunMesh.visible = sunY > -10;

        // Moon is opposite to the sun
        const moonX = camera.position.x + Math.cos(sunAngle + Math.PI) * orbitDistance;
        const moonY = camera.position.y + Math.sin(sunAngle + Math.PI) * orbitDistance;
        const moonZ = camera.position.z - 40;
        moonMesh.position.set(moonX, moonY, moonZ);
        moonMesh.visible = moonY > -10;
    }

    if (stars) {
        stars.position.copy(camera.position);
        // Fade stars in during night (from sunset 12000 to pre-dawn 24000)
        let starOpacity = 0;
        if (gameTime >= 13000 && gameTime <= 23000) {
            starOpacity = Math.min(1.0, (gameTime - 13000) / 1500);
            if (gameTime > 21500) {
                starOpacity = Math.max(0, 1.0 - (gameTime - 21500) / 1500);
            }
        }
        stars.material.opacity = starOpacity;
    }
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

// Sun and Moon Celestial Objects
const sunGeometry = new THREE.BoxGeometry(8, 8, 8);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7aa });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(7, 7, 7);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe6e6fa });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Stars
const starCount = 300;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 180;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10; // keep above horizon
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Procedural Drifting Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75
});
const cloudGeometry = new THREE.BoxGeometry(1, 1, 1);
const cloudClusterCount = 12;
const clouds = [];

for (let i = 0; i < cloudClusterCount; i++) {
    const cluster = new THREE.Group();
    const baseCX = (Math.random() - 0.5) * 120;
    const baseCZ = (Math.random() - 0.5) * 120;
    const cloudY = 24 + Math.random() * 2;
    const blocksInCloud = 5 + Math.floor(Math.random() * 6);

    for (let b = 0; b < blocksInCloud; b++) {
        const cloudBlock = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudBlock.scale.set(
            3 + Math.random() * 3,
            1.2,
            3 + Math.random() * 3
        );
        cloudBlock.position.set(
            (b % 3) * 3 + (Math.random() - 0.5) * 2,
            0,
            Math.floor(b / 3) * 3 + (Math.random() - 0.5) * 2
        );
        cluster.add(cloudBlock);
    }
    cluster.position.set(baseCX, cloudY, baseCZ);
    cloudsGroup.add(cluster);
    clouds.push(cluster);
}
scene.add(cloudsGroup);

function updateClouds() {
    clouds.forEach(cluster => {
        cluster.position.x += 0.02;
        if (cluster.position.x > camera.position.x + 80) {
            cluster.position.x = camera.position.x - 80;
            cluster.position.z = camera.position.z + (Math.random() - 0.5) * 120;
        }
    });
}

// Selection Box
const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
selectionBox.geometry.translate(0.5, 0.5, 0.5);
selectionBox.raycast = () => null; // Don't let the selection box block raycasts
scene.add(selectionBox);

// Particles
const particles = [];
const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

function createParticles(pos, color) {
    for (let i = 0; i < 8; i++) {
        const material = new THREE.MeshLambertMaterial({ color: color });
        const particle = new THREE.Mesh(particleGeometry, material);

        particle.position.set(
            pos.x + (Math.random() - 0.5),
            pos.y + (Math.random() - 0.5),
            pos.z + (Math.random() - 0.5)
        );

        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );

        particle.life = 1.0;
        scene.add(particle);
        particles.push(particle);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.velocity.y += GRAVITY;
        p.position.add(p.velocity);
        p.life -= 0.02;
        p.scale.setScalar(p.life);

        if (p.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

class Chunk {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return BLOCK_TYPES.AIR;
        }
        return this.blocks[x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT];
    }

    setBlock(x, y, z, type) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            this.blocks[x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT] = type;
        }
    }
}

const chunks = new Map();

function getChunkKey(x, z) {
    return `${x},${z}`;
}

const simplex = new SimplexNoise();

function generateTerrain(chunkX, chunkZ) {
    const chunk = new Chunk(chunkX, chunkZ);
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldZ = chunkZ * CHUNK_SIZE + z;
            const elevationNoise = simplex.noise2D(worldX * 0.05, worldZ * 0.05);
            const roughnessNoise = simplex.noise2D(worldX * 0.11, worldZ * 0.11);
            const height = Math.floor((elevationNoise + 1) * 4 + roughnessNoise * 1.5) + 5;
            const isBeach = height <= 6;

            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                if (y < height - 4) {
                    const coalNoise = simplex.noise2D(worldX * 0.2, (y + worldZ) * 0.2);
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.25, (y + worldZ + 50) * 0.25);
                    const goldNoise = simplex.noise2D((worldX + 100) * 0.3, (y + worldZ + 100) * 0.3);

                    if (goldNoise > 0.72 && y < 4) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (ironNoise > 0.65 && y < 7) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.IRON_ORE);
                    } else if (coalNoise > 0.6) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.COAL_ORE);
                    } else {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.STONE);
                    }
                } else if (y < height - 1) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.DIRT);
                } else if (y === height - 1) {
                    chunk.setBlock(x, y, z, isBeach ? BLOCK_TYPES.SAND : BLOCK_TYPES.GRASS);
                } else if (y <= 5) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
                } else {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
                }
            }

            // Trees
            if (!isBeach && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8) {
                    // Trunk
                    for (let ty = 0; ty < 3; ty++) {
                        chunk.setBlock(x, height + ty, z, BLOCK_TYPES.WOOD);
                    }
                    // Leaves
                    for (let lx = -1; lx <= 1; lx++) {
                        for (let lz = -1; lz <= 1; lz++) {
                            for (let ly = 0; ly < 2; ly++) {
                                if (lx === 0 && lz === 0 && ly === 0) continue;
                                chunk.setBlock(x + lx, height + 2 + ly, z + lz, BLOCK_TYPES.LEAVES);
                            }
                        }
                    }
                }
            }
        }
    }
    return chunk;
}

function getBlockAt(worldX, worldY, worldZ) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = chunks.get(getChunkKey(chunkX, chunkZ));
    if (!chunk) return BLOCK_TYPES.AIR;

    const x = Math.floor(worldX) - chunkX * CHUNK_SIZE;
    const y = Math.floor(worldY);
    const z = Math.floor(worldZ) - chunkZ * CHUNK_SIZE;

    return chunk.getBlock(x, y, z);
}

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER;
}

function createChunkMesh(chunk) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0.5, 0.5, 0.5); // Align mesh with grid
    const instancedMeshes = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk.getBlock(x, y, z);
                if (blockType !== BLOCK_TYPES.AIR) {
                    // Face culling: only add if at least one face is visible
                    const neighbors = [
                        getBlockAt(chunk.x * CHUNK_SIZE + x + 1, y, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x - 1, y, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y + 1, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y - 1, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z + 1),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z - 1),
                    ];

                    const isVisible = neighbors.some(neighbor => isBlockTransparent(neighbor));

                    if (isVisible) {
                        if (!instancedMeshes[blockType]) {
                            instancedMeshes[blockType] = [];
                        }
                        const matrix = new THREE.Matrix4().makeTranslation(
                            chunk.x * CHUNK_SIZE + x,
                            y,
                            chunk.z * CHUNK_SIZE + z
                        );
                        instancedMeshes[blockType].push(matrix);
                    }
                }
            }
        }
    }

    const group = new THREE.Group();
    for (const [blockTypeStr, matrices] of Object.entries(instancedMeshes)) {
        const blockType = parseInt(blockTypeStr);
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: blockType === BLOCK_TYPES.LEAVES ? 0.5 : 0,
            side: blockType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
        });
        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        for (let i = 0; i < matrices.length; i++) {
            mesh.setMatrixAt(i, matrices[i]);
        }
        group.add(mesh);
    }
    chunk.mesh = group;
    scene.add(group);
}

function rebuildChunkMesh(chunk) {
    if (chunk.mesh) {
        scene.remove(chunk.mesh);
    }
    createChunkMesh(chunk);
}

function ensureChunk(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    if (chunks.has(key)) return false;

    const chunk = generateTerrain(chunkX, chunkZ);
    chunks.set(key, chunk);
    return true;
}

function rebuildChunkAndNeighbors(chunkX, chunkZ) {
    const offsets = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    offsets.forEach(([offsetX, offsetZ]) => {
        const chunk = chunks.get(getChunkKey(chunkX + offsetX, chunkZ + offsetZ));
        if (chunk) {
            rebuildChunkMesh(chunk);
        }
    });
}

let currentCenterChunkX = Number.NaN;
let currentCenterChunkZ = Number.NaN;
function updateVisibleChunks(force = false) {
    const playerChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

    if (!force && playerChunkX === currentCenterChunkX && playerChunkZ === currentCenterChunkZ) {
        return;
    }

    currentCenterChunkX = playerChunkX;
    currentCenterChunkZ = playerChunkZ;

    const requiredChunkKeys = new Set();
    const createdChunks = [];

    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
        for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
            requiredChunkKeys.add(getChunkKey(x, z));
            if (ensureChunk(x, z)) {
                createdChunks.push([x, z]);
            }
        }
    }

    chunks.forEach((chunk, key) => {
        if (!requiredChunkKeys.has(key)) {
            if (chunk.mesh) {
                scene.remove(chunk.mesh);
            }
            chunks.delete(key);
        }
    });

    if (createdChunks.length === 0) {
        return;
    }

    createdChunks.forEach(([chunkX, chunkZ]) => {
        rebuildChunkAndNeighbors(chunkX, chunkZ);
    });
}

// Initialize world around player
updateVisibleChunks(true);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player state
const playerVelocity = new THREE.Vector3();
let isGrounded = false;
let selectedBlock = BLOCK_TYPES.STONE;

const inventoryUI = document.getElementById('inventory');
const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.PLANKS,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.IRON_ORE
];

const inventorySlots = [];

function selectSlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedBlock = inventoryBlocks[index];
    inventorySlots.forEach((slot, i) => {
        if (i === index) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    });
    if (typeof updateHeldBlockModel === 'function') {
        updateHeldBlockModel();
    }
    playSound('click');
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    if (BLOCK_CANVASES[type]) {
        slot.style.backgroundImage = `url(${BLOCK_CANVASES[type].toDataURL()})`;
        slot.style.backgroundSize = 'cover';
        slot.style.imageRendering = 'pixelated';
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }
    const slotNumber = document.createElement('span');
    slotNumber.className = 'slot-number';
    slotNumber.textContent = (index + 1).toString();
    slot.appendChild(slotNumber);

    if (type === selectedBlock) slot.classList.add('selected');

    slot.onclick = () => {
        selectSlot(index);
    };

    inventorySlots.push(slot);
    inventoryUI.appendChild(slot);
});

const controls = new PointerLockControls(camera, document.body);
const overlay = document.getElementById('overlay');

overlay.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    overlay.style.display = 'flex';
});

const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Number keys 1-9 to select inventory slots
    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= inventoryBlocks.length) {
            selectSlot(digit - 1);
        }
    }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Mouse wheel to cycle inventory slots
window.addEventListener('wheel', (e) => {
    if (!controls.isLocked) return;
    const currentIndex = inventoryBlocks.indexOf(selectedBlock);
    if (currentIndex === -1) return;
    let nextIndex;
    if (e.deltaY > 0) {
        nextIndex = (currentIndex + 1) % inventoryBlocks.length;
    } else {
        nextIndex = (currentIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length;
    }
    selectSlot(nextIndex);
}, { passive: true });

// Mobile touch state
let joystickVector = new THREE.Vector2();
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
let isTouchingJoystick = false;

joystickBase.addEventListener('touchstart', (e) => {
    isTouchingJoystick = true;
});

joystickBase.addEventListener('touchmove', (e) => {
    if (!isTouchingJoystick) return;
    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.min(50, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
    const angle = Math.atan2(deltaY, deltaX);

    joystickVector.x = (Math.cos(angle) * distance) / 50;
    joystickVector.y = (Math.sin(angle) * distance) / 50;

    joystickHandle.style.left = `calc(50% + ${Math.cos(angle) * distance}px)`;
    joystickHandle.style.top = `calc(50% + ${Math.sin(angle) * distance}px)`;
});

joystickBase.addEventListener('touchend', () => {
    isTouchingJoystick = false;
    joystickVector.set(0, 0);
    joystickHandle.style.left = '50%';
    joystickHandle.style.top = '50%';
});

// Mobile look controls
let lastTouchX, lastTouchY;
document.addEventListener('touchstart', (e) => {
    if (e.target.closest('#joystick-base') || e.target.closest('#mobile-buttons') || e.target.closest('#inventory')) return;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#joystick-base') || e.target.closest('#mobile-buttons') || e.target.closest('#inventory')) return;
    if (lastTouchX === undefined) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;

    const sensitivity = 0.004;
    camera.rotation.y -= deltaX * sensitivity;
    camera.rotation.x -= deltaY * sensitivity;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}, { passive: false });

document.getElementById('jump-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGrounded) {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSound('jump');
    }
});

document.getElementById('place-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    performAction('place');
});

document.getElementById('break-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    performAction('break');
});

document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    if (e.button === 0) performAction('break');
    if (e.button === 2) performAction('place');
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();
function performAction(action) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance > 5) return;

        const pos = intersect.point.clone();

        triggerSwing();

        if (action === 'break') {
            pos.add(intersect.face.normal.clone().multiplyScalar(-0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            const blockType = getBlockAt(x, y, z);
            if (blockType !== BLOCK_TYPES.AIR) {
                createParticles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), BLOCK_COLORS[blockType]);
                updateBlock(x, y, z, BLOCK_TYPES.AIR);
                playSound('break');
                if (typeof stats !== 'undefined') {
                    stats.broken++;
                    updateStatsHUD();
                }
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);
            // Don't place block where player is standing
            const playerPos = camera.position.clone();
            if (Math.floor(playerPos.x) === x && Math.floor(playerPos.z) === z &&
               (Math.floor(playerPos.y) === y || Math.floor(playerPos.y - 1) === y)) {
                return;
            }
            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            if (typeof stats !== 'undefined') {
                stats.placed++;
                updateStatsHUD();
            }
        }
    }
}

function updateBlock(worldX, worldY, worldZ, type) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = chunks.get(getChunkKey(chunkX, chunkZ));

    if (chunk) {
        const x = worldX - chunkX * CHUNK_SIZE;
        const y = worldY;
        const z = worldZ - chunkZ * CHUNK_SIZE;

        chunk.setBlock(x, y, z, type);
        rebuildChunkAndNeighbors(chunkX, chunkZ);
    }
}

function handleMovement() {
    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        // Mobile movement
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    direction
        .normalize()
        .multiplyScalar(MOVE_SPEED)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    if (keys['Space'] && isGrounded) {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSound('jump');
    }
}

let footstepTimer = 0;
function updatePhysics() {
    playerVelocity.y += GRAVITY;

    const nextPos = camera.position.clone().add(playerVelocity);

    // Simple collision detection
    const wasGrounded = isGrounded;
    if (getBlockAt(nextPos.x, nextPos.y - PLAYER_HEIGHT, nextPos.z) !== BLOCK_TYPES.AIR) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - PLAYER_HEIGHT) + PLAYER_HEIGHT;
    } else {
        isGrounded = false;
    }

    // Footstep audio
    const isMovingHoriz = Math.hypot(playerVelocity.x, playerVelocity.z) > 0.03;
    if (isGrounded && isMovingHoriz) {
        footstepTimer += 1;
        if (footstepTimer % 22 === 0) {
            playSound('footstep');
        }
    } else {
        footstepTimer = 0;
    }

    // Horizontal collisions
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - PLAYER_HEIGHT + 0.1;

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (getBlockAt(checkX, playerY, camera.position.z) !== BLOCK_TYPES.AIR ||
            getBlockAt(checkX, playerY + 1, camera.position.z) !== BLOCK_TYPES.AIR) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (getBlockAt(camera.position.x, playerY, checkZ) !== BLOCK_TYPES.AIR ||
            getBlockAt(camera.position.x, playerY + 1, checkZ) !== BLOCK_TYPES.AIR) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);
}

function updateSelectionBox() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance <= 5) {
            const pos = intersect.point.clone();
            pos.add(intersect.face.normal.clone().multiplyScalar(-0.5));
            selectionBox.position.set(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
            selectionBox.visible = true;
            return;
        }
    }
    selectionBox.visible = false;
}

// Stats HUD Tracking
const stats = {
    broken: 0,
    placed: 0
};

const posDisplay = document.getElementById('pos-display');
const statBroken = document.getElementById('stat-broken');
const statPlaced = document.getElementById('stat-placed');

function updateStatsHUD() {
    if (statBroken) statBroken.textContent = stats.broken;
    if (statPlaced) statPlaced.textContent = stats.placed;
}

let lastHudUpdate = 0;
function updateCoordinatesHUD() {
    if (posDisplay && Date.now() - lastHudUpdate > 100) {
        lastHudUpdate = Date.now();
        const x = camera.position.x.toFixed(1);
        const y = camera.position.y.toFixed(1);
        const z = camera.position.z.toFixed(1);
        posDisplay.textContent = `${x}, ${y}, ${z}`;
    }
}

// Basic game loop
function animate() {
    requestAnimationFrame(animate);
    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    updateClouds();
    updateHeldBlock();
    updateCoordinatesHUD();
    renderer.render(scene, camera);
}

animate();

// Expose for testing/debugging
window.game = {
    camera,
    scene,
    selectedBlock: () => selectedBlock,
    selectSlot,
    stats,
    setGameTime: (t) => { gameTime = t; },
    getGameTime: () => gameTime,
    performAction
};

console.log('Three.js scene initialized');
