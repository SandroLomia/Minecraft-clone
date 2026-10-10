import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const BASE_PLAYER_HEIGHT = 1.8;
const CROUCH_PLAYER_HEIGHT = 1.4;
let currentPlayerHeight = BASE_PLAYER_HEIGHT;

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
    SNOW: 11,
    OAK_PLANKS: 12,
    BRICK: 13,
    GLOWSTONE: 14,
    IRON_ORE: 15,
    TALL_GRASS: 16,
    RED_FLOWER: 17
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
    [BLOCK_TYPES.SNOW]: 0xf0f4f8,
    [BLOCK_TYPES.OAK_PLANKS]: 0xc8965d,
    [BLOCK_TYPES.BRICK]: 0x9e4332,
    [BLOCK_TYPES.GLOWSTONE]: 0xfbc02d,
    [BLOCK_TYPES.IRON_ORE]: 0xd7ccc8,
    [BLOCK_TYPES.TALL_GRASS]: 0x388e3c,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, 16, 16);
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, 15, 15);
        ctx.beginPath();
        ctx.moveTo(3, 13);
        ctx.lineTo(13, 3);
        ctx.stroke();
    } else if (blockType === BLOCK_TYPES.WATER) {
        ctx.fillStyle = 'rgba(33, 150, 243, 0.7)';
        ctx.fillRect(0, 0, 16, 16);
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
            ctx.fillRect(0, y, 16, 1);
        }
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
        const spots = [[3, 3], [4, 4], [10, 5], [11, 6], [6, 11], [7, 12]];
        spots.forEach(([sx, sy]) => {
            ctx.fillStyle = '#222222';
            ctx.fillRect(sx, sy, 2, 2);
        });
    } else if (blockType === BLOCK_TYPES.COBBLESTONE) {
        for (let y = 0; y < 16; y += 4) {
            for (let x = 0; x < 16; x += 4) {
                ctx.fillStyle = adjustHexColor(color, (x + y) % 8 === 0 ? 14 : -12);
                ctx.fillRect(x, y, 4, 4);
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.strokeRect(x, y, 4, 4);
            }
        }
    } else if (blockType === BLOCK_TYPES.SNOW) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 1.1 + 80, y * 1.1 + 90);
                paintPixel(x, y, -5 + noise * 10);
            }
        }
    } else if (blockType === BLOCK_TYPES.OAK_PLANKS) {
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = adjustHexColor(color, y % 8 === 0 ? 10 : -8);
            ctx.fillRect(0, y, 16, 3);
            ctx.fillStyle = '#4a2c11';
            ctx.fillRect(0, y + 3, 16, 1);
        }
    } else if (blockType === BLOCK_TYPES.BRICK) {
        ctx.fillStyle = adjustHexColor(color, 0);
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#d7ccc8'; // Mortar lines
        ctx.fillRect(0, 3, 16, 1);
        ctx.fillRect(0, 7, 16, 1);
        ctx.fillRect(0, 11, 16, 1);
        ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(7, 0, 1, 4);
        ctx.fillRect(15, 4, 1, 4);
        ctx.fillRect(7, 8, 1, 4);
        ctx.fillRect(15, 12, 1, 4);
    } else if (blockType === BLOCK_TYPES.GLOWSTONE) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 1.8 + 120, y * 1.8 + 130);
                const shade = 20 + noise * 30;
                paintPixel(x, y, shade);
            }
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        const spots = [[2, 4], [3, 5], [11, 3], [12, 4], [5, 10], [6, 11]];
        spots.forEach(([sx, sy]) => {
            ctx.fillStyle = '#d7ccc8';
            ctx.fillRect(sx, sy, 2, 2);
        });
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#2e7d32';
        for (let x = 2; x < 14; x += 2) {
            const height = 8 + Math.floor(Math.sin(x) * 4);
            ctx.fillRect(x, 16 - height, 1, height);
        }
    } else if (blockType === BLOCK_TYPES.RED_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 8, 2, 8); // Stem
        ctx.fillStyle = '#e53935'; // Red Petals
        ctx.fillRect(5, 4, 6, 5);
        ctx.fillStyle = '#fbc02d'; // Yellow Center
        ctx.fillRect(7, 6, 2, 2);
    }

    if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS &&
        blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES &&
        blockType !== BLOCK_TYPES.GLASS && blockType !== BLOCK_TYPES.TALL_GRASS &&
        blockType !== BLOCK_TYPES.RED_FLOWER) {
        for (let i = 0; i < 60; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const opacity = Math.random() * 0.18;
            ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (blockType !== BLOCK_TYPES.TALL_GRASS && blockType !== BLOCK_TYPES.RED_FLOWER) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
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
scene.background = new THREE.Color(0x87CEEB); // Sky blue
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
        createOscillatorSound(160, 0.15, 'sine', 0.06, 0.005);
        createOscillatorSound(220, 0.12, 'triangle', 0.04, 0.005);
    } else if (action === 'click') {
        createOscillatorSound(520, 0.04, 'sine', 0.03, 0.001);
    }
}

// Celestial bodies & Dynamic Environment
const DAY_DURATION = 24000;
let gameTime = 6000;

// Sun & Moon Meshes
const sunGeometry = new THREE.BoxGeometry(8, 8, 8);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(6, 6, 6);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Twinkling Starfield
const starCount = 300;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 180;
    starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = radius * Math.cos(phi);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
const starfield = new THREE.Points(starGeometry, starMaterial);
scene.add(starfield);

// Clouds
const cloudGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const cloudGeo = new THREE.BoxGeometry(12, 2, 12);
for (let i = 0; i < 15; i++) {
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMaterial);
    cloudMesh.position.set(
        (Math.random() - 0.5) * 160,
        22 + Math.random() * 2,
        (Math.random() - 0.5) * 160
    );
    cloudGroup.add(cloudMesh);
}
scene.add(cloudGroup);

let isUnderwater = false;
const underwaterOverlay = document.getElementById('underwater-overlay');

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
        starOpacity = t;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.15;
        starOpacity = 1;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.15 + t * 0.25;
        starOpacity = 1 - t;
    }

    starMaterial.opacity = starOpacity;
    starfield.position.copy(camera.position);

    // Orbiting Sun & Moon
    const celestialAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const distance = 140;

    sunMesh.position.set(
        camera.position.x + Math.cos(celestialAngle) * distance,
        camera.position.y + Math.sin(celestialAngle) * distance,
        camera.position.z + 40
    );

    moonMesh.position.set(
        camera.position.x + Math.cos(celestialAngle + Math.PI) * distance,
        camera.position.y + Math.sin(celestialAngle + Math.PI) * distance,
        camera.position.z - 40
    );

    directionalLight.position.copy(sunMesh.position);

    // Clouds drifting
    cloudGroup.children.forEach(cloud => {
        cloud.position.x += 0.02;
        if (cloud.position.x - camera.position.x > 100) cloud.position.x -= 200;
    });

    if (isUnderwater) {
        const waterColor = new THREE.Color(0x0a50a0);
        scene.background.copy(waterColor);
        scene.fog.color.copy(waterColor);
        scene.fog.near = 0.5;
        scene.fog.far = 15;
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
        directionalLight.intensity = lightIntensity;
        ambientLight.intensity = lightIntensity * 0.6 + 0.1;
    }
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// 3D First-Person Held Block
const heldBlockGroup = new THREE.Group();
const HELD_BLOCK_MATERIALS = {};

function getHeldBlockMaterial(blockType) {
    if (!HELD_BLOCK_MATERIALS[blockType]) {
        HELD_BLOCK_MATERIALS[blockType] = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: blockType === BLOCK_TYPES.LEAVES ? 0.5 : 0,
            side: blockType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
        });
    }
    return HELD_BLOCK_MATERIALS[blockType];
}

const heldBlockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), getHeldBlockMaterial(BLOCK_TYPES.GRASS));
heldBlockGroup.add(heldBlockMesh);
scene.add(heldBlockGroup);

let swingTimer = 0;

function updateHeldBlock(selectedBlockType) {
    heldBlockMesh.material = getHeldBlockMaterial(selectedBlockType);
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
            const isSnowPeak = height >= 11;

            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                if (y < height - 4) {
                    const oreNoise = simplex.noise2D(worldX * 0.2, (y + worldZ) * 0.2);
                    if (oreNoise > 0.65) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.COAL_ORE);
                    } else if (oreNoise < -0.65 && y < 6) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.IRON_ORE);
                    } else {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.STONE);
                    }
                } else if (y < height - 1) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.DIRT);
                } else if (y === height - 1) {
                    if (isSnowPeak) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.SNOW);
                    } else if (isBeach) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.SAND);
                    } else {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GRASS);
                    }
                } else if (y <= 5) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
                } else {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
                }
            }

            // Trees and Flowers
            if (!isBeach && !isSnowPeak && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
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
                } else if (treeNoise < -0.6) {
                    chunk.setBlock(x, height, z, Math.random() > 0.5 ? BLOCK_TYPES.RED_FLOWER : BLOCK_TYPES.TALL_GRASS);
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
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS ||
           type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER ||
           type === BLOCK_TYPES.TALL_GRASS || type === BLOCK_TYPES.RED_FLOWER;
}

function createChunkMesh(chunk) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0.5, 0.5, 0.5);
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
        const material = getHeldBlockMaterial(blockType);
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
        [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    offsets.forEach(([dx, dz]) => {
        const chunk = chunks.get(getChunkKey(chunkX + dx, chunkZ + dz));
        if (chunk) rebuildChunkMesh(chunk);
    });
}

function updateVisibleChunks(force = false) {
    const playerChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

    let chunksChanged = false;
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            if (ensureChunk(playerChunkX + x, playerChunkZ + z)) {
                chunksChanged = true;
            }
        }
    }

    if (chunksChanged || force) {
        chunks.forEach(chunk => {
            if (!chunk.mesh) createChunkMesh(chunk);
        });
    }
}

// Player state & Inventory
const HOTBAR_BLOCKS = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.OAK_PLANKS,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.GLOWSTONE,
    BLOCK_TYPES.GLASS,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.SNOW
];

let activeSlotIndex = 0;
let selectedBlock = HOTBAR_BLOCKS[activeSlotIndex];
let isGrounded = false;
let isSprinting = false;
let isCrouching = false;
const playerVelocity = new THREE.Vector3();

const inventoryContainer = document.getElementById('inventory');
function setupInventory() {
    inventoryContainer.innerHTML = '';
    HOTBAR_BLOCKS.forEach((blockType, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot' + (index === activeSlotIndex ? ' selected' : '');

        const canvas = BLOCK_CANVASES[blockType];
        if (canvas) {
            slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
        }

        const badge = document.createElement('span');
        badge.className = 'slot-number';
        badge.textContent = index + 1;
        slot.appendChild(badge);

        slot.addEventListener('click', () => {
            selectInventorySlot(index);
        });

        inventoryContainer.appendChild(slot);
    });
}

function selectInventorySlot(index) {
    if (index < 0 || index >= HOTBAR_BLOCKS.length) return;
    activeSlotIndex = index;
    selectedBlock = HOTBAR_BLOCKS[activeSlotIndex];

    const slots = inventoryContainer.querySelectorAll('.inventory-slot');
    slots.forEach((slot, idx) => {
        slot.classList.toggle('selected', idx === activeSlotIndex);
    });

    updateHeldBlock(selectedBlock);
    playSound('click');
}

setupInventory();

// Controls & Interaction
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
    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= 9) {
            selectInventorySlot(digit - 1);
        }
    }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
        selectInventorySlot((activeSlotIndex + 1) % HOTBAR_BLOCKS.length);
    } else if (e.deltaY < 0) {
        selectInventorySlot((activeSlotIndex - 1 + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length);
    }
}, { passive: true });

// Mobile touch state
let joystickVector = new THREE.Vector2();
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
let isTouchingJoystick = false;

if (joystickBase) {
    joystickBase.addEventListener('touchstart', () => isTouchingJoystick = true);
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
    if (e.touches.length > 0) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
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
        if (isGrounded || isUnderwater) {
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
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    swingTimer = 1.0; // Trigger arm swing animation

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
                createParticles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), BLOCK_COLORS[blockType] || 0x808080);
                updateBlock(x, y, z, BLOCK_TYPES.AIR);
                playSound('break');
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            const playerPos = camera.position.clone();
            if (Math.floor(playerPos.x) === x && Math.floor(playerPos.z) === z &&
                (Math.floor(playerPos.y) === y || Math.floor(playerPos.y - 1) === y)) {
                return;
            }
            updateBlock(x, y, z, selectedBlock);
            playSound('place');
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
let footstepTimer = 0;

function handleMovement() {
    isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    isCrouching = keys['ControlLeft'] || keys['ControlRight'];

    const targetHeight = isCrouching ? CROUCH_PLAYER_HEIGHT : BASE_PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    let speed = BASE_MOVE_SPEED;
    if (isSprinting && !isCrouching) speed *= 1.5;
    if (isCrouching) speed *= 0.5;

    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    const isMoving = direction.lengthSq() > 0.001;

    direction
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    if (isMoving && isGrounded) {
        bobTimer += isSprinting ? 0.25 : 0.18;
        footstepTimer += isSprinting ? 0.25 : 0.18;
        if (footstepTimer > Math.PI) {
            playSound('footstep');
            footstepTimer = 0;
        }
    } else {
        bobTimer = 0;
        footstepTimer = 0;
    }

    if (keys['Space']) {
        if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        } else if (isUnderwater) {
            playerVelocity.y = 0.08;
        }
    }
}

function updatePhysics() {
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const wasUnderwater = isUnderwater;
    isUnderwater = headBlock === BLOCK_TYPES.WATER;

    if (isUnderwater !== wasUnderwater) {
        playSound('splash');
        if (underwaterOverlay) {
            underwaterOverlay.style.display = isUnderwater ? 'block' : 'none';
        }
    }

    if (isUnderwater) {
        playerVelocity.y += GRAVITY * 0.2;
        playerVelocity.x *= 0.85;
        playerVelocity.z *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    if (getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z) !== BLOCK_TYPES.AIR) {
        if (playerVelocity.y < 0) {
            playerVelocity.y = 0;
            isGrounded = true;
            nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
        }
    } else {
        isGrounded = false;
    }

    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (getBlockAt(checkX, playerY, camera.position.z) !== BLOCK_TYPES.AIR ||
            getBlockAt(checkX, playerY + 1, camera.position.z) !== BLOCK_TYPES.AIR) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

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

function animate() {
    requestAnimationFrame(animate);

    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();

    // Held block positioning and animation
    if (swingTimer > 0) swingTimer = Math.max(0, swingTimer - 0.1);

    const bobX = Math.sin(bobTimer) * 0.03;
    const bobY = Math.abs(Math.cos(bobTimer)) * 0.03;

    const swingAngle = Math.sin(swingTimer * Math.PI) * 0.6;

    heldBlockGroup.position.copy(camera.position);
    heldBlockGroup.quaternion.copy(camera.quaternion);
    heldBlockGroup.translateX(0.35 + bobX);
    heldBlockGroup.translateY(-0.35 - bobY - swingAngle * 0.2);
    heldBlockGroup.translateZ(-0.55 + swingAngle * 0.1);
    heldBlockGroup.rotateX(-swingAngle);
    heldBlockGroup.rotateY(swingAngle * 0.5);

    renderer.render(scene, camera);
}

// Initial chunk setup
updateVisibleChunks(true);

animate();

console.log('Minecraft Clone initialized with enhanced features');
