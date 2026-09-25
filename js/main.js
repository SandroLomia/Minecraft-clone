import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

let PLAYER_HEIGHT = 1.8;
let currentPlayerHeight = 1.8;
const PLAYER_RADIUS = 0.4;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.2;
const BASE_MOVE_SPEED = 0.1;

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
    BRICK: 12,
    RED_FLOWER: 13,
    YELLOW_FLOWER: 14,
    TALL_GRASS: 15
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
    [BLOCK_TYPES.IRON_ORE]: 0xd1b894,
    [BLOCK_TYPES.BRICK]: 0xb23b23,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfbc02d,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047
};

function isFoliageBlock(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliageBlock(type);
}

function isBlockSolid(type) {
    return type !== BLOCK_TYPES.AIR && type !== BLOCK_TYPES.WATER && !isFoliageBlock(type);
}

function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustHexColor(hexColor, amount) {
    const r = clampColor(((hexColor >> 16) & 0xff) + amount);
    const g = clampColor(((hexColor >> 8) & 0xff) + amount);
    const b = clampColor((hexColor & 0xff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
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
            const rx = (i * 5 + 3) % 12 + 2;
            const ry = (i * 7 + 1) % 12 + 2;
            ctx.fillStyle = '#222222';
            ctx.fillRect(rx, ry, 3, 2);
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        const ironSpots = [[3, 3], [10, 4], [5, 9], [11, 11], [2, 12]];
        ironSpots.forEach(([rx, ry]) => {
            ctx.fillStyle = '#d1b894';
            ctx.fillRect(rx, ry, 3, 2);
            ctx.fillStyle = '#e0cda7';
            ctx.fillRect(rx, ry, 1, 1);
        });
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
        ctx.fillStyle = '#b23b23';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#d1c7bd';
        // Horizontal mortar lines
        ctx.fillRect(0, 3, 16, 1);
        ctx.fillRect(0, 7, 16, 1);
        ctx.fillRect(0, 11, 16, 1);
        ctx.fillRect(0, 15, 16, 1);
        // Vertical mortar lines
        ctx.fillRect(8, 0, 1, 3);
        ctx.fillRect(0, 4, 1, 3); ctx.fillRect(12, 4, 1, 3);
        ctx.fillRect(6, 8, 1, 3);
        ctx.fillRect(2, 12, 1, 3); ctx.fillRect(10, 12, 1, 3);
    } else if (blockType === BLOCK_TYPES.RED_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        // Stem
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 8, 2, 8);
        ctx.fillRect(5, 10, 2, 2);
        // Petals
        ctx.fillStyle = '#e53935';
        ctx.fillRect(5, 3, 6, 6);
        ctx.fillStyle = '#fbc02d';
        ctx.fillRect(7, 5, 2, 2);
    } else if (blockType === BLOCK_TYPES.YELLOW_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        // Stem
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 8, 2, 8);
        ctx.fillRect(9, 11, 2, 2);
        // Petals
        ctx.fillStyle = '#fbc02d';
        ctx.fillRect(5, 3, 6, 6);
        ctx.fillStyle = '#f57c00';
        ctx.fillRect(7, 5, 2, 2);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#43a047';
        ctx.fillRect(3, 4, 2, 12);
        ctx.fillRect(7, 2, 2, 14);
        ctx.fillRect(11, 5, 2, 11);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(2, 8, 2, 8);
        ctx.fillRect(9, 7, 2, 9);
    }

    if (!isFoliageBlock(blockType) && blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && blockType !== BLOCK_TYPES.BRICK) {
        for (let i = 0; i < 60; i++) {
            const x = (i * 7) % 16;
            const y = (i * 11) % 16;
            const opacity = 0.12;
            ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (!isFoliageBlock(blockType)) {
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

// Scene setup
const scene = new THREE.Scene();
const defaultSkyColor = new THREE.Color(0x87CEEB);
scene.background = defaultSkyColor.clone();
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

// Celestial Bodies (Sun & Moon)
const celestialGroup = new THREE.Group();
scene.add(celestialGroup);

const sunGeometry = new THREE.BoxGeometry(10, 10, 10);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2a3 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, 120, 0);
celestialGroup.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(8, 8, 8);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e6ed });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
moonMesh.position.set(0, -120, 0);
celestialGroup.add(moonMesh);

// Starfield
const starCount = 400;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 250;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0
});
const starfield = new THREE.Points(starGeometry, starMaterial);
scene.add(starfield);

// Procedural Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75
});
const cloudBoxGeometry = new THREE.BoxGeometry(8, 2, 8);

for (let i = 0; i < 15; i++) {
    const cloudCluster = new THREE.Group();
    const cx = (Math.random() - 0.5) * 160;
    const cz = (Math.random() - 0.5) * 160;
    const blocksCount = 3 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blocksCount; b++) {
        const cloudPart = new THREE.Mesh(cloudBoxGeometry, cloudMaterial);
        cloudPart.position.set(
            cx + (Math.random() - 0.5) * 12,
            24 + Math.random() * 2,
            cz + (Math.random() - 0.5) * 12
        );
        cloudCluster.add(cloudPart);
    }
    cloudsGroup.add(cloudCluster);
}
scene.add(cloudsGroup);

// Foliage Billboard Geometry setup
function createFoliageGeometry() {
    const plane1 = new THREE.PlaneGeometry(0.85, 0.85);
    plane1.translate(0.5, 0.425, 0.5);

    const plane2 = new THREE.PlaneGeometry(0.85, 0.85);
    plane2.rotateY(Math.PI / 2);
    plane2.translate(0.5, 0.425, 0.5);

    const merged = new THREE.BufferGeometry();
    const pos1 = plane1.attributes.position.array;
    const pos2 = plane2.attributes.position.array;
    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);
    merged.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));

    const uv1 = plane1.attributes.uv.array;
    const uv2 = plane2.attributes.uv.array;
    const combinedUV = new Float32Array(uv1.length + uv2.length);
    combinedUV.set(uv1, 0);
    combinedUV.set(uv2, uv1.length);
    merged.setAttribute('uv', new THREE.BufferAttribute(combinedUV, 2));

    const norm1 = plane1.attributes.normal.array;
    const norm2 = plane2.attributes.normal.array;
    const combinedNorm = new Float32Array(norm1.length + norm2.length);
    combinedNorm.set(norm1, 0);
    combinedNorm.set(norm2, norm1.length);
    merged.setAttribute('normal', new THREE.BufferAttribute(combinedNorm, 3));

    return merged;
}
const foliageGeometry = createFoliageGeometry();

// Pre-cached Materials
const BLOCK_MATERIALS = {};
Object.keys(BLOCK_COLORS).forEach(typeStr => {
    const type = parseInt(typeStr);
    const isFoliage = isFoliageBlock(type);
    BLOCK_MATERIALS[type] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[type],
        transparent: type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.WATER || type === BLOCK_TYPES.LEAVES || isFoliage,
        opacity: type === BLOCK_TYPES.GLASS ? 0.6 : (type === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: (type === BLOCK_TYPES.LEAVES || isFoliage) ? 0.4 : 0,
        side: (type === BLOCK_TYPES.LEAVES || isFoliage) ? THREE.DoubleSide : THREE.FrontSide
    });
});

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
        // Audio might be blocked before user gesture
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
    } else if (action === 'click') {
        createOscillatorSound(480, 0.04, 'sine', 0.025, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(110, 0.2, 'sine', 0.06, 0.01);
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;
let isUnderwater = false;

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

    if (!isUnderwater) {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    // Orbit Sun & Moon
    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    celestialGroup.position.copy(camera.position);
    celestialGroup.rotation.z = sunAngle;

    // Starfield opacity
    if (gameTime > 12000 && gameTime < 23000) {
        const starFactor = gameTime < 14000 ? (gameTime - 12000) / 2000 : (gameTime > 21000 ? (23000 - gameTime) / 2000 : 1);
        starMaterial.opacity = Math.min(1, starFactor * 0.9);
    } else {
        starMaterial.opacity = 0;
    }
    starfield.position.copy(camera.position);

    // Drifting clouds
    cloudsGroup.children.forEach(cloud => {
        cloud.position.x += 0.02;
        if (cloud.position.x > camera.position.x + 100) {
            cloud.position.x = camera.position.x - 100;
        }
    });
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// Selection Box
const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
selectionBox.geometry.translate(0.5, 0.5, 0.5);
selectionBox.raycast = () => null;
scene.add(selectionBox);

// 3D First Person Held Block
const heldBlockGroup = new THREE.Group();
const boxGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
let heldBlockMesh = new THREE.Mesh(boxGeo, BLOCK_MATERIALS[BLOCK_TYPES.GRASS]);
heldBlockMesh.position.set(0.4, -0.35, -0.6);
heldBlockMesh.rotation.set(0.2, -0.4, 0.1);
heldBlockGroup.add(heldBlockMesh);
camera.add(heldBlockGroup);
scene.add(camera);

let swingProgress = 0;

function updateHeldBlockMesh(blockType) {
    heldBlockGroup.remove(heldBlockMesh);
    const isFoliage = isFoliageBlock(blockType);
    const geo = isFoliage ? foliageGeometry : boxGeo;
    heldBlockMesh = new THREE.Mesh(geo, BLOCK_MATERIALS[blockType]);
    if (isFoliage) {
        heldBlockMesh.scale.setScalar(0.4);
        heldBlockMesh.position.set(0.35, -0.35, -0.55);
    } else {
        heldBlockMesh.scale.setScalar(1);
        heldBlockMesh.position.set(0.4, -0.35, -0.6);
    }
    heldBlockMesh.rotation.set(0.2, -0.4, 0.1);
    heldBlockGroup.add(heldBlockMesh);
}

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
                    if (ironNoise > 0.68) {
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

            // Flowers and Tall Grass
            if (!isBeach && height > 6 && height < CHUNK_HEIGHT - 3) {
                const foliageNoise = textureNoise.noise2D(worldX * 0.8 + 100, worldZ * 0.8 + 100);
                if (foliageNoise > 0.65) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                } else if (foliageNoise < -0.75) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (foliageNoise > 0.52 && foliageNoise < 0.58) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                }
            }

            // Trees
            if (!isBeach && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8) {
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
                    const isFoliage = isFoliageBlock(blockType);
                    let isVisible = true;

                    if (!isFoliage) {
                        const neighbors = [
                            getBlockAt(chunk.x * CHUNK_SIZE + x + 1, y, chunk.z * CHUNK_SIZE + z),
                            getBlockAt(chunk.x * CHUNK_SIZE + x - 1, y, chunk.z * CHUNK_SIZE + z),
                            getBlockAt(chunk.x * CHUNK_SIZE + x, y + 1, chunk.z * CHUNK_SIZE + z),
                            getBlockAt(chunk.x * CHUNK_SIZE + x, y - 1, chunk.z * CHUNK_SIZE + z),
                            getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z + 1),
                            getBlockAt(chunk.x * CHUNK_SIZE + x, y, chunk.z * CHUNK_SIZE + z - 1),
                        ];
                        isVisible = neighbors.some(neighbor => isBlockTransparent(neighbor));
                    }

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
        const isFoliage = isFoliageBlock(blockType);
        const geo = isFoliage ? foliageGeometry : boxGeometry;
        const material = BLOCK_MATERIALS[blockType];

        const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
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
    const currentChunk = chunks.get(getChunkKey(chunkX, chunkZ));
    if (currentChunk) rebuildChunkMesh(currentChunk);

    const neighbors = [
        [chunkX + 1, chunkZ],
        [chunkX - 1, chunkZ],
        [chunkX, chunkZ + 1],
        [chunkX, chunkZ - 1]
    ];

    neighbors.forEach(([nx, nz]) => {
        const neighborChunk = chunks.get(getChunkKey(nx, nz));
        if (neighborChunk) rebuildChunkMesh(neighborChunk);
    });
}

function updateVisibleChunks() {
    const playerChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

    const activeKeys = new Set();

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = playerChunkX + x;
            const chunkZ = playerChunkZ + z;
            const key = getChunkKey(chunkX, chunkZ);
            activeKeys.add(key);

            if (!chunks.has(key)) {
                const chunk = generateTerrain(chunkX, chunkZ);
                chunks.set(key, chunk);
                createChunkMesh(chunk);
            }
        }
    }

    for (const [key, chunk] of chunks.entries()) {
        if (!activeKeys.has(key)) {
            if (chunk.mesh) {
                scene.remove(chunk.mesh);
            }
            chunks.delete(key);
        }
    }
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player state
const playerVelocity = new THREE.Vector3();
let isGrounded = false;
let selectedBlock = BLOCK_TYPES.GRASS;

const inventoryUI = document.getElementById('inventory');
const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.SAND,
    BLOCK_TYPES.GLASS,
    BLOCK_TYPES.IRON_ORE
];

function selectInventorySlot(type) {
    selectedBlock = type;
    updateHeldBlockMesh(selectedBlock);
    playSound('click');
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach((slot, index) => {
        if (inventoryBlocks[index] === selectedBlock) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    });
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    if (type === selectedBlock) slot.classList.add('selected');

    const slotCanvas = BLOCK_CANVASES[type];
    if (slotCanvas) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 16;
        previewCanvas.height = 16;
        const pctx = previewCanvas.getContext('2d');
        pctx.drawImage(slotCanvas, 0, 0);
        slot.appendChild(previewCanvas);
    }

    slot.onclick = () => selectInventorySlot(type);
    inventoryUI.appendChild(slot);
});

// Digit Key & Scroll Wheel Hotbar selection
document.addEventListener('keydown', (e) => {
    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= inventoryBlocks.length) {
            selectInventorySlot(inventoryBlocks[digit - 1]);
        }
    }
});

document.addEventListener('wheel', (e) => {
    const currentIndex = inventoryBlocks.indexOf(selectedBlock);
    let nextIndex = currentIndex;
    if (e.deltaY > 0) {
        nextIndex = (currentIndex + 1) % inventoryBlocks.length;
    } else if (e.deltaY < 0) {
        nextIndex = (currentIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length;
    }
    selectInventorySlot(inventoryBlocks[nextIndex]);
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
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

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
                swingProgress = 1.0;
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
            swingProgress = 1.0;
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

let bobTimer = 0;

function handleMovement() {
    const isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']);
    const isCrouching = (keys['ControlLeft'] || keys['ControlRight']);

    const targetHeight = isCrouching ? 1.4 : 1.8;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;
    PLAYER_HEIGHT = currentPlayerHeight;

    const targetFOV = isSprinting ? 85 : 75;
    camera.fov += (targetFOV - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    let speedMultiplier = 1.0;
    if (isSprinting) speedMultiplier = 1.5;
    if (isCrouching) speedMultiplier = 0.5;
    if (isUnderwater) speedMultiplier *= 0.6;

    const currentSpeed = BASE_MOVE_SPEED * speedMultiplier;

    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    direction
        .normalize()
        .multiplyScalar(currentSpeed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    if (keys['Space']) {
        if (isUnderwater) {
            playerVelocity.y = 0.08;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }

    // View bobbing calculation
    const moving = (playerVelocity.x !== 0 || playerVelocity.z !== 0) && isGrounded;
    if (moving) {
        bobTimer += isSprinting ? 0.25 : 0.15;
        const bobY = Math.sin(bobTimer) * 0.04;
        const bobX = Math.cos(bobTimer * 0.5) * 0.02;
        heldBlockGroup.position.set(bobX, bobY, 0);
    } else {
        heldBlockGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    }

    // Swing animation calculation
    if (swingProgress > 0) {
        swingProgress -= 0.1;
        const swingAngle = Math.sin(swingProgress * Math.PI) * 0.4;
        heldBlockMesh.rotation.x = 0.2 - swingAngle;
        heldBlockMesh.rotation.y = -0.4 - swingAngle * 0.5;
    } else {
        heldBlockMesh.rotation.set(0.2, -0.4, 0.1);
    }
}

function updatePhysics() {
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const wasUnderwater = isUnderwater;
    isUnderwater = headBlock === BLOCK_TYPES.WATER;

    const underwaterOverlay = document.getElementById('underwater-overlay');

    if (isUnderwater) {
        if (!wasUnderwater) playSound('splash');
        underwaterOverlay.style.display = 'block';
        scene.fog.color.setHex(0x1a535c);
        scene.fog.near = 0.5;
        scene.fog.far = 12;
        scene.background.setHex(0x1a535c);
        playerVelocity.y += GRAVITY * 0.3; // Floating gravity underwater
    } else {
        if (wasUnderwater) playSound('splash');
        underwaterOverlay.style.display = 'none';
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Vertical collisions (check solid blocks only)
    const feetY = nextPos.y - PLAYER_HEIGHT;
    const feetBlock = getBlockAt(nextPos.x, feetY, nextPos.z);
    if (isBlockSolid(feetBlock)) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(feetY) + PLAYER_HEIGHT;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions (check solid blocks only)
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - PLAYER_HEIGHT + 0.1;

    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(checkX, playerY, camera.position.z);
        const b2 = getBlockAt(checkX, playerY + 1, camera.position.z);
        if (isBlockSolid(b1) || isBlockSolid(b2)) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(camera.position.x, playerY, checkZ);
        const b2 = getBlockAt(camera.position.x, playerY + 1, checkZ);
        if (isBlockSolid(b1) || isBlockSolid(b2)) {
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

// Game loop
function animate() {
    requestAnimationFrame(animate);
    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    renderer.render(scene, camera);
}

animate();

console.log('Minecraft clone initialized successfully');
