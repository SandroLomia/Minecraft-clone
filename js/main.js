import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const DEFAULT_PLAYER_HEIGHT = 1.8;
const CROUCH_PLAYER_HEIGHT = 1.4;
let currentPlayerHeight = DEFAULT_PLAYER_HEIGHT;

const PLAYER_RADIUS = 0.4;
const GRAVITY = -0.015;
const WATER_GRAVITY = -0.003;
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
    BRICK: 11,
    GLOWSTONE: 12,
    SNOW: 13,
    RED_FLOWER: 14,
    YELLOW_FLOWER: 15,
    TALL_GRASS: 16
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
    [BLOCK_TYPES.BRICK]: 0x90382b,
    [BLOCK_TYPES.GLOWSTONE]: 0xfdd835,
    [BLOCK_TYPES.SNOW]: 0xf0f4f8,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfbc02d,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047
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

    if (blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER || blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        if (blockType === BLOCK_TYPES.TALL_GRASS) {
            ctx.fillStyle = '#43a047';
            ctx.fillRect(3, 4, 2, 12);
            ctx.fillRect(7, 2, 2, 14);
            ctx.fillRect(11, 5, 2, 11);
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(4, 6, 1, 10);
            ctx.fillRect(8, 4, 1, 12);
            ctx.fillRect(12, 7, 1, 9);
        } else {
            // Stem
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(7, 7, 2, 9);
            ctx.fillRect(5, 10, 2, 2);
            ctx.fillRect(9, 11, 2, 2);
            // Petals
            const petalColor = blockType === BLOCK_TYPES.RED_FLOWER ? '#e53935' : '#fbc02d';
            const centerColor = blockType === BLOCK_TYPES.RED_FLOWER ? '#fbc02d' : '#e65100';
            ctx.fillStyle = petalColor;
            ctx.fillRect(5, 3, 6, 6);
            ctx.fillRect(7, 1, 2, 10);
            ctx.fillRect(3, 5, 10, 2);
            ctx.fillStyle = centerColor;
            ctx.fillRect(7, 5, 2, 2);
        }
    } else {
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
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(2, 2, 12, 12);
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.9)';
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
                ctx.fillStyle = '#1a1a1a';
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
        } else if (blockType === BLOCK_TYPES.BRICK) {
            ctx.fillStyle = '#90382b';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#d2c4b0'; // Mortar
            ctx.fillRect(0, 3, 16, 1);
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(0, 11, 16, 1);
            ctx.fillRect(0, 15, 16, 1);
            ctx.fillRect(7, 0, 1, 3);
            ctx.fillRect(15, 0, 1, 3);
            ctx.fillRect(3, 4, 1, 3);
            ctx.fillRect(11, 4, 1, 3);
            ctx.fillRect(7, 8, 1, 3);
            ctx.fillRect(15, 8, 1, 3);
            ctx.fillRect(3, 12, 1, 3);
            ctx.fillRect(11, 12, 1, 3);
        } else if (blockType === BLOCK_TYPES.GLOWSTONE) {
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const noise = textureNoise.noise2D(x * 1.8 + 80, y * 1.8 + 90);
                    const shade = noise > 0.2 ? 35 : (noise < -0.2 ? -25 : 0);
                    paintPixel(x, y, shade);
                }
            }
        } else if (blockType === BLOCK_TYPES.SNOW) {
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const noise = textureNoise.noise2D(x * 1.2 + 10, y * 1.2 + 20);
                    paintPixel(x, y, -5 + noise * 10);
                }
            }
        }

        if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && blockType !== BLOCK_TYPES.BRICK && blockType !== BLOCK_TYPES.SNOW) {
            for (let i = 0; i < 60; i++) {
                const x = Math.floor(Math.random() * 16);
                const y = Math.floor(Math.random() * 16);
                const opacity = Math.random() * 0.2;
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

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
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT + 2, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// Underwater Overlay Element
const underwaterOverlay = document.getElementById('underwater-overlay');

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
    } else if (action === 'place') {
        createOscillatorSound(280, 0.07, 'sine', 0.035, 0.002);
        createOscillatorSound(420, 0.06, 'triangle', 0.022, 0.002);
    } else if (action === 'jump') {
        createOscillatorSound(210, 0.12, 'triangle', 0.045, 0.003);
        createOscillatorSound(300, 0.08, 'sine', 0.022, 0.002);
    } else if (action === 'click') {
        createOscillatorSound(600, 0.04, 'sine', 0.03, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(150, 0.15, 'triangle', 0.06, 0.005);
    } else if (action === 'footstep') {
        createOscillatorSound(80, 0.04, 'triangle', 0.015, 0.001);
    }
}

// Celestial Objects (Sun & Moon)
const sunMesh = new THREE.Mesh(
    new THREE.BoxGeometry(12, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfffaed })
);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
scene.add(moonMesh);

// Starfield
const starCount = 500;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 180 + Math.random() * 20;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.8,
    transparent: true,
    opacity: 0
});
const starfield = new THREE.Points(starGeometry, starMaterial);
scene.add(starfield);

// Clouds System
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75
});
const cloudBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

function spawnClouds() {
    for (let i = 0; i < 20; i++) {
        const cluster = new THREE.Group();
        const cx = (Math.random() - 0.5) * 160;
        const cz = (Math.random() - 0.5) * 160;
        const cy = 22 + (Math.random() - 0.5) * 2;

        const blocksCount = 6 + Math.floor(Math.random() * 8);
        for (let b = 0; b < blocksCount; b++) {
            const cloudBlock = new THREE.Mesh(cloudBoxGeometry, cloudMaterial);
            cloudBlock.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 8
            );
            cloudBlock.scale.set(4 + Math.random() * 4, 1.5 + Math.random(), 4 + Math.random() * 4);
            cluster.add(cloudBlock);
        }
        cluster.position.set(cx, cy, cz);
        cloudsGroup.add(cluster);
    }
    scene.add(cloudsGroup);
}
spawnClouds();

function updateClouds() {
    cloudsGroup.children.forEach(cluster => {
        cluster.position.x += 0.02;
        if (cluster.position.x - camera.position.x > 100) {
            cluster.position.x = camera.position.x - 100;
        }
    });
}

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
        starOpacity = (1 - t) * 0.8;
    } else if (gameTime < 10000) { // Day
        skyColor = new THREE.Color(0x87CEEB);
        lightIntensity = 0.8;
        starOpacity = 0;
    } else if (gameTime < 12000) { // Sunset
        const t = (gameTime - 10000) / 2000;
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0xff7043), t);
        lightIntensity = 0.8 - t * 0.4;
        starOpacity = t * 0.5;
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
        starOpacity = 0.5 + t * 0.4;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.1;
        starOpacity = 0.9;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.1 + t * 0.3;
        starOpacity = 0.9 * (1 - t);
    }

    // Check underwater state
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const headInWater = headBlock === BLOCK_TYPES.WATER;

    if (headInWater !== isUnderwater) {
        isUnderwater = headInWater;
        if (isUnderwater) playSound('splash');
    }

    if (isUnderwater) {
        const waterFogColor = new THREE.Color(0x0f4c81);
        scene.background.copy(waterFogColor);
        scene.fog.color.copy(waterFogColor);
        scene.fog.near = 1;
        scene.fog.far = 18;
        underwaterOverlay.style.display = 'block';
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
        underwaterOverlay.style.display = 'none';
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const orbitRadius = 140;

    sunMesh.position.set(
        camera.position.x + Math.cos(sunAngle) * orbitRadius,
        camera.position.y + Math.sin(sunAngle) * orbitRadius,
        camera.position.z + 40
    );
    sunMesh.lookAt(camera.position);

    moonMesh.position.set(
        camera.position.x - Math.cos(sunAngle) * orbitRadius,
        camera.position.y - Math.sin(sunAngle) * orbitRadius,
        camera.position.z - 40
    );
    moonMesh.lookAt(camera.position);

    directionalLight.position.copy(sunMesh.position);
    starfield.position.copy(camera.position);
    starMaterial.opacity = starOpacity;

    updateClouds();
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

// Selection Box
const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
selectionBox.geometry.translate(0.5, 0.5, 0.5);
selectionBox.raycast = () => null; // Don't let the selection box block raycasts
scene.add(selectionBox);

// Particles
const particles = [];

function createParticles(pos, color) {
    const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < 8; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
            pos.x + (Math.random() - 0.5) * 0.5,
            pos.y + (Math.random() - 0.5) * 0.5,
            pos.z + (Math.random() - 0.5) * 0.5
        );

        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            Math.random() * 0.15,
            (Math.random() - 0.5) * 0.15
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
        p.life -= 0.03;
        p.scale.setScalar(Math.max(0.01, p.life));

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
            const isSnowyPeak = height >= 10;

            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                if (y < height - 4) {
                    const coalNoise = simplex.noise2D(worldX * 0.2, (y + worldZ) * 0.2);
                    chunk.setBlock(x, y, z, coalNoise > 0.6 ? BLOCK_TYPES.COAL_ORE : BLOCK_TYPES.STONE);
                } else if (y < height - 1) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.DIRT);
                } else if (y === height - 1) {
                    if (isSnowyPeak) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.SNOW);
                    } else {
                        chunk.setBlock(x, y, z, isBeach ? BLOCK_TYPES.SAND : BLOCK_TYPES.GRASS);
                    }
                } else if (y <= 5) {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
                } else {
                    chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
                }
            }

            // Foliage & Flowers on Grass terrain
            if (!isBeach && !isSnowyPeak && height > 6 && height < CHUNK_HEIGHT - 1) {
                const plantVal = textureNoise.noise2D(worldX * 0.8 + 100, worldZ * 0.8 + 100);
                if (plantVal > 0.78) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (plantVal > 0.68) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                } else if (plantVal > 0.48) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                }
            }

            // Trees
            if (!isBeach && !isSnowyPeak && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
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

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR ||
           type === BLOCK_TYPES.GLASS ||
           type === BLOCK_TYPES.LEAVES ||
           type === BLOCK_TYPES.WATER ||
           type === BLOCK_TYPES.RED_FLOWER ||
           type === BLOCK_TYPES.YELLOW_FLOWER ||
           type === BLOCK_TYPES.TALL_GRASS;
}

function isNonSolid(type) {
    return type === BLOCK_TYPES.AIR ||
           type === BLOCK_TYPES.WATER ||
           type === BLOCK_TYPES.RED_FLOWER ||
           type === BLOCK_TYPES.YELLOW_FLOWER ||
           type === BLOCK_TYPES.TALL_GRASS;
}

let foliageGeometryCache = null;
function getFoliageGeometry() {
    if (foliageGeometryCache) return foliageGeometryCache;

    const p1 = new THREE.PlaneGeometry(0.8, 0.8);
    p1.rotateY(Math.PI / 4);
    const p2 = new THREE.PlaneGeometry(0.8, 0.8);
    p2.rotateY(-Math.PI / 4);

    const p1NonIndexed = p1.toNonIndexed();
    const p2NonIndexed = p2.toNonIndexed();

    const combined = new THREE.BufferGeometry();
    const pos1 = p1NonIndexed.attributes.position.array;
    const pos2 = p2NonIndexed.attributes.position.array;
    const posCombined = new Float32Array(pos1.length + pos2.length);
    posCombined.set(pos1);
    posCombined.set(pos2, pos1.length);
    combined.setAttribute('position', new THREE.BufferAttribute(posCombined, 3));

    const uv1 = p1NonIndexed.attributes.uv.array;
    const uv2 = p2NonIndexed.attributes.uv.array;
    const uvCombined = new Float32Array(uv1.length + uv2.length);
    uvCombined.set(uv1);
    uvCombined.set(uv2, uv1.length);
    combined.setAttribute('uv', new THREE.BufferAttribute(uvCombined, 2));

    combined.translate(0.5, 0.4, 0.5);
    foliageGeometryCache = combined;
    return foliageGeometryCache;
}

const standardBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
standardBoxGeometry.translate(0.5, 0.5, 0.5);

function createChunkMesh(chunk) {
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
        const isFoliage = blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER || blockType === BLOCK_TYPES.TALL_GRASS;
        const geom = isFoliage ? getFoliageGeometry() : standardBoxGeometry;

        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || isFoliage,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || isFoliage) ? 0.4 : 0,
            side: (blockType === BLOCK_TYPES.LEAVES || isFoliage) ? THREE.DoubleSide : THREE.FrontSide
        });

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
let selectedSlotIndex = 0;

const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.GLOWSTONE,
    BLOCK_TYPES.SNOW,
    BLOCK_TYPES.RED_FLOWER
];

let selectedBlock = inventoryBlocks[0];

// 3D First Person Held Item Model Attached to Camera
const HELD_BLOCK_MATERIALS = {};
Object.entries(BLOCK_TEXTURES).forEach(([typeStr, tex]) => {
    const type = Number(typeStr);
    const isFoliage = type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
    HELD_BLOCK_MATERIALS[type] = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.WATER || type === BLOCK_TYPES.LEAVES || isFoliage,
        opacity: type === BLOCK_TYPES.GLASS ? 0.7 : (type === BLOCK_TYPES.WATER ? 0.7 : 1),
        alphaTest: (type === BLOCK_TYPES.LEAVES || isFoliage) ? 0.4 : 0,
        side: (type === BLOCK_TYPES.LEAVES || isFoliage) ? THREE.DoubleSide : THREE.FrontSide
    });
});

const heldItemGroup = new THREE.Group();
let heldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), HELD_BLOCK_MATERIALS[selectedBlock]);
heldItemGroup.add(heldMesh);
heldItemGroup.position.set(0.35, -0.28, -0.55);
camera.add(heldItemGroup);
scene.add(camera);

function updateHeldItem() {
    heldItemGroup.remove(heldMesh);
    const isFoliage = selectedBlock === BLOCK_TYPES.RED_FLOWER || selectedBlock === BLOCK_TYPES.YELLOW_FLOWER || selectedBlock === BLOCK_TYPES.TALL_GRASS;
    const geom = isFoliage ? getFoliageGeometry().clone() : new THREE.BoxGeometry(0.25, 0.25, 0.25);
    if (isFoliage) geom.scale(0.35, 0.35, 0.35);

    heldMesh = new THREE.Mesh(geom, HELD_BLOCK_MATERIALS[selectedBlock]);
    heldItemGroup.add(heldMesh);
}

// Hotbar Inventory UI
const inventoryUI = document.getElementById('inventory');

function renderInventorySlots() {
    inventoryUI.innerHTML = '';
    inventoryBlocks.forEach((type, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        if (BLOCK_CANVASES[type]) {
            slot.style.backgroundImage = `url(${BLOCK_CANVASES[type].toDataURL()})`;
        }

        const numLabel = document.createElement('span');
        numLabel.className = 'slot-number';
        numLabel.textContent = (index + 1).toString();
        slot.appendChild(numLabel);

        if (index === selectedSlotIndex) slot.classList.add('selected');

        slot.onclick = () => {
            selectInventorySlot(index);
        };

        inventoryUI.appendChild(slot);
    });
}

function selectInventorySlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedSlotIndex = index;
    selectedBlock = inventoryBlocks[index];
    renderInventorySlots();
    updateHeldItem();
    playSound('click');
}

renderInventorySlots();

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

// Scroll wheel hotbar selection
window.addEventListener('wheel', (e) => {
    if (!controls.isLocked) return;
    if (e.deltaY > 0) {
        selectInventorySlot((selectedSlotIndex + 1) % inventoryBlocks.length);
    } else if (e.deltaY < 0) {
        selectInventorySlot((selectedSlotIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length);
    }
});

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
    if (isUnderwater) {
        playerVelocity.y = 0.08;
    } else if (isGrounded) {
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

let swingProgress = 0;

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

            // Prevent placing block inside player volume
            const playerPos = camera.position.clone();
            const playerMinY = playerPos.y - currentPlayerHeight;
            const playerMaxY = playerPos.y;

            if (Math.floor(playerPos.x) === x && Math.floor(playerPos.z) === z &&
                y >= Math.floor(playerMinY) && y <= Math.floor(playerMaxY)) {
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
let bobOffset = new THREE.Vector2();

function handleMovement() {
    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    // Sprinting & Crouching
    const isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && !keys['ControlLeft'] && !keys['ControlRight'];
    const isCrouching = keys['ControlLeft'] || keys['ControlRight'];

    let speed = BASE_MOVE_SPEED;
    if (isSprinting) speed *= 1.5;
    if (isCrouching) speed *= 0.5;
    if (isUnderwater) speed *= 0.6;

    // Smooth height transition
    const targetHeight = isCrouching ? CROUCH_PLAYER_HEIGHT : DEFAULT_PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    // Smooth FOV transition
    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    const isMoving = direction.lengthSq() > 0;

    direction
        .normalize()
        .multiplyScalar(speed)
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

    // View bobbing logic
    if (isMoving && (isGrounded || isUnderwater)) {
        bobTimer += 0.12 * (isSprinting ? 1.4 : 1.0);
        const targetBobX = Math.cos(bobTimer * 0.5) * 0.025;
        const targetBobY = Math.abs(Math.sin(bobTimer)) * 0.025;
        bobOffset.x += (targetBobX - bobOffset.x) * 0.2;
        bobOffset.y += (targetBobY - bobOffset.y) * 0.2;

        if (Math.floor(bobTimer) % 12 === 0 && isGrounded) {
            playSound('footstep');
        }
    } else {
        bobTimer = 0;
        bobOffset.x *= 0.8;
        bobOffset.y *= 0.8;
    }
}

function updatePhysics() {
    const activeGravity = isUnderwater ? WATER_GRAVITY : GRAVITY;
    playerVelocity.y += activeGravity;

    const nextPos = camera.position.clone().add(playerVelocity);

    // Simple vertical collision detection
    const footBlock = getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z);
    if (!isNonSolid(footBlock)) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(checkX, playerY, camera.position.z);
        const b2 = getBlockAt(checkX, playerY + 1, camera.position.z);
        if (!isNonSolid(b1) || !isNonSolid(b2)) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(camera.position.x, playerY, checkZ);
        const b2 = getBlockAt(camera.position.x, playerY + 1, checkZ);
        if (!isNonSolid(b1) || !isNonSolid(b2)) {
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

function updateHeldItemAnimation() {
    if (!heldItemGroup) return;

    let basePosX = 0.35 + bobOffset.x;
    let basePosY = -0.28 + bobOffset.y;
    let basePosZ = -0.55;

    if (swingProgress > 0) {
        swingProgress -= 0.1;
        const swingFactor = Math.sin(swingProgress * Math.PI);
        heldItemGroup.rotation.x = -swingFactor * 0.6;
        heldItemGroup.rotation.y = swingFactor * 0.4;
        basePosX -= swingFactor * 0.1;
        basePosY += swingFactor * 0.05;
    } else {
        heldItemGroup.rotation.x = 0;
        heldItemGroup.rotation.y = 0;
    }

    heldItemGroup.position.set(basePosX, basePosY, basePosZ);
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
    updateHeldItemAnimation();
    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized with full features');
