import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');
const simplex = new SimplexNoise();

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

const BLOCK_NAMES = {
    [BLOCK_TYPES.GRASS]: 'Grass Block',
    [BLOCK_TYPES.DIRT]: 'Dirt',
    [BLOCK_TYPES.STONE]: 'Stone',
    [BLOCK_TYPES.COBBLESTONE]: 'Cobblestone',
    [BLOCK_TYPES.WOOD]: 'Oak Log',
    [BLOCK_TYPES.PLANKS]: 'Oak Planks',
    [BLOCK_TYPES.LEAVES]: 'Oak Leaves',
    [BLOCK_TYPES.BRICK]: 'Bricks',
    [BLOCK_TYPES.SAND]: 'Sand',
    [BLOCK_TYPES.GLASS]: 'Glass',
    [BLOCK_TYPES.COAL_ORE]: 'Coal Ore',
    [BLOCK_TYPES.IRON_ORE]: 'Iron Ore',
    [BLOCK_TYPES.GOLD_ORE]: 'Gold Ore',
    [BLOCK_TYPES.RED_FLOWER]: 'Poppy',
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
    [BLOCK_TYPES.BRICK]: 0x9b3b2b,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfad64a,
    [BLOCK_TYPES.RED_FLOWER]: 0xdd2c00,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xffd600,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047
};

function isFoliage(blockType) {
    return blockType === BLOCK_TYPES.RED_FLOWER ||
           blockType === BLOCK_TYPES.YELLOW_FLOWER ||
           blockType === BLOCK_TYPES.TALL_GRASS;
}

function isSolid(blockType) {
    return blockType !== BLOCK_TYPES.AIR &&
           blockType !== BLOCK_TYPES.WATER &&
           !isFoliage(blockType);
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

    if (isFoliage(blockType)) {
        // Transparent background for foliage
        ctx.clearRect(0, 0, 16, 16);

        if (blockType === BLOCK_TYPES.RED_FLOWER) {
            // Poppy: green stem with red petal head
            for (let y = 7; y < 16; y++) {
                ctx.fillStyle = '#2e7d32';
                ctx.fillRect(7 + (y % 2 === 0 ? 1 : 0), y, 1, 1);
            }
            // Petals
            ctx.fillStyle = '#b71c1c';
            ctx.fillRect(5, 3, 6, 5);
            ctx.fillStyle = '#f44336';
            ctx.fillRect(6, 4, 4, 3);
            ctx.fillStyle = '#212121';
            ctx.fillRect(7, 5, 2, 1);
        } else if (blockType === BLOCK_TYPES.YELLOW_FLOWER) {
            // Dandelion: yellow blossom with stem
            for (let y = 8; y < 16; y++) {
                ctx.fillStyle = '#388e3c';
                ctx.fillRect(7, y, 1, 1);
            }
            ctx.fillStyle = '#fbc02d';
            ctx.fillRect(5, 4, 6, 5);
            ctx.fillStyle = '#fff176';
            ctx.fillRect(6, 5, 4, 3);
            ctx.fillStyle = '#f57f17';
            ctx.fillRect(7, 6, 2, 1);
        } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
            // Tall grass blades
            for (let x = 2; x < 14; x += 2) {
                const top = 3 + ((x * 7) % 6);
                for (let y = top; y < 16; y++) {
                    const shade = ((x + y) % 3) * 15;
                    ctx.fillStyle = adjustHexColor(0x43a047, shade - 10);
                    ctx.fillRect(x + ((y > 10) ? 0 : (x % 4 === 0 ? -1 : 1)), y, 1, 1);
                }
            }
        }
    } else {
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
            // Horizontal wooden planks with seams and grain
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const plankIndex = Math.floor(y / 4);
                    const isSeam = (y % 4 === 3);
                    const vSeam = ((plankIndex % 2 === 0 && x === 7) || (plankIndex % 2 === 1 && (x === 3 || x === 11)));
                    if (isSeam || vSeam) {
                        ctx.fillStyle = adjustHexColor(color, -40);
                    } else {
                        const grain = textureNoise.noise2D(x * 0.5, y * 2.0);
                        ctx.fillStyle = adjustHexColor(color, grain * 14 - 4);
                    }
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        } else if (blockType === BLOCK_TYPES.BRICK) {
            // Red bricks with mortar lines
            ctx.fillStyle = '#b0bec5'; // Mortar
            ctx.fillRect(0, 0, 16, 16);
            for (let row = 0; row < 4; row++) {
                const y = row * 4;
                const offset = (row % 2 === 0) ? 0 : 4;
                for (let col = 0; col < 3; col++) {
                    const x = ((col * 8 + offset) % 16);
                    ctx.fillStyle = adjustHexColor(color, ((row + col) % 2 === 0 ? 12 : -12));
                    ctx.fillRect(x, y, 7, 3);
                    // Slight brick shading
                    ctx.fillStyle = 'rgba(0,0,0,0.15)';
                    ctx.fillRect(x, y + 2, 7, 1);
                }
            }
        } else if (blockType === BLOCK_TYPES.COAL_ORE || blockType === BLOCK_TYPES.IRON_ORE || blockType === BLOCK_TYPES.GOLD_ORE) {
            // Stone base with colored mineral specks
            ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
            ctx.fillRect(0, 0, 16, 16);
            for (let y = 0; y < 16; y += 4) {
                ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], y % 8 === 0 ? 10 : -8);
                ctx.fillRect(0, y, 16, 2);
            }
            const speckColor = blockType === BLOCK_TYPES.COAL_ORE ? '#222222' :
                               blockType === BLOCK_TYPES.IRON_ORE ? '#d1a890' : '#ffe082';
            const highlightColor = blockType === BLOCK_TYPES.COAL_ORE ? '#444444' :
                                   blockType === BLOCK_TYPES.IRON_ORE ? '#f2d5c4' : '#fff9c4';
            const fleckCoords = [
                [3, 3], [4, 3], [3, 4],
                [10, 4], [11, 4], [10, 5],
                [6, 9], [7, 9], [7, 10],
                [12, 11], [13, 11], [13, 12],
                [4, 12], [5, 12]
            ];
            fleckCoords.forEach(([fx, fy], idx) => {
                ctx.fillStyle = (idx % 3 === 0) ? highlightColor : speckColor;
                ctx.fillRect(fx, fy, 1, 1);
            });
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

        if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS &&
            blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES &&
            blockType !== BLOCK_TYPES.PLANKS && blockType !== BLOCK_TYPES.BRICK) {
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

// Pre-create shared foliage billboard geometry (crossed double-planes)
function createFoliageGeometry() {
    const p1 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    p1.rotateY(Math.PI / 4);
    const p2 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    p2.rotateY(-Math.PI / 4);

    const pos1 = p1.attributes.position.array;
    const pos2 = p2.attributes.position.array;
    const mergedPos = new Float32Array(pos1.length + pos2.length);
    mergedPos.set(pos1, 0);
    mergedPos.set(pos2, pos1.length);

    const uv1 = p1.attributes.uv.array;
    const uv2 = p2.attributes.uv.array;
    const mergedUV = new Float32Array(uv1.length + uv2.length);
    mergedUV.set(uv1, 0);
    mergedUV.set(uv2, uv1.length);

    const foliageGeo = new THREE.BufferGeometry();
    foliageGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    foliageGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUV, 2));
    foliageGeo.computeVertexNormals();
    foliageGeo.translate(0.5, 0.5, 0.5);
    return foliageGeo;
}

const foliageGeometry = createFoliageGeometry();

// Pre-create held block materials
const HELD_BLOCK_MATERIALS = {};
Object.keys(BLOCK_COLORS).forEach(typeStr => {
    const type = Number(typeStr);
    HELD_BLOCK_MATERIALS[type] = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[type],
        transparent: type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.WATER || isFoliage(type),
        opacity: type === BLOCK_TYPES.GLASS ? 0.6 : (type === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: (type === BLOCK_TYPES.LEAVES || isFoliage(type)) ? 0.5 : 0,
        side: (type === BLOCK_TYPES.LEAVES || isFoliage(type)) ? THREE.DoubleSide : THREE.FrontSide
    });
});

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT + 2, CHUNK_SIZE / 2);
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
    } else if (action === 'footstep') {
        createOscillatorSound(100 + Math.random() * 40, 0.05, 'triangle', 0.02, 0.002);
    } else if (action === 'splash') {
        createOscillatorSound(180, 0.15, 'sine', 0.06, 0.01);
        createOscillatorSound(320, 0.12, 'triangle', 0.03, 0.01);
    } else if (action === 'click') {
        createOscillatorSound(600, 0.03, 'sine', 0.03, 0.001);
    }
}

// Day / Night & Celestial setup
const DAY_DURATION = 24000;
let gameTime = 6000;

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

// Sun & Moon 3D Meshes
const sunMesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff0aa })
);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
    new THREE.BoxGeometry(8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xddddff })
);
scene.add(moonMesh);

// Stars
const starCount = 300;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 180;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 10;
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Procedural Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65
});
for (let i = 0; i < 24; i++) {
    const w = 15 + Math.random() * 25;
    const d = 15 + Math.random() * 25;
    const h = 3 + Math.random() * 2;
    const cloudBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloudMaterial);
    cloudBox.position.set(
        (Math.random() - 0.5) * 260,
        24,
        (Math.random() - 0.5) * 260
    );
    cloudsGroup.add(cloudBox);
}
scene.add(cloudsGroup);

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    let skyColor, lightIntensity, starOpacity;

    if (gameTime < 2000) { // Sunrise
        const t = gameTime / 2000;
        skyColor = new THREE.Color(0xffad60).lerp(new THREE.Color(0x87CEEB), t);
        lightIntensity = 0.4 + t * 0.4;
        starOpacity = Math.max(0, 1 - t * 2);
    } else if (gameTime < 10000) { // Day
        skyColor = new THREE.Color(0x87CEEB);
        lightIntensity = 0.8;
        starOpacity = 0;
    } else if (gameTime < 12000) { // Sunset
        const t = (gameTime - 10000) / 2000;
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0xff7043), t);
        lightIntensity = 0.8 - t * 0.4;
        starOpacity = 0;
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
        starOpacity = t;
    } else if (gameTime < 22000) { // Night
        skyColor = new THREE.Color(0x0a0a1a);
        lightIntensity = 0.1;
        starOpacity = 1;
    } else { // Pre-dawn
        const t = (gameTime - 22000) / 2000;
        skyColor = new THREE.Color(0x0a0a1a).lerp(new THREE.Color(0xffad60), t);
        lightIntensity = 0.1 + t * 0.3;
        starOpacity = 1 - t * 0.5;
    }

    starMaterial.opacity = starOpacity;
    stars.position.copy(camera.position);

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const orbitDistance = 140;
    const sunX = camera.position.x + Math.cos(sunAngle) * orbitDistance;
    const sunY = camera.position.y + Math.sin(sunAngle) * orbitDistance;
    const sunZ = camera.position.z + 40;

    sunMesh.position.set(sunX, sunY, sunZ);
    moonMesh.position.set(
        camera.position.x - Math.cos(sunAngle) * orbitDistance,
        camera.position.y - Math.sin(sunAngle) * orbitDistance,
        camera.position.z - 40
    );

    directionalLight.position.set(sunX, sunY, sunZ);

    // Drifting clouds
    cloudsGroup.children.forEach(cloud => {
        cloud.position.x += 0.02;
        if (cloud.position.x > camera.position.x + 140) {
            cloud.position.x = camera.position.x - 140;
        }
    });

    // Check underwater state
    const blockAtEye = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    const isUnderwater = (blockAtEye === BLOCK_TYPES.WATER);
    const underwaterOverlay = document.getElementById('underwater-overlay');

    if (isUnderwater) {
        scene.background.set(0x0a3d62);
        scene.fog.color.set(0x0a3d62);
        scene.fog.near = 0.5;
        scene.fog.far = 12;
        directionalLight.intensity = lightIntensity * 0.4;
        ambientLight.intensity = 0.3;
        if (underwaterOverlay) underwaterOverlay.style.display = 'block';
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
        directionalLight.intensity = lightIntensity;
        ambientLight.intensity = lightIntensity * 0.6 + 0.1;
        if (underwaterOverlay) underwaterOverlay.style.display = 'none';
    }
}

// First-Person Held Block
const heldBlockGroup = new THREE.Group();
const heldBlockMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    HELD_BLOCK_MATERIALS[BLOCK_TYPES.STONE]
);
heldBlockMesh.position.set(0.48, -0.38, -0.6);
heldBlockMesh.rotation.set(0.3, -0.6, 0.2);
heldBlockGroup.add(heldBlockMesh);
camera.add(heldBlockGroup);
scene.add(camera);

let isSwinging = false;
let swingProgress = 0;

function triggerSwing() {
    isSwinging = true;
    swingProgress = 0;
}

function updateHeldBlock() {
    heldBlockMesh.material = HELD_BLOCK_MATERIALS[selectedBlock] || HELD_BLOCK_MATERIALS[BLOCK_TYPES.STONE];

    if (isSwinging) {
        swingProgress += 0.16;
        if (swingProgress >= Math.PI) {
            isSwinging = false;
            swingProgress = 0;
            heldBlockMesh.position.set(0.48, -0.38, -0.6);
            heldBlockMesh.rotation.set(0.3, -0.6, 0.2);
        } else {
            const swingSin = Math.sin(swingProgress);
            heldBlockMesh.position.set(
                0.48 - swingSin * 0.14,
                -0.38 + swingSin * 0.1,
                -0.6 + swingSin * 0.15
            );
            heldBlockMesh.rotation.set(
                0.3 - swingSin * 0.8,
                -0.6 + swingSin * 0.4,
                0.2 - swingSin * 0.5
            );
        }
    }
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
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.22, (y + worldZ + 50) * 0.22);
                    const goldNoise = simplex.noise2D((worldX + 100) * 0.25, (y + worldZ + 100) * 0.25);

                    if (goldNoise > 0.72 && y < 6) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (ironNoise > 0.65) {
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

            // Surface vegetation on grass
            if (!isBeach && height > 6 && height < CHUNK_HEIGHT - 1) {
                const vegNoise = simplex.noise2D((worldX + 200) * 0.3, (worldZ + 200) * 0.3);
                if (vegNoise > 0.65) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (vegNoise < -0.65) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                } else if (vegNoise > 0.4 && vegNoise <= 0.65) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                }
            }

            // Trees
            if (!isBeach && height > 6 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8) {
                    // Clear vegetation under trunk
                    chunk.setBlock(x, height, z, BLOCK_TYPES.AIR);
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
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS ||
           type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER ||
           isFoliage(type);
}

const standardBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
standardBoxGeometry.translate(0.5, 0.5, 0.5); // Align mesh with grid

function createChunkMesh(chunk) {
    const instancedMeshes = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk.getBlock(x, y, z);
                if (blockType !== BLOCK_TYPES.AIR) {
                    const isFol = isFoliage(blockType);
                    let isVisible = false;

                    if (isFol) {
                        isVisible = true; // Foliage is always rendered if present
                    } else {
                        // Face culling: only add if at least one neighbor face is transparent
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
        const isFol = isFoliage(blockType);
        const geo = isFol ? foliageGeometry : standardBoxGeometry;
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || isFol,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || isFol) ? 0.5 : 0,
            side: (blockType === BLOCK_TYPES.LEAVES || isFol) ? THREE.DoubleSide : THREE.FrontSide
        });
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
let selectedSlotIndex = 0;

// Stats tracking
let blocksBroken = 0;
let blocksPlaced = 0;

const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.PLANKS,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.SAND,
    BLOCK_TYPES.GLASS,
    BLOCK_TYPES.COAL_ORE,
    BLOCK_TYPES.IRON_ORE,
    BLOCK_TYPES.GOLD_ORE,
    BLOCK_TYPES.RED_FLOWER,
    BLOCK_TYPES.YELLOW_FLOWER,
    BLOCK_TYPES.TALL_GRASS
];
let selectedBlock = inventoryBlocks[0];

const inventoryUI = document.getElementById('inventory');
inventoryUI.innerHTML = '';

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.title = BLOCK_NAMES[type] || 'Block';

    const canvas = BLOCK_CANVASES[type];
    if (canvas) {
        slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
        slot.style.backgroundSize = 'contain';
        slot.style.backgroundPosition = 'center';
        slot.style.backgroundRepeat = 'no-repeat';
        slot.style.imageRendering = 'pixelated';
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }

    // Number hotkey label (1 to 9 for the first 9 slots)
    if (index < 9) {
        const slotNum = document.createElement('span');
        slotNum.className = 'slot-key';
        slotNum.textContent = index + 1;
        slot.appendChild(slotNum);
    }

    if (index === selectedSlotIndex) slot.classList.add('selected');

    slot.onclick = () => {
        selectSlot(index);
    };

    inventoryUI.appendChild(slot);
});

function selectSlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedSlotIndex = index;
    selectedBlock = inventoryBlocks[index];

    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach((s, idx) => {
        if (idx === selectedSlotIndex) {
            s.classList.add('selected');
        } else {
            s.classList.remove('selected');
        }
    });

    playSound('click');
}

// Mouse wheel slot selection
window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
        selectSlot((selectedSlotIndex + 1) % inventoryBlocks.length);
    } else if (e.deltaY < 0) {
        selectSlot((selectedSlotIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length);
    }
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

    // Hotbar keys 1-9
    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= 9 && digit <= inventoryBlocks.length) {
            selectSlot(digit - 1);
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
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

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
                triggerSwing();
                blocksBroken++;
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            // Don't place solid block where player stands
            const playerFeetY = camera.position.y - currentPlayerHeight;
            const px = Math.floor(camera.position.x);
            const pz = Math.floor(camera.position.z);
            if (isSolid(selectedBlock) && px === x && pz === z &&
                (Math.floor(playerFeetY) === y || Math.floor(playerFeetY + 1) === y)) {
                return;
            }

            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            triggerSwing();
            blocksPlaced++;
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

// View bobbing & footstep timer
let bobTimer = 0;
let stepTimer = 0;
const bobOffset = new THREE.Vector3();

function handleMovement() {
    isSprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
    isCrouching = Boolean(keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']);

    let speed = BASE_MOVE_SPEED;
    if (isSprinting) speed *= 1.55;
    if (isCrouching) speed *= 0.55;

    // Dynamic FOV interpolation
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

    const blockAtFeet = getBlockAt(camera.position.x, camera.position.y - currentPlayerHeight, camera.position.z);
    const inWater = (blockAtFeet === BLOCK_TYPES.WATER);

    if (inWater) {
        // Swimming movement
        if (keys['Space']) {
            playerVelocity.y = 0.08;
        }
    } else if (keys['Space'] && isGrounded && !isCrouching) {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSound('jump');
    }

    // Footstep audio timing
    if (isMoving && isGrounded && !inWater) {
        stepTimer += isSprinting ? 0.09 : 0.055;
        if (stepTimer >= Math.PI) {
            stepTimer = 0;
            playSound('footstep');
        }
    } else {
        stepTimer = 0;
    }
}

function updatePhysics() {
    // Crouch height interpolation
    const targetHeight = isCrouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    const blockAtFeet = getBlockAt(camera.position.x, camera.position.y - currentPlayerHeight, camera.position.z);
    const inWater = (blockAtFeet === BLOCK_TYPES.WATER);

    if (inWater) {
        playerVelocity.y = Math.max(playerVelocity.y + GRAVITY * 0.2, -0.05);
        playerVelocity.x *= 0.85;
        playerVelocity.z *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Vertical collision detection
    const groundBlock = getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z);
    if (isSolid(groundBlock)) {
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
        if (isSolid(getBlockAt(checkX, playerFeetY, camera.position.z)) ||
            isSolid(getBlockAt(checkX, playerFeetY + 1, camera.position.z))) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (isSolid(getBlockAt(camera.position.x, playerFeetY, checkZ)) ||
            isSolid(getBlockAt(camera.position.x, playerFeetY + 1, checkZ))) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);
}

// Head bobbing application
function applyViewBobbing() {
    const isMoving = (Math.abs(playerVelocity.x) > 0.01 || Math.abs(playerVelocity.z) > 0.01);

    if (isMoving && isGrounded) {
        const bobFrequency = isSprinting ? 14 : 9;
        bobTimer += 0.05;
        const targetX = Math.cos(bobTimer * bobFrequency * 0.5) * 0.025;
        const targetY = Math.sin(bobTimer * bobFrequency) * 0.035;
        bobOffset.x += (targetX - bobOffset.x) * 0.2;
        bobOffset.y += (targetY - bobOffset.y) * 0.2;
    } else {
        bobOffset.x += (0 - bobOffset.x) * 0.15;
        bobOffset.y += (0 - bobOffset.y) * 0.15;
        if (!isMoving) bobTimer = 0;
    }
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

// Stats HUD
const statsHUD = document.getElementById('stats-hud');
function updateStatsHUD() {
    if (!statsHUD) return;
    const hours = Math.floor((gameTime / DAY_DURATION) * 24);
    const minutes = Math.floor(((gameTime / DAY_DURATION) * 24 * 60) % 60);
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const period = (gameTime >= 2000 && gameTime < 12000) ? 'Day' : (gameTime >= 14000 && gameTime < 22000) ? 'Night' : 'Twilight';

    statsHUD.innerHTML = `
        <div class="hud-item"><strong>XYZ:</strong> ${camera.position.x.toFixed(1)} / ${camera.position.y.toFixed(1)} / ${camera.position.z.toFixed(1)}</div>
        <div class="hud-item"><strong>Time:</strong> ${timeFormatted} (${period})</div>
        <div class="hud-item"><strong>Broken:</strong> ${blocksBroken} | <strong>Placed:</strong> ${blocksPlaced}</div>
    `;
}

// Basic game loop
function animate() {
    requestAnimationFrame(animate);

    // Reset visual bobbing before physics update
    camera.position.x -= bobOffset.x;
    camera.position.y -= bobOffset.y;

    handleMovement();
    updatePhysics();

    // Reapply visual bobbing after physics
    applyViewBobbing();
    camera.position.x += bobOffset.x;
    camera.position.y += bobOffset.y;

    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    updateHeldBlock();
    updateStatsHUD();

    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized');
