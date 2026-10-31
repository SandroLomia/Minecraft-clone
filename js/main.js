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
const SPRINT_MULTIPLIER = 1.55;
const CROUCH_MULTIPLIER = 0.55;

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

const BLOCK_NAMES = {
    [BLOCK_TYPES.GRASS]: 'Grass',
    [BLOCK_TYPES.DIRT]: 'Dirt',
    [BLOCK_TYPES.STONE]: 'Stone',
    [BLOCK_TYPES.WOOD]: 'Wood Log',
    [BLOCK_TYPES.LEAVES]: 'Leaves',
    [BLOCK_TYPES.SAND]: 'Sand',
    [BLOCK_TYPES.GLASS]: 'Glass',
    [BLOCK_TYPES.WATER]: 'Water',
    [BLOCK_TYPES.COAL_ORE]: 'Coal Ore',
    [BLOCK_TYPES.COBBLESTONE]: 'Cobblestone',
    [BLOCK_TYPES.PLANKS]: 'Wood Planks',
    [BLOCK_TYPES.BRICK]: 'Bricks',
    [BLOCK_TYPES.IRON_ORE]: 'Iron Ore',
    [BLOCK_TYPES.GOLD_ORE]: 'Gold Ore',
    [BLOCK_TYPES.RED_FLOWER]: 'Rose',
    [BLOCK_TYPES.YELLOW_FLOWER]: 'Dandelion',
    [BLOCK_TYPES.TALL_GRASS]: 'Tall Grass'
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
    [BLOCK_TYPES.PLANKS]: 0xba8c54,
    [BLOCK_TYPES.BRICK]: 0x9c3d2e,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af92,
    [BLOCK_TYPES.GOLD_ORE]: 0xfad64a,
    [BLOCK_TYPES.RED_FLOWER]: 0xdd2c2c,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xffeb3b,
    [BLOCK_TYPES.TALL_GRASS]: 0x55a836
};

function isFoliageBlock(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
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

    if (isFoliageBlock(blockType)) {
        ctx.clearRect(0, 0, 16, 16);
        if (blockType === BLOCK_TYPES.RED_FLOWER) {
            // Stem
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(7, 7, 2, 9);
            ctx.fillRect(5, 10, 2, 2);
            ctx.fillRect(9, 9, 2, 2);
            // Flower head
            ctx.fillStyle = '#e53935';
            ctx.fillRect(6, 3, 4, 4);
            ctx.fillStyle = '#b71c1c';
            ctx.fillRect(6, 4, 1, 2);
            ctx.fillRect(9, 4, 1, 2);
            ctx.fillStyle = '#ffe082';
            ctx.fillRect(7, 4, 2, 2);
        } else if (blockType === BLOCK_TYPES.YELLOW_FLOWER) {
            // Stem
            ctx.fillStyle = '#388e3c';
            ctx.fillRect(7, 6, 2, 10);
            ctx.fillRect(6, 11, 2, 2);
            // Flower head
            ctx.fillStyle = '#fdd835';
            ctx.fillRect(5, 2, 6, 4);
            ctx.fillStyle = '#f57f17';
            ctx.fillRect(6, 3, 4, 2);
            ctx.fillStyle = '#fff59d';
            ctx.fillRect(7, 3, 2, 1);
        } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
            ctx.fillStyle = '#4caf50';
            const blades = [
                [3, 8, 2, 8],
                [5, 5, 2, 11],
                [7, 3, 2, 13],
                [9, 4, 2, 12],
                [11, 7, 2, 9]
            ];
            blades.forEach(([bx, by, bw, bh]) => {
                ctx.fillStyle = adjustHexColor(0x55a836, (Math.random() - 0.5) * 30);
                ctx.fillRect(bx, by, bw, bh);
            });
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
            for (let y = 0; y < 16; y += 4) {
                ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], y % 8 === 0 ? 10 : -8);
                ctx.fillRect(0, y, 16, 2);
            }
            const speckColor = blockType === BLOCK_TYPES.COAL_ORE ? '#1e1e1e' : (blockType === BLOCK_TYPES.IRON_ORE ? '#dfbba0' : '#f5c830');
            const darkSpeck = blockType === BLOCK_TYPES.COAL_ORE ? '#0a0a0a' : (blockType === BLOCK_TYPES.IRON_ORE ? '#9e6d4c' : '#bd8813');
            const specks = [[3, 3], [4, 4], [10, 4], [11, 5], [6, 9], [7, 10], [12, 11], [3, 12]];
            specks.forEach(([sx, sy]) => {
                ctx.fillStyle = speckColor;
                ctx.fillRect(sx, sy, 2, 2);
                ctx.fillStyle = darkSpeck;
                ctx.fillRect(sx + 1, sy + 1, 1, 1);
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
        } else if (blockType === BLOCK_TYPES.PLANKS) {
            for (let y = 0; y < 16; y += 4) {
                ctx.fillStyle = adjustHexColor(color, y % 8 === 0 ? 12 : -10);
                ctx.fillRect(0, y, 16, 4);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
                ctx.fillRect(0, y + 3, 16, 1);
                // Nail / joint marks
                const offset = (y % 8 === 0) ? 7 : 13;
                ctx.fillRect(offset, y, 1, 4);
            }
        } else if (blockType === BLOCK_TYPES.BRICK) {
            ctx.fillStyle = '#c54e3d';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#ddd';
            // Mortar lines
            ctx.fillRect(0, 3, 16, 1);
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(0, 11, 16, 1);
            ctx.fillRect(0, 15, 16, 1);
            // Vertical mortar lines
            ctx.fillRect(7, 0, 1, 4);
            ctx.fillRect(15, 0, 1, 4);
            ctx.fillRect(3, 4, 1, 4);
            ctx.fillRect(11, 4, 1, 4);
            ctx.fillRect(7, 8, 1, 4);
            ctx.fillRect(15, 8, 1, 4);
            ctx.fillRect(3, 12, 1, 4);
            ctx.fillRect(11, 12, 1, 4);
        }

        if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && blockType !== BLOCK_TYPES.BRICK) {
            for (let i = 0; i < 60; i++) {
                const x = Math.floor(Math.random() * 16);
                const y = Math.floor(Math.random() * 16);
                const opacity = Math.random() * 0.18;
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
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// Shared materials for held block to avoid recreating in animate loop
const HELD_BLOCK_MATERIALS = {};
Object.keys(BLOCK_TEXTURES).forEach(type => {
    const bType = Number(type);
    HELD_BLOCK_MATERIALS[bType] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[bType],
        transparent: bType === BLOCK_TYPES.GLASS || bType === BLOCK_TYPES.WATER || bType === BLOCK_TYPES.LEAVES || isFoliageBlock(bType),
        opacity: bType === BLOCK_TYPES.GLASS ? 0.6 : (bType === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: (bType === BLOCK_TYPES.LEAVES || isFoliageBlock(bType)) ? 0.4 : 0,
        side: isFoliageBlock(bType) ? THREE.DoubleSide : THREE.FrontSide
    });
});

// Create Foliage Geometry (crossed double plane)
function createFoliageGeometry() {
    const p1 = new THREE.PlaneGeometry(1, 1);
    p1.rotateY(Math.PI / 4);
    p1.translate(0.5, 0.5, 0.5);

    const p2 = new THREE.PlaneGeometry(1, 1);
    p2.rotateY(-Math.PI / 4);
    p2.translate(0.5, 0.5, 0.5);

    const p1NonIndexed = p1.toNonIndexed();
    const p2NonIndexed = p2.toNonIndexed();

    const pos1 = p1NonIndexed.attributes.position.array;
    const pos2 = p2NonIndexed.attributes.position.array;
    const positions = new Float32Array(pos1.length + pos2.length);
    positions.set(pos1, 0);
    positions.set(pos2, pos1.length);

    const uv1 = p1NonIndexed.attributes.uv.array;
    const uv2 = p2NonIndexed.attributes.uv.array;
    const uvs = new Float32Array(uv1.length + uv2.length);
    uvs.set(uv1, 0);
    uvs.set(uv2, uv1.length);

    const foliageGeom = new THREE.BufferGeometry();
    foliageGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    foliageGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    foliageGeom.computeVertexNormals();
    return foliageGeom;
}

const foliageGeometry = createFoliageGeometry();
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
blockGeometry.translate(0.5, 0.5, 0.5);

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
        // Audio might be suppressed before gesture
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
    } else if (action === 'step') {
        createOscillatorSound(95 + Math.random() * 25, 0.04, 'triangle', 0.02, 0.002);
    } else if (action === 'click') {
        createOscillatorSound(520, 0.03, 'sine', 0.025, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(160, 0.18, 'sine', 0.06, 0.01);
        createOscillatorSound(240, 0.12, 'triangle', 0.04, 0.01);
    }
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

// 3D Sun & Moon
const sunGeometry = new THREE.BoxGeometry(16, 16, 16);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff275 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(14, 14, 14);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xebf4f6 });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Starfield
const starCount = 350;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9 + 0.1); // upper hemisphere
    const radius = 220;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.cos(phi);
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0
});
const starMesh = new THREE.Points(starGeometry, starMaterial);
scene.add(starMesh);

// Drifting Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.72
});
const cloudBoxGeom = new THREE.BoxGeometry(1, 1, 1);

for (let c = 0; c < 26; c++) {
    const cloudCluster = new THREE.Group();
    const cx = (Math.random() - 0.5) * 320;
    const cz = (Math.random() - 0.5) * 320;
    const cy = 24 + Math.random() * 2;
    const width = 8 + Math.floor(Math.random() * 12);
    const depth = 6 + Math.floor(Math.random() * 8);

    for (let bx = 0; bx < width; bx += 2) {
        for (let bz = 0; bz < depth; bz += 2) {
            if (Math.random() > 0.25) {
                const puff = new THREE.Mesh(cloudBoxGeom, cloudMaterial);
                puff.scale.set(2, 1.2, 2);
                puff.position.set(bx, 0, bz);
                cloudCluster.add(puff);
            }
        }
    }
    cloudCluster.position.set(cx, cy, cz);
    cloudsGroup.add(cloudCluster);
}
scene.add(cloudsGroup);

// First person held block
const heldBlockGroup = new THREE.Group();
const heldBlockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), HELD_BLOCK_MATERIALS[BLOCK_TYPES.STONE]);
heldBlockMesh.position.set(0.48, -0.42, -0.72);
heldBlockMesh.rotation.set(0.35, -0.55, 0.15);
heldBlockGroup.add(heldBlockMesh);
camera.add(heldBlockGroup);
scene.add(camera);

let isSwinging = false;
let swingProgress = 0;

function triggerHeldBlockSwing() {
    isSwinging = true;
    swingProgress = 0;
}

function updateHeldBlock(delta) {
    if (isSwinging) {
        swingProgress += delta * 12;
        if (swingProgress >= Math.PI) {
            isSwinging = false;
            swingProgress = 0;
        }
    }
    const swingOffset = Math.sin(swingProgress);
    heldBlockMesh.rotation.x = 0.35 + swingOffset * 0.8;
    heldBlockMesh.rotation.y = -0.55 - swingOffset * 0.4;
    heldBlockMesh.position.z = -0.72 - swingOffset * 0.15;
    heldBlockMesh.position.y = -0.42 + swingOffset * 0.1;
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

// Day / Night Diurnal Cycle
const DAY_DURATION = 24000;
let gameTime = 6000;
let timeOfDayName = 'Day';

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    let skyColor, lightIntensity;

    if (gameTime < 2000) { // Sunrise
        const t = gameTime / 2000;
        skyColor = new THREE.Color(0xffad60).lerp(new THREE.Color(0x87CEEB), t);
        lightIntensity = 0.4 + t * 0.4;
        starMaterial.opacity = (1 - t) * 0.8;
        timeOfDayName = 'Sunrise';
    } else if (gameTime < 10000) { // Day
        skyColor = new THREE.Color(0x87CEEB);
        lightIntensity = 0.8;
        starMaterial.opacity = 0;
        timeOfDayName = 'Day';
    } else if (gameTime < 12000) { // Sunset
        const t = (gameTime - 10000) / 2000;
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0xff7043), t);
        lightIntensity = 0.8 - t * 0.4;
        starMaterial.opacity = t * 0.3;
        timeOfDayName = 'Sunset';
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
        starMaterial.opacity = 0.3 + t * 0.6;
        timeOfDayName = 'Dusk';
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.12;
        starMaterial.opacity = 0.95;
        timeOfDayName = 'Night';
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.12 + t * 0.28;
        starMaterial.opacity = 0.95 - t * 0.95;
        timeOfDayName = 'Dawn';
    }

    // Check underwater camera state
    const camBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const isUnderwater = camBlock === BLOCK_TYPES.WATER;
    const underwaterOverlay = document.getElementById('underwater-overlay');

    if (isUnderwater) {
        scene.background.setHex(0x0d3c61);
        scene.fog.color.setHex(0x0d3c61);
        scene.fog.near = 1;
        scene.fog.far = 16;
        if (underwaterOverlay) underwaterOverlay.style.opacity = '0.75';
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
        if (underwaterOverlay) underwaterOverlay.style.opacity = '0';
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    directionalLight.position.set(
        Math.cos(sunAngle) * 120,
        Math.sin(sunAngle) * 120,
        50
    );

    // Orbit Sun and Moon around player
    const playerX = camera.position.x;
    const playerZ = camera.position.z;

    sunMesh.position.set(
        playerX + Math.cos(sunAngle) * 140,
        Math.sin(sunAngle) * 140,
        playerZ + 40
    );
    sunMesh.lookAt(playerX, 0, playerZ);

    const moonAngle = sunAngle + Math.PI;
    moonMesh.position.set(
        playerX + Math.cos(moonAngle) * 140,
        Math.sin(moonAngle) * 140,
        playerZ + 40
    );
    moonMesh.lookAt(playerX, 0, playerZ);

    starMesh.position.set(playerX, 0, playerZ);

    // Drift clouds
    cloudsGroup.children.forEach(cluster => {
        cluster.position.x += 0.04;
        if (cluster.position.x > playerX + 160) {
            cluster.position.x = playerX - 160;
        }
    });
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

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
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.25, (y + worldZ + 20) * 0.25);
                    const goldNoise = simplex.noise2D((worldX - 80) * 0.3, (y + worldZ - 40) * 0.3);

                    if (y <= 3 && goldNoise > 0.72) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (y <= 7 && ironNoise > 0.65) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.IRON_ORE);
                    } else if (coalNoise > 0.62) {
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

            // Surface Foliage (Flowers, Grass)
            if (!isBeach && height > 6 && height < CHUNK_HEIGHT - 1) {
                const foliageNoise = textureNoise.noise2D(worldX * 0.7 + 100, worldZ * 0.7 + 200);
                if (foliageNoise > 0.78) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (foliageNoise > 0.68) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                } else if (foliageNoise > 0.45) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
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
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliageBlock(type);
}

function createChunkMesh(chunk) {
    const instancedMeshes = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk.getBlock(x, y, z);
                if (blockType !== BLOCK_TYPES.AIR) {
                    const isFoliage = isFoliageBlock(blockType);
                    let isVisible = isFoliage;

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
        const geometry = isFoliage ? foliageGeometry : blockGeometry;
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || isFoliage,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || isFoliage) ? 0.4 : 0,
            side: isFoliage ? THREE.DoubleSide : (blockType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide)
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

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player & HUD State
const playerVelocity = new THREE.Vector3();
let isGrounded = false;
let isSprinting = false;
let isCrouching = false;
let blocksBrokenCount = 0;
let blocksPlacedCount = 0;

// Stats HUD elements
const statsCoords = document.getElementById('stats-coords');
const statsTime = document.getElementById('stats-time');
const statsBlocks = document.getElementById('stats-blocks');
const statsState = document.getElementById('stats-state');

function updateStatsHUD() {
    if (statsCoords) {
        statsCoords.textContent = `XYZ: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
    }
    if (statsTime) {
        const hours = Math.floor((gameTime / DAY_DURATION) * 24);
        const minutes = Math.floor(((gameTime / DAY_DURATION) * 24 * 60) % 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        statsTime.textContent = `Time: ${timeOfDayName} (${timeStr})`;
    }
    if (statsBlocks) {
        statsBlocks.textContent = `Broken: ${blocksBrokenCount} | Placed: ${blocksPlacedCount}`;
    }
    if (statsState) {
        const moveState = isCrouching ? 'Crouching' : (isSprinting ? 'Sprinting' : 'Walking');
        const inWater = getBlockAt(camera.position.x, camera.position.y, camera.position.z) === BLOCK_TYPES.WATER;
        statsState.textContent = `State: ${inWater ? 'Swimming' : moveState} | Block: ${BLOCK_NAMES[selectedBlock] || 'None'}`;
    }
}

// Hotbar Slots Configuration (9 slots)
const hotbarBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.PLANKS,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.GLASS,
    BLOCK_TYPES.RED_FLOWER
];

let selectedSlotIndex = 0;
let selectedBlock = hotbarBlocks[selectedSlotIndex];

const inventoryUI = document.getElementById('inventory');
const slotElements = [];

function selectSlot(index) {
    if (index < 0 || index >= hotbarBlocks.length) return;
    selectedSlotIndex = index;
    selectedBlock = hotbarBlocks[index];

    slotElements.forEach((slot, i) => {
        if (i === selectedSlotIndex) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    });

    // Update held block model texture
    if (HELD_BLOCK_MATERIALS[selectedBlock]) {
        heldBlockMesh.material = HELD_BLOCK_MATERIALS[selectedBlock];
        if (isFoliageBlock(selectedBlock)) {
            heldBlockMesh.geometry = foliageGeometry;
            heldBlockMesh.scale.set(0.6, 0.6, 0.6);
        } else {
            heldBlockMesh.geometry = blockGeometry;
            heldBlockMesh.scale.set(0.35, 0.35, 0.35);
        }
    }
    playSound('click');
}

// Build hotbar UI slots
hotbarBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    const canvas = BLOCK_CANVASES[type];
    if (canvas) {
        slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }

    const numberSpan = document.createElement('span');
    numberSpan.className = 'slot-number';
    numberSpan.textContent = `${index + 1}`;
    slot.appendChild(numberSpan);

    if (index === selectedSlotIndex) slot.classList.add('selected');

    slot.onclick = () => {
        selectSlot(index);
    };

    inventoryUI.appendChild(slot);
    slotElements.push(slot);
});

// Update initial held block
if (HELD_BLOCK_MATERIALS[selectedBlock]) {
    heldBlockMesh.material = HELD_BLOCK_MATERIALS[selectedBlock];
}

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
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= 9) {
            selectSlot(digit - 1);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mouse wheel to cycle hotbar
document.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
        const next = (selectedSlotIndex + 1) % hotbarBlocks.length;
        selectSlot(next);
    } else if (e.deltaY < 0) {
        const prev = (selectedSlotIndex - 1 + hotbarBlocks.length) % hotbarBlocks.length;
        selectSlot(prev);
    }
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
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}, { passive: false });

document.getElementById('jump-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGrounded && !isCrouching) {
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
    triggerHeldBlockSwing();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance > 5.5) return;

        const pos = intersect.point.clone();

        if (action === 'break') {
            pos.add(intersect.face.normal.clone().multiplyScalar(-0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            const blockType = getBlockAt(x, y, z);
            if (blockType !== BLOCK_TYPES.AIR) {
                createParticles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), BLOCK_COLORS[blockType] || 0x888888);
                updateBlock(x, y, z, BLOCK_TYPES.AIR);
                playSound('break');
                blocksBrokenCount++;
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            // Don't place block inside player footprint
            const playerFeetY = Math.floor(camera.position.y - currentPlayerHeight);
            const playerHeadY = Math.floor(camera.position.y);
            const playerBlockX = Math.floor(camera.position.x);
            const playerBlockZ = Math.floor(camera.position.z);

            if (playerBlockX === x && playerBlockZ === z && (y >= playerFeetY && y <= playerHeadY)) {
                return;
            }

            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            blocksPlacedCount++;
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

// View Bobbing & Step Sounds State
let bobTimer = 0;
let lastStepTime = 0;
const bobOffset = new THREE.Vector3();

function handleMovement() {
    isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && !isCrouching;
    isCrouching = (keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']);

    const targetHeight = isCrouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    // Smooth FOV shift when sprinting
    const targetFov = isSprinting ? 85 : 75;
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    let speed = BASE_MOVE_SPEED;
    if (isSprinting) speed *= SPRINT_MULTIPLIER;
    if (isCrouching) speed *= CROUCH_MULTIPLIER;

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

    direction
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    // Check if in water
    const blockAtCamera = getBlockAt(camera.position.x, camera.position.y - 0.5, camera.position.z);
    const inWater = blockAtCamera === BLOCK_TYPES.WATER;

    if (inWater) {
        if (keys['Space']) {
            playerVelocity.y = 0.08; // Swimming upward
        }
    } else if (keys['Space'] && isGrounded && !isCrouching) {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSound('jump');
    }

    // View Bobbing & Footsteps
    if (isMoving && isGrounded && !inWater) {
        const bobFreq = isSprinting ? 14 : 9;
        const bobAmpY = isSprinting ? 0.06 : 0.035;
        const bobAmpX = isSprinting ? 0.04 : 0.02;

        bobTimer += 0.016 * bobFreq;
        bobOffset.y = Math.sin(bobTimer) * bobAmpY;
        bobOffset.x = Math.cos(bobTimer * 0.5) * bobAmpX;

        const now = performance.now();
        const stepInterval = isSprinting ? 300 : 480;
        if (now - lastStepTime > stepInterval) {
            playSound('step');
            lastStepTime = now;
        }
    } else {
        bobTimer = 0;
        bobOffset.lerp(new THREE.Vector3(0, 0, 0), 0.15);
    }
}

function updatePhysics() {
    // Subtract previous bobbing before physics to prevent drift
    camera.position.sub(bobOffset);

    // Water physics
    const blockAtFeet = getBlockAt(camera.position.x, camera.position.y - currentPlayerHeight, camera.position.z);
    const inWater = blockAtFeet === BLOCK_TYPES.WATER;

    if (inWater) {
        playerVelocity.y += GRAVITY * 0.25;
        playerVelocity.y = Math.max(-0.06, playerVelocity.y);
        playerVelocity.x *= 0.85;
        playerVelocity.z *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Vertical collision detection
    const blockBelow = getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z);
    if (blockBelow !== BLOCK_TYPES.AIR && !isFoliageBlock(blockBelow) && blockBelow !== BLOCK_TYPES.WATER) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions
    const checkRadius = PLAYER_RADIUS;
    const playerFeetY = camera.position.y - currentPlayerHeight + 0.1;

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(checkX, playerFeetY, camera.position.z);
        const b2 = getBlockAt(checkX, playerFeetY + 1, camera.position.z);
        const solid1 = b1 !== BLOCK_TYPES.AIR && !isFoliageBlock(b1) && b1 !== BLOCK_TYPES.WATER;
        const solid2 = b2 !== BLOCK_TYPES.AIR && !isFoliageBlock(b2) && b2 !== BLOCK_TYPES.WATER;

        if (solid1 || solid2) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(camera.position.x, playerFeetY, checkZ);
        const b2 = getBlockAt(camera.position.x, playerFeetY + 1, checkZ);
        const solid1 = b1 !== BLOCK_TYPES.AIR && !isFoliageBlock(b1) && b1 !== BLOCK_TYPES.WATER;
        const solid2 = b2 !== BLOCK_TYPES.AIR && !isFoliageBlock(b2) && b2 !== BLOCK_TYPES.WATER;

        if (solid1 || solid2) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);
    // Reapply bobbing visual offset
    camera.position.add(bobOffset);
}

function updateSelectionBox() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance <= 5.5) {
            const pos = intersect.point.clone();
            pos.add(intersect.face.normal.clone().multiplyScalar(-0.5));
            selectionBox.position.set(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
            selectionBox.visible = true;
            return;
        }
    }
    selectionBox.visible = false;
}

// Game loop clock
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    updateHeldBlock(delta);
    updateStatsHUD();

    renderer.render(scene, camera);
}

animate();

console.log('Enhanced Three.js Minecraft scene initialized successfully');
