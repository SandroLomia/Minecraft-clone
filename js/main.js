import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const STANDING_HEIGHT = 1.8;
const CROUCHING_HEIGHT = 1.4;
let currentPlayerHeight = STANDING_HEIGHT;
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
    PLANKS: 11,
    BRICK: 12,
    IRON_ORE: 13,
    GOLD_ORE: 14,
    RED_FLOWER: 15,
    YELLOW_FLOWER: 16,
    TALL_GRASS: 17
};

function isFoliageBlock(type) {
    return type === BLOCK_TYPES.RED_FLOWER ||
           type === BLOCK_TYPES.YELLOW_FLOWER ||
           type === BLOCK_TYPES.TALL_GRASS;
}

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
    [BLOCK_TYPES.PLANKS]: 0xc19a6b,
    [BLOCK_TYPES.BRICK]: 0xa84232,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfad02c,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfdd835,
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

    if (isFoliageBlock(blockType)) {
        ctx.clearRect(0, 0, 16, 16);
        if (blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER) {
            // Stem
            ctx.fillStyle = '#2e7d32';
            for (let y = 6; y < 16; y++) {
                ctx.fillRect(7, y, 2, 1);
            }
            ctx.fillRect(5, 11, 2, 1);
            ctx.fillRect(9, 10, 2, 1);

            // Blossom petals
            ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#e53935' : '#fdd835';
            ctx.fillRect(6, 2, 4, 5);
            ctx.fillRect(5, 3, 6, 3);

            // Center of flower
            ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#fff176' : '#f57f17';
            ctx.fillRect(7, 3, 2, 2);
        } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
            ctx.fillStyle = '#388e3c';
            for (let y = 3; y < 16; y++) {
                const w = y > 10 ? 3 : (y > 6 ? 2 : 1);
                ctx.fillRect(7 - Math.floor(w / 2), y, w, 1);
            }
            // Side blades
            ctx.fillStyle = '#4caf50';
            for (let y = 5; y < 16; y++) {
                ctx.fillRect(4, y, 1, 1);
                ctx.fillRect(11, y, 1, 1);
            }
            for (let y = 8; y < 16; y++) {
                ctx.fillRect(2, y, 1, 1);
                ctx.fillRect(13, y, 1, 1);
            }
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
        } else if (blockType === BLOCK_TYPES.PLANKS) {
            for (let y = 0; y < 16; y += 4) {
                ctx.fillStyle = adjustHexColor(color, y % 8 === 0 ? 15 : -10);
                ctx.fillRect(0, y, 16, 4);
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(0, y, 16, 1);
            }
            // Vertical planks seams
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(5, 0, 1, 8);
            ctx.fillRect(11, 8, 1, 8);
        } else if (blockType === BLOCK_TYPES.BRICK) {
            ctx.fillStyle = '#b7410e';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#e0d8c8';
            for (let y = 3; y < 16; y += 4) {
                ctx.fillRect(0, y, 16, 1);
            }
            for (let y = 0; y < 16; y += 8) {
                ctx.fillRect(7, y, 1, 4);
                ctx.fillRect(15, y, 1, 4);
                ctx.fillRect(3, y + 4, 1, 4);
                ctx.fillRect(11, y + 4, 1, 4);
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
        } else if (blockType === BLOCK_TYPES.COAL_ORE || blockType === BLOCK_TYPES.IRON_ORE || blockType === BLOCK_TYPES.GOLD_ORE) {
            ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
            ctx.fillRect(0, 0, 16, 16);
            const oreColor = blockType === BLOCK_TYPES.COAL_ORE ? '#222222' :
                            (blockType === BLOCK_TYPES.IRON_ORE ? '#d4af37' : '#ffd700');
            for (let i = 0; i < 6; i++) {
                const rx = 2 + (i * 5) % 11;
                const ry = 2 + (i * 7) % 11;
                ctx.fillStyle = oreColor;
                ctx.fillRect(rx, ry, 2 + (i % 2), 2);
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
        }

        if (blockType !== BLOCK_TYPES.DIRT &&
            blockType !== BLOCK_TYPES.GRASS &&
            blockType !== BLOCK_TYPES.SAND &&
            blockType !== BLOCK_TYPES.LEAVES &&
            blockType !== BLOCK_TYPES.GLASS &&
            blockType !== BLOCK_TYPES.BRICK) {
            for (let i = 0; i < 80; i++) {
                const x = Math.floor(Math.random() * 16);
                const y = Math.floor(Math.random() * 16);
                const opacity = Math.random() * 0.22;
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        if (blockType !== BLOCK_TYPES.GLASS) {
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.strokeRect(0, 0, 16, 16);
        }
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
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// Pre-create held block materials
const HELD_BLOCK_MATERIALS = {};
Object.keys(BLOCK_COLORS).forEach(typeStr => {
    const type = parseInt(typeStr);
    HELD_BLOCK_MATERIALS[type] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[type],
        transparent: type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.WATER || type === BLOCK_TYPES.LEAVES || isFoliageBlock(type),
        opacity: type === BLOCK_TYPES.GLASS ? 0.6 : (type === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: (type === BLOCK_TYPES.LEAVES || isFoliageBlock(type)) ? 0.5 : 0,
        side: (type === BLOCK_TYPES.LEAVES || isFoliageBlock(type)) ? THREE.DoubleSide : THREE.FrontSide
    });
});

// First-person held block viewmodel
const heldItemRoot = new THREE.Group();
camera.add(heldItemRoot);
scene.add(camera);

const heldItemMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    HELD_BLOCK_MATERIALS[BLOCK_TYPES.STONE]
);
heldItemMesh.position.set(0.42, -0.36, -0.6);
heldItemMesh.rotation.set(0.2, -0.4, 0.15);
heldItemRoot.add(heldItemMesh);

let swingProgress = 0;
let isSwinging = false;
let bobTimer = 0;
let bobOffset = { x: 0, y: 0 };

function triggerSwing() {
    isSwinging = true;
    swingProgress = 0;
}

function updateHeldItem(deltaTime) {
    if (isSwinging) {
        swingProgress += deltaTime * 12;
        if (swingProgress >= Math.PI) {
            swingProgress = 0;
            isSwinging = false;
        }
    }

    const swingAngle = Math.sin(swingProgress);
    heldItemMesh.position.set(
        0.42 - swingAngle * 0.12 + bobOffset.x * 0.4,
        -0.36 - swingAngle * 0.15 + bobOffset.y * 0.6,
        -0.6 + swingAngle * 0.1
    );
    heldItemMesh.rotation.set(
        0.2 + swingAngle * 0.75,
        -0.4 - swingAngle * 0.4,
        0.15 + swingAngle * 0.5
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
        // Audio error silent fallback
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
        createOscillatorSound(100 + Math.random() * 30, 0.04, 'triangle', 0.018, 0.002);
    } else if (action === 'splash') {
        createOscillatorSound(260, 0.15, 'sine', 0.06, 0.01);
        createOscillatorSound(140, 0.2, 'triangle', 0.04, 0.02);
    } else if (action === 'click') {
        createOscillatorSound(600, 0.03, 'sine', 0.03, 0.001);
    }
}

// Stats HUD tracking
const stats = {
    blocksBroken: 0,
    blocksPlaced: 0
};

const hudPos = document.getElementById('hud-pos');
const hudTime = document.getElementById('hud-time');
const hudStats = document.getElementById('hud-stats');

function updateStatsHUD() {
    if (hudPos) {
        hudPos.textContent = `XYZ: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
    }
    if (hudTime) {
        const hours = Math.floor((gameTime / DAY_DURATION) * 24);
        const mins = Math.floor(((gameTime / DAY_DURATION) * 24 * 60) % 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        let phase = 'Day';
        if (gameTime < 2000) phase = 'Sunrise';
        else if (gameTime < 10000) phase = 'Day';
        else if (gameTime < 12000) phase = 'Sunset';
        else if (gameTime < 14000) phase = 'Dusk';
        else if (gameTime < 22000) phase = 'Night';
        else phase = 'Pre-dawn';
        hudTime.textContent = `Time: ${phase} (${timeStr})`;
    }
    if (hudStats) {
        hudStats.textContent = `Blocks: ${stats.blocksBroken} broken | ${stats.blocksPlaced} placed`;
    }
}

// Sky & Celestial bodies
const sunGeometry = new THREE.BoxGeometry(12, 12, 12);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff099 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(10, 10, 10);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Twinkling Starfield
const starCount = 300;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 280;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 15; // above horizon
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0
});
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// Procedural Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65
});
const cloudBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 28; i++) {
    const cloudCluster = new THREE.Group();
    const cx = (Math.random() - 0.5) * 350;
    const cz = (Math.random() - 0.5) * 350;
    const cy = 24;
    const clusterLength = Math.floor(Math.random() * 4) + 3;
    const clusterWidth = Math.floor(Math.random() * 3) + 2;

    for (let bx = 0; bx < clusterLength; bx++) {
        for (let bz = 0; bz < clusterWidth; bz++) {
            if (Math.random() > 0.25) {
                const cloudPart = new THREE.Mesh(cloudBoxGeometry, cloudMaterial);
                cloudPart.scale.set(6, 1.8, 6);
                cloudPart.position.set(bx * 5.8, 0, bz * 5.8);
                cloudCluster.add(cloudPart);
            }
        }
    }
    cloudCluster.position.set(cx, cy, cz);
    cloudsGroup.add(cloudCluster);
}
scene.add(cloudsGroup);

function updateClouds(deltaTime) {
    cloudsGroup.children.forEach(cluster => {
        cluster.position.x += deltaTime * 1.8;
        if (cluster.position.x > camera.position.x + 200) {
            cluster.position.x = camera.position.x - 200;
        }
    });
}

const DAY_DURATION = 24000;
let gameTime = 6000;

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    let skyColor, lightIntensity;
    let starOpacity = 0;

    if (gameTime < 2000) { // Sunrise
        const t = gameTime / 2000;
        skyColor = new THREE.Color(0xffad60).lerp(new THREE.Color(0x87CEEB), t);
        lightIntensity = 0.4 + t * 0.4;
        starOpacity = (1 - t) * 0.5;
    } else if (gameTime < 10000) { // Day
        skyColor = new THREE.Color(0x87CEEB);
        lightIntensity = 0.85;
        starOpacity = 0;
    } else if (gameTime < 12000) { // Sunset
        const t = (gameTime - 10000) / 2000;
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0xff7043), t);
        lightIntensity = 0.85 - t * 0.45;
        starOpacity = t * 0.4;
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
        starOpacity = 0.4 + t * 0.5;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.12;
        starOpacity = 0.9;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.12 + t * 0.28;
        starOpacity = 0.9 - t * 0.4;
    }

    starMaterial.opacity = starOpacity;
    starField.position.copy(camera.position);

    scene.background.copy(skyColor);
    scene.fog.color.copy(skyColor);
    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.12;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const sunDist = 180;
    sunMesh.position.set(
        camera.position.x + Math.cos(sunAngle) * sunDist,
        camera.position.y + Math.sin(sunAngle) * sunDist,
        camera.position.z + 40
    );
    sunMesh.lookAt(camera.position);

    const moonAngle = sunAngle + Math.PI;
    moonMesh.position.set(
        camera.position.x + Math.cos(moonAngle) * sunDist,
        camera.position.y + Math.sin(moonAngle) * sunDist,
        camera.position.z + 40
    );
    moonMesh.lookAt(camera.position);

    directionalLight.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        50
    );
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

// Selection Box
const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
selectionBox.geometry.translate(0.5, 0.5, 0.5);
selectionBox.raycast = () => null;
scene.add(selectionBox);

// Particles
const particles = [];
const particleGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);

function createParticles(pos, color) {
    for (let i = 0; i < 8; i++) {
        const material = new THREE.MeshLambertMaterial({ color: color });
        const particle = new THREE.Mesh(particleGeometry, material);

        particle.position.set(
            pos.x + (Math.random() - 0.5) * 0.6,
            pos.y + (Math.random() - 0.5) * 0.6,
            pos.z + (Math.random() - 0.5) * 0.6
        );

        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.18 + 0.05,
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
        p.life -= 0.025;
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

            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                if (y < height - 4) {
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.18, (y + worldZ) * 0.18);
                    const goldNoise = simplex.noise2D((worldX - 80) * 0.22, (y + worldZ + 40) * 0.22);
                    const coalNoise = simplex.noise2D(worldX * 0.2, (y + worldZ) * 0.2);

                    if (goldNoise > 0.72 && y < 5) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (ironNoise > 0.68) {
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

            // Surface flora (flowers and tall grass)
            if (!isBeach && height > 6 && height < CHUNK_HEIGHT - 1) {
                const floraNoise = simplex.noise2D(worldX * 0.35 + 23.1, worldZ * 0.35 + 87.4);
                if (floraNoise > 0.7) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (floraNoise < -0.7) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                } else if (floraNoise > 0.45) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                }
            }

            // Trees
            if (!isBeach && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8) {
                    // Clear flora under trunk
                    chunk.setBlock(x, height, z, BLOCK_TYPES.WOOD);
                    for (let ty = 1; ty < 3; ty++) {
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
           isFoliageBlock(type);
}

// Billboard geometry for flowers/grass (double crossed plane)
function createCrossBillboardGeometry() {
    const geom = new THREE.BufferGeometry();
    // Two crossing planes of size 1x1 centered horizontally, y from 0 to 1
    // Plane 1 (diagonal: [-0.5, 0, -0.5] to [0.5, 0, 0.5])
    // Plane 2 (diagonal: [-0.5, 0, 0.5] to [0.5, 0, -0.5])
    const positions = new Float32Array([
        // Plane 1 - Triangle 1
        0, 0, 0,   1, 0, 1,   1, 1, 1,
        // Plane 1 - Triangle 2
        0, 0, 0,   1, 1, 1,   0, 1, 0,
        // Plane 2 - Triangle 1
        0, 0, 1,   1, 0, 0,   1, 1, 0,
        // Plane 2 - Triangle 2
        0, 0, 1,   1, 1, 0,   0, 1, 1
    ]);
    const uvs = new Float32Array([
        0, 0,   1, 0,   1, 1,
        0, 0,   1, 1,   0, 1,
        0, 0,   1, 0,   1, 1,
        0, 0,   1, 1,   0, 1
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();
    return geom;
}
const foliageBillboardGeometry = createCrossBillboardGeometry();

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
        const isFoliage = isFoliageBlock(blockType);
        const geom = isFoliage ? foliageBillboardGeometry : standardBoxGeometry;
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || isFoliage,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || isFoliage) ? 0.5 : 0,
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
let isSprinting = false;
let isCrouching = false;
let isSubmerged = false;

const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.PLANKS,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.IRON_ORE,
    BLOCK_TYPES.GLASS
];
let selectedBlock = inventoryBlocks[0];

const inventoryUI = document.getElementById('inventory');
const slotElements = [];

function selectSlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedBlock = inventoryBlocks[index];
    slotElements.forEach((s, idx) => {
        if (idx === index) {
            s.classList.add('selected');
        } else {
            s.classList.remove('selected');
        }
    });
    if (HELD_BLOCK_MATERIALS[selectedBlock]) {
        heldItemMesh.material = HELD_BLOCK_MATERIALS[selectedBlock];
    }
    playSound('click');
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    if (BLOCK_CANVASES[type]) {
        slot.style.backgroundImage = `url(${BLOCK_CANVASES[type].toDataURL()})`;
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }

    const keyHint = document.createElement('span');
    keyHint.className = 'slot-key';
    keyHint.textContent = (index + 1).toString();
    slot.appendChild(keyHint);

    if (type === selectedBlock) slot.classList.add('selected');

    slot.onclick = () => {
        selectSlot(index);
    };

    inventoryUI.appendChild(slot);
    slotElements.push(slot);
});

// Update initial held item material
if (HELD_BLOCK_MATERIALS[selectedBlock]) {
    heldItemMesh.material = HELD_BLOCK_MATERIALS[selectedBlock];
}

// Scroll wheel to cycle hotbar
window.addEventListener('wheel', (e) => {
    const currentIndex = inventoryBlocks.indexOf(selectedBlock);
    let newIndex = currentIndex + (e.deltaY > 0 ? 1 : -1);
    if (newIndex < 0) newIndex = inventoryBlocks.length - 1;
    if (newIndex >= inventoryBlocks.length) newIndex = 0;
    selectSlot(newIndex);
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

    // Number keys 1-9
    if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 1 && num <= inventoryBlocks.length) {
            selectSlot(num - 1);
        }
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobile touch state
let joystickVector = new THREE.Vector2();
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
let isTouchingJoystick = false;

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

document.getElementById('jump-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isSubmerged) {
        playerVelocity.y = 0.12;
    } else if (isGrounded && !isCrouching) {
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
                stats.blocksBroken++;
                triggerSwing();
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            // Don't place block where player is standing
            const playerPos = camera.position.clone();
            const playerBottomY = Math.floor(playerPos.y - currentPlayerHeight);
            const playerTopY = Math.floor(playerPos.y);
            if (Math.floor(playerPos.x) === x && Math.floor(playerPos.z) === z &&
               (y >= playerBottomY && y <= playerTopY)) {
                return;
            }
            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            stats.blocksPlaced++;
            triggerSwing();
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

function handleMovement(deltaTime) {
    const direction = new THREE.Vector3();
    const hasKeyboardInput = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

    isSprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
    isCrouching = Boolean(keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']);

    // Dynamic FOV when sprinting
    const targetFov = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * deltaTime * 10;
        camera.updateProjectionMatrix();
    }

    // Dynamic eye height for crouching
    const targetHeight = isCrouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
    const heightDiff = (targetHeight - currentPlayerHeight) * deltaTime * 12;
    currentPlayerHeight += heightDiff;
    camera.position.y += heightDiff;

    let speed = BASE_MOVE_SPEED;
    if (isSprinting) speed *= 1.55;
    if (isCrouching) speed *= 0.55;
    if (isSubmerged) speed *= 0.65;

    if (hasKeyboardInput) {
        const frontVector = new THREE.Vector3(0, 0, Number(keys['KeyS'] || 0) - Number(keys['KeyW'] || 0));
        const sideVector = new THREE.Vector3(Number(keys['KeyA'] || 0) - Number(keys['KeyD'] || 0), 0, 0);
        direction.subVectors(frontVector, sideVector);
    } else {
        // Mobile movement
        direction.set(joystickVector.x, 0, joystickVector.y);
    }

    const isMoving = direction.lengthSq() > 0.001;

    direction
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    // View bobbing & footstep sounds
    if (isMoving && isGrounded && !isSubmerged) {
        bobTimer += deltaTime * (isSprinting ? 14 : 9);
        const targetBobX = Math.cos(bobTimer * 0.5) * 0.025;
        const targetBobY = Math.abs(Math.sin(bobTimer)) * 0.035;
        bobOffset.x += (targetBobX - bobOffset.x) * 0.2;
        bobOffset.y += (targetBobY - bobOffset.y) * 0.2;

        footstepTimer += deltaTime * (isSprinting ? 1.6 : 1.0);
        if (footstepTimer > 0.4) {
            playSound('footstep');
            footstepTimer = 0;
        }
    } else {
        bobTimer = 0;
        bobOffset.x += (0 - bobOffset.x) * 0.2;
        bobOffset.y += (0 - bobOffset.y) * 0.2;
    }

    if (keys['Space']) {
        if (isSubmerged) {
            playerVelocity.y = 0.12;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }
}

function updatePhysics() {
    const feetPos = camera.position.clone();
    feetPos.y -= currentPlayerHeight;
    const blockAtFeet = getBlockAt(feetPos.x, feetPos.y, feetPos.z);
    const wasSubmerged = isSubmerged;
    isSubmerged = (blockAtFeet === BLOCK_TYPES.WATER);

    if (!wasSubmerged && isSubmerged) {
        playSound('splash');
    }

    if (isSubmerged) {
        // Water buoyant gravity and dampening
        playerVelocity.y += GRAVITY * 0.35;
        playerVelocity.y *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Vertical collision detection
    const blockBelow = getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z);
    if (blockBelow !== BLOCK_TYPES.AIR && blockBelow !== BLOCK_TYPES.WATER && !isFoliageBlock(blockBelow)) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    const isSolid = (block) => block !== BLOCK_TYPES.AIR &&
                              block !== BLOCK_TYPES.WATER &&
                              !isFoliageBlock(block);

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (isSolid(getBlockAt(checkX, playerY, camera.position.z)) ||
            isSolid(getBlockAt(checkX, playerY + 1, camera.position.z))) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (isSolid(getBlockAt(camera.position.x, playerY, checkZ)) ||
            isSolid(getBlockAt(camera.position.x, playerY + 1, checkZ))) {
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

// Underwater camera effect
const underwaterOverlay = document.getElementById('underwater-overlay');
function updateUnderwaterVisuals() {
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const isCameraUnderwater = (headBlock === BLOCK_TYPES.WATER);

    if (isCameraUnderwater) {
        scene.fog.color.setHex(0x0d47a1);
        scene.fog.density = 0.08;
        if (underwaterOverlay) underwaterOverlay.style.display = 'block';
    } else {
        if (underwaterOverlay) underwaterOverlay.style.display = 'none';
    }
}

// Main game loop
let lastFrameTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    // View bobbing offset subtraction/reapplication to prevent drift
    camera.position.y -= bobOffset.y;
    camera.position.x -= bobOffset.x;

    handleMovement(deltaTime);
    updatePhysics();

    camera.position.y += bobOffset.y;
    camera.position.x += bobOffset.x;

    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateClouds(deltaTime);
    updateParticles();
    updateHeldItem(deltaTime);
    updateUnderwaterVisuals();
    updateStatsHUD();

    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized with enhanced graphics, blocks, and mechanics');
