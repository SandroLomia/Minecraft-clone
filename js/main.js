import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const PLAYER_HEIGHT = 1.8;
const PLAYER_CROUCH_HEIGHT = 1.4;
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
    IRON_ORE: 11,
    GOLD_ORE: 12,
    FLOWER_RED: 13,
    FLOWER_YELLOW: 14,
    TALL_GRASS: 15,
    BRICK: 16
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
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfad64a,
    [BLOCK_TYPES.FLOWER_RED]: 0xe53935,
    [BLOCK_TYPES.FLOWER_YELLOW]: 0xfdd835,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047,
    [BLOCK_TYPES.BRICK]: 0x904a38
};

function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustHexColor(hexColor, amount) {
    const r = clampColor(((hexColor >> 16) & 0xff) + amount);
    const g = clampColor(((hexColor >> 8) & 0xff) + amount);
    const b = clampColor((hexColor & 0xff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
}

function isFoliageBlock(blockType) {
    return (
        blockType === BLOCK_TYPES.FLOWER_RED ||
        blockType === BLOCK_TYPES.FLOWER_YELLOW ||
        blockType === BLOCK_TYPES.TALL_GRASS
    );
}

function isBlockTransparent(type) {
    return (
        type === BLOCK_TYPES.AIR ||
        type === BLOCK_TYPES.GLASS ||
        type === BLOCK_TYPES.LEAVES ||
        type === BLOCK_TYPES.WATER ||
        isFoliageBlock(type)
    );
}

function isBlockSolid(type) {
    return (
        type !== BLOCK_TYPES.AIR &&
        type !== BLOCK_TYPES.WATER &&
        !isFoliageBlock(type)
    );
}

const BLOCK_CANVASES = {};

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
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(2, 2, 12, 12);
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.9)';
        ctx.strokeRect(1, 1, 14, 14);
        ctx.beginPath();
        ctx.moveTo(3, 13);
        ctx.lineTo(13, 3);
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
        for (let i = 0; i < 7; i++) {
            const rx = (i * 5 + 3) % 12 + 2;
            const ry = (i * 7 + 2) % 12 + 2;
            ctx.fillStyle = '#222';
            ctx.fillRect(rx, ry, 2, 2);
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        for (let i = 0; i < 6; i++) {
            const rx = (i * 4 + 2) % 12 + 2;
            const ry = (i * 9 + 4) % 12 + 2;
            ctx.fillStyle = '#d8af93';
            ctx.fillRect(rx, ry, 2, 2);
        }
    } else if (blockType === BLOCK_TYPES.GOLD_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        for (let i = 0; i < 6; i++) {
            const rx = (i * 6 + 1) % 12 + 2;
            const ry = (i * 5 + 3) % 12 + 2;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(rx, ry, 2, 2);
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
    } else if (blockType === BLOCK_TYPES.BRICK) {
        ctx.fillStyle = '#904a38';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#d0c0b0';
        for (let y = 3; y < 16; y += 4) {
            ctx.fillRect(0, y, 16, 1);
        }
        for (let x = 7; x < 16; x += 8) {
            ctx.fillRect(x, 0, 1, 4);
            ctx.fillRect(x, 8, 1, 4);
        }
        for (let x = 3; x < 16; x += 8) {
            ctx.fillRect(x, 4, 1, 4);
            ctx.fillRect(x, 12, 1, 4);
        }
    } else if (blockType === BLOCK_TYPES.FLOWER_RED || blockType === BLOCK_TYPES.FLOWER_YELLOW) {
        ctx.clearRect(0, 0, 16, 16);
        // Green stem
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(7, 7, 2, 9);
        // Petals
        ctx.fillStyle = blockType === BLOCK_TYPES.FLOWER_RED ? '#e53935' : '#fdd835';
        ctx.fillRect(5, 3, 6, 6);
        // Center dot
        ctx.fillStyle = blockType === BLOCK_TYPES.FLOWER_RED ? '#fdd835' : '#ff9800';
        ctx.fillRect(7, 5, 2, 2);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#43a047';
        for (let i = 0; i < 5; i++) {
            const x = 2 + i * 3;
            const h = 8 + (i % 3) * 3;
            ctx.fillRect(x, 16 - h, 2, h);
        }
    }

    if (
        blockType !== BLOCK_TYPES.DIRT &&
        blockType !== BLOCK_TYPES.GRASS &&
        blockType !== BLOCK_TYPES.SAND &&
        blockType !== BLOCK_TYPES.LEAVES &&
        !isFoliageBlock(blockType)
    ) {
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const opacity = Math.random() * 0.15;
            ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (!isFoliageBlock(blockType) && blockType !== BLOCK_TYPES.GLASS) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(0, 0, 16, 16);
    }

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

function createFoliageGeometry() {
    const plane1 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    plane1.rotateY(Math.PI / 4);
    const plane2 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    plane2.rotateY(-Math.PI / 4);

    const pos1 = Array.from(plane1.attributes.position.array);
    const pos2 = Array.from(plane2.attributes.position.array);
    const uv1 = Array.from(plane1.attributes.uv.array);
    const uv2 = Array.from(plane2.attributes.uv.array);
    const norm1 = Array.from(plane1.attributes.normal.array);
    const norm2 = Array.from(plane2.attributes.normal.array);

    const mergedPos = new Float32Array([...pos1, ...pos2]);
    const mergedUv = new Float32Array([...uv1, ...uv2]);
    const mergedNorm = new Float32Array([...norm1, ...norm2]);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
    geom.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    geom.translate(0.5, 0.5, 0.5);
    return geom;
}

const foliageGeometry = createFoliageGeometry();

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

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
        // Audio might be blocked before user interaction
    }
}

function playSound(action) {
    if (action === 'break') {
        createOscillatorSound(140, 0.08, 'square', 0.05, 0.002);
        createOscillatorSound(92, 0.11, 'triangle', 0.03, 0.003);
    } else if (action === 'place') {
        createOscillatorSound(280, 0.07, 'sine', 0.035, 0.002);
        createOscillatorSound(420, 0.06, 'triangle', 0.022, 0.002);
    } else if (action === 'jump') {
        createOscillatorSound(210, 0.12, 'triangle', 0.045, 0.003);
        createOscillatorSound(300, 0.08, 'sine', 0.022, 0.002);
    } else if (action === 'footstep') {
        createOscillatorSound(100 + Math.random() * 30, 0.04, 'triangle', 0.02, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(180, 0.15, 'sine', 0.06, 0.005);
        createOscillatorSound(120, 0.2, 'triangle', 0.04, 0.005);
    } else if (action === 'click') {
        createOscillatorSound(600, 0.03, 'sine', 0.03, 0.001);
    }
}

// Celestial Objects (Sun, Moon, Starfield)
const sunGeo = new THREE.BoxGeometry(6, 6, 6);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

const moonGeo = new THREE.BoxGeometry(5, 5, 5);
const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0e6ed });
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
scene.add(moonMesh);

// Starfield
const starCount = 500;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 250;
    starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = radius * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// Cloud System
const cloudGroup = new THREE.Group();
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const cloudGeo = new THREE.BoxGeometry(1, 1, 1);

function generateClouds() {
    for (let c = 0; c < 12; c++) {
        const cloudX = (Math.random() - 0.5) * 200;
        const cloudZ = (Math.random() - 0.5) * 200;
        const width = Math.floor(Math.random() * 4) + 4;
        const depth = Math.floor(Math.random() * 4) + 4;

        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                if (Math.random() > 0.25) {
                    const block = new THREE.Mesh(cloudGeo, cloudMat);
                    block.position.set(cloudX + x * 2, 22, cloudZ + z * 2);
                    block.scale.set(2, 1, 2);
                    cloudGroup.add(block);
                }
            }
        }
    }
    scene.add(cloudGroup);
}
generateClouds();

function updateClouds() {
    cloudGroup.position.x += 0.02;
    if (cloudGroup.position.x > 100) {
        cloudGroup.position.x = -100;
    }
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

const DAY_DURATION = 24000;
let gameTime = 6000;
let isUnderwater = false;

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    let skyColor, lightIntensity, starOpacity = 0;

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
        starOpacity = t * 0.8;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.15;
        starOpacity = 0.85;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.15 + t * 0.25;
        starOpacity = (1 - t) * 0.8;
    }

    starMat.opacity = starOpacity;

    if (isUnderwater) {
        scene.background.setHex(0x0d47a1);
        scene.fog.color.setHex(0x0d47a1);
        scene.fog.near = 1;
        scene.fog.far = 15;
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    directionalLight.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        50
    );

    // Orbit Sun & Moon
    const playerPos = camera.position;
    sunMesh.position.set(
        playerPos.x + Math.cos(sunAngle) * 120,
        playerPos.y + Math.sin(sunAngle) * 120,
        playerPos.z + 40
    );
    moonMesh.position.set(
        playerPos.x - Math.cos(sunAngle) * 120,
        playerPos.y - Math.sin(sunAngle) * 120,
        playerPos.z - 40
    );
    starField.position.copy(playerPos);
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// First Person Held Block
const heldBlockGroup = new THREE.Group();
const HELD_BLOCK_MATERIALS = {};

Object.keys(BLOCK_COLORS).forEach(type => {
    const bType = Number(type);
    HELD_BLOCK_MATERIALS[bType] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[bType],
        transparent: isBlockTransparent(bType),
        opacity: bType === BLOCK_TYPES.GLASS || bType === BLOCK_TYPES.WATER ? 0.6 : 1,
        alphaTest: isFoliageBlock(bType) || bType === BLOCK_TYPES.LEAVES ? 0.5 : 0,
        side: isFoliageBlock(bType) || bType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
    });
});

const heldBlockBoxGeom = new THREE.BoxGeometry(0.25, 0.25, 0.25);
let heldBlockMesh = new THREE.Mesh(heldBlockBoxGeom, HELD_BLOCK_MATERIALS[BLOCK_TYPES.GRASS]);
heldBlockGroup.add(heldBlockMesh);
heldBlockGroup.position.set(0.35, -0.3, -0.55);
camera.add(heldBlockGroup);
scene.add(camera);

let swingProgress = 0;
let bobTimer = 0;

function updateHeldBlock(selectedBlockType, isMoving) {
    if (heldBlockMesh.material !== HELD_BLOCK_MATERIALS[selectedBlockType]) {
        heldBlockMesh.material = HELD_BLOCK_MATERIALS[selectedBlockType];
        heldBlockMesh.geometry = isFoliageBlock(selectedBlockType) ? foliageGeometry : heldBlockBoxGeom;
        heldBlockMesh.scale.setScalar(isFoliageBlock(selectedBlockType) ? 0.35 : 1.0);
    }

    if (isMoving) {
        bobTimer += 0.12;
    } else {
        bobTimer = 0;
    }

    const bobX = Math.sin(bobTimer) * 0.02;
    const bobY = Math.abs(Math.cos(bobTimer)) * 0.02;

    if (swingProgress > 0) {
        swingProgress += 0.15;
        if (swingProgress >= Math.PI) swingProgress = 0;
    }

    const swingRot = Math.sin(swingProgress) * 0.6;
    heldBlockGroup.position.set(0.35 + bobX, -0.3 - bobY - swingRot * 0.2, -0.55 + swingRot * 0.1);
    heldBlockGroup.rotation.set(swingRot, -swingRot * 0.5, 0);
}

function triggerSwingAnimation() {
    swingProgress = 0.01;
}

// Selection Box
const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
selectionBox.geometry.translate(0.5, 0.5, 0.5);
selectionBox.raycast = () => null;
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
        p.scale.setScalar(Math.max(0, p.life));

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
                    const oreVal = simplex.noise2D(worldX * 0.25, (y + worldZ) * 0.25);
                    if (oreVal > 0.72) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (oreVal > 0.6) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.IRON_ORE);
                    } else if (oreVal > 0.48) {
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

            // Vegetation & Trees
            if (!isBeach && height > 6 && x > 0 && x < CHUNK_SIZE - 1 && z > 0 && z < CHUNK_SIZE - 1) {
                const vegNoise = textureNoise.noise2D(worldX * 0.4, worldZ * 0.4);
                if (vegNoise > 0.82) {
                    // Tree
                    for (let ty = 0; ty < 3; ty++) {
                        chunk.setBlock(x, height + ty, z, BLOCK_TYPES.WOOD);
                    }
                    for (let lx = -1; lx <= 1; lx++) {
                        for (let lz = -1; lz <= 1; lz++) {
                            for (let ly = 0; ly < 2; ly++) {
                                if (lx === 0 && lz === 0 && ly === 0) continue;
                                chunk.setBlock(x + lx, height + 2 + ly, z + lz, BLOCK_TYPES.LEAVES);
                            }
                        }
                    }
                } else if (vegNoise > 0.5) {
                    if (vegNoise > 0.7) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.FLOWER_RED);
                    } else if (vegNoise > 0.6) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.FLOWER_YELLOW);
                    } else {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
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

function createChunkMesh(chunk) {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    boxGeometry.translate(0.5, 0.5, 0.5);

    const instancedMeshes = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk.getBlock(x, y, z);
                if (blockType !== BLOCK_TYPES.AIR) {
                    const neighbors = [
                        getBlockAt(chunk.x * CHUNK_SIZE + x + 1, y, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x - 1, y, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y + 1, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y - 1, chunk.z * CHUNK_SIZE + z),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z + 1),
                        getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z - 1),
                    ];

                    const isVisible = isFoliageBlock(blockType) || neighbors.some(neighbor => isBlockTransparent(neighbor));

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
        const geom = isFoliageBlock(blockType) ? foliageGeometry : boxGeometry;
        const material = HELD_BLOCK_MATERIALS[blockType];

        const mesh = new THREE.InstancedMesh(geom, material, matrices.length);
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

function rebuildChunkAndNeighbors(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    if (chunks.has(key)) {
        rebuildChunkMesh(chunks.get(key));
    }
    const neighborOffsets = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    for (const [dx, dz] of neighborOffsets) {
        const nKey = getChunkKey(chunkX + dx, chunkZ + dz);
        if (chunks.has(nKey)) {
            rebuildChunkMesh(chunks.get(nKey));
        }
    }
}

function updateVisibleChunks() {
    const playerChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
        for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
            const key = getChunkKey(x, z);
            if (!chunks.has(key)) {
                const chunk = generateTerrain(x, z);
                chunks.set(key, chunk);
                createChunkMesh(chunk);
            }
        }
    }
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player State & Stats
const playerVelocity = new THREE.Vector3();
let isGrounded = false;
let isSprinting = false;
let isCrouching = false;
let currentPlayerHeight = PLAYER_HEIGHT;
let selectedBlock = BLOCK_TYPES.GRASS;

const stats = {
    broken: 0,
    placed: 0
};

const statsBrokenEl = document.getElementById('stats-broken');
const statsPlacedEl = document.getElementById('stats-placed');
const statsCoordsEl = document.getElementById('stats-coords');

function updateStatsHUD() {
    if (statsBrokenEl) statsBrokenEl.textContent = stats.broken;
    if (statsPlacedEl) statsPlacedEl.textContent = stats.placed;
    if (statsCoordsEl) {
        const x = Math.floor(camera.position.x);
        const y = Math.floor(camera.position.y);
        const z = Math.floor(camera.position.z);
        statsCoordsEl.textContent = `X: ${x} Y: ${y} Z: ${z}`;
    }
}

// Hotbar Inventory UI
const inventoryUI = document.getElementById('inventory');
const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.SAND,
    BLOCK_TYPES.GLASS
];

function selectInventorySlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedBlock = inventoryBlocks[index];
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach((s, idx) => {
        if (idx === index) {
            s.classList.add('selected');
        } else {
            s.classList.remove('selected');
        }
    });
    playSound('click');
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.style.backgroundImage = `url(${BLOCK_CANVASES[type].toDataURL()})`;
    if (type === selectedBlock) slot.classList.add('selected');

    const badge = document.createElement('span');
    badge.className = 'slot-badge';
    badge.textContent = index + 1;
    slot.appendChild(badge);

    slot.onclick = () => {
        selectInventorySlot(index);
    };

    inventoryUI.appendChild(slot);
});

// Controls & Locks
const controls = new PointerLockControls(camera, document.body);
const overlay = document.getElementById('overlay');
const underwaterOverlay = document.getElementById('underwater-overlay');

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

    // Number keys 1-9
    if (e.code.startsWith('Digit') && e.code.length === 6) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 1 && num <= 9) {
            selectInventorySlot(num - 1);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mouse wheel inventory scroll
document.addEventListener('wheel', (e) => {
    const currentIdx = inventoryBlocks.indexOf(selectedBlock);
    if (currentIdx !== -1) {
        const nextIdx = e.deltaY > 0 ? (currentIdx + 1) % inventoryBlocks.length : (currentIdx - 1 + inventoryBlocks.length) % inventoryBlocks.length;
        selectInventorySlot(nextIdx);
    }
});

// Mobile touch state
let joystickVector = new THREE.Vector2();
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
let isTouchingJoystick = false;

if (joystickBase) {
    joystickBase.addEventListener('touchstart', () => {
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
}

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
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}, { passive: false });

const jumpBtn = document.getElementById('jump-button');
if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (isGrounded) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    });
}

const placeBtn = document.getElementById('place-button');
if (placeBtn) {
    placeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        performAction('place');
    });
}

const breakBtn = document.getElementById('break-button');
if (breakBtn) {
    breakBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        performAction('break');
    });
}

document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    if (e.button === 0) performAction('break');
    if (e.button === 2) performAction('place');
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();

function performAction(action) {
    triggerSwingAnimation();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance > 5) return;

        const pos = intersect.point.clone();

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
                stats.broken++;
                updateStatsHUD();
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            // Don't place block inside player
            const playerPos = camera.position.clone();
            if (
                Math.floor(playerPos.x) === x &&
                Math.floor(playerPos.z) === z &&
                (Math.floor(playerPos.y) === y || Math.floor(playerPos.y - 1) === y)
            ) {
                return;
            }
            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            stats.placed++;
            updateStatsHUD();
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

let footstepTimer = 0;

function handleMovement() {
    isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    isCrouching = (keys['ControlLeft'] || keys['ControlRight']) && !isSprinting;

    const targetHeight = isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    let speed = MOVE_SPEED;
    if (isSprinting) speed *= 1.5;
    if (isCrouching) speed *= 0.5;

    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    const isMoving = direction.lengthSq() > 0;
    updateHeldBlock(selectedBlock, isMoving && isGrounded);

    direction
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    if (isMoving && isGrounded) {
        footstepTimer += isSprinting ? 0.25 : 0.15;
        if (footstepTimer >= Math.PI) {
            playSound('footstep');
            footstepTimer = 0;
        }
    } else {
        footstepTimer = 0;
    }

    if (keys['Space']) {
        if (isUnderwater) {
            playerVelocity.y = JUMP_FORCE * 0.5;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }
}

function updatePhysics() {
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const wasUnderwater = isUnderwater;
    isUnderwater = headBlock === BLOCK_TYPES.WATER;

    if (isUnderwater !== wasUnderwater) {
        playSound('splash');
        if (underwaterOverlay) underwaterOverlay.style.display = isUnderwater ? 'block' : 'none';
    }

    if (isUnderwater) {
        playerVelocity.y += GRAVITY * 0.25;
        playerVelocity.x *= 0.85;
        playerVelocity.z *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Vertical collisions
    const feetY = nextPos.y - currentPlayerHeight;
    const feetBlock = getBlockAt(nextPos.x, feetY, nextPos.z);
    if (isBlockSolid(feetBlock)) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(feetY) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (
            isBlockSolid(getBlockAt(checkX, playerY, camera.position.z)) ||
            isBlockSolid(getBlockAt(checkX, playerY + 1, camera.position.z))
        ) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (
            isBlockSolid(getBlockAt(camera.position.x, playerY, checkZ)) ||
            isBlockSolid(getBlockAt(camera.position.x, playerY + 1, checkZ))
        ) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);
    updateStatsHUD();
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

// Game Loop
function animate() {
    requestAnimationFrame(animate);
    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateClouds();
    updateParticles();
    renderer.render(scene, camera);
}

animate();

console.log('Minecraft clone initialized');
