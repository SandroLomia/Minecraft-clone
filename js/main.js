import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0';

const textureNoise = new SimplexNoise('texture-seed');

// Game constants
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const RENDER_DISTANCE = 3;

const PLAYER_HEIGHT_STANDING = 1.8;
const PLAYER_HEIGHT_CROUCHING = 1.4;
let currentPlayerHeight = PLAYER_HEIGHT_STANDING;
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
    [BLOCK_TYPES.IRON_ORE]: 0xd7ccc8,
    [BLOCK_TYPES.BRICK]: 0xb71c1c,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfdd835,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047
};

function isFoliage(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliage(type);
}

function isNonSolid(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.WATER || isFoliage(type);
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
            const rx = Math.floor(Math.random() * 12) + 2;
            const ry = Math.floor(Math.random() * 12) + 2;
            ctx.fillStyle = '#222222';
            ctx.fillRect(rx, ry, Math.random() * 3 + 1, Math.random() * 3 + 1);
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        for (let i = 0; i < 6; i++) {
            const rx = Math.floor(Math.random() * 12) + 2;
            const ry = Math.floor(Math.random() * 12) + 2;
            ctx.fillStyle = '#d7ccc8';
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
        ctx.fillStyle = adjustHexColor(color, 0);
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#cccccc';
        for (let y = 4; y < 16; y += 4) {
            ctx.fillRect(0, y, 16, 1);
        }
        for (let x = 4; x < 16; x += 8) {
            ctx.fillRect(x, 0, 1, 4);
            ctx.fillRect(x + 4, 4, 1, 4);
            ctx.fillRect(x, 8, 1, 4);
            ctx.fillRect(x + 4, 12, 1, 4);
        }
    } else if (blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillRect(5, 10, 2, 2);
        ctx.fillRect(9, 8, 2, 2);
        ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#e53935' : '#fdd835';
        ctx.fillRect(5, 2, 6, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7, 4, 2, 2);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#43a047';
        for (let i = 0; i < 5; i++) {
            const gx = 2 + i * 3;
            const gh = 8 + Math.floor(Math.random() * 6);
            ctx.fillRect(gx, 16 - gh, 2, gh);
        }
    }

    if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND &&
        blockType !== BLOCK_TYPES.LEAVES && !isFoliage(blockType)) {
        for (let i = 0; i < 80; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const opacity = Math.random() * 0.22;
            ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (!isFoliage(blockType) && blockType !== BLOCK_TYPES.GLASS) {
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

// Create billboard geometry for foliage
const foliageGeometry = (() => {
    const p1 = new THREE.PlaneGeometry(0.85, 0.85);
    p1.rotateY(Math.PI / 4);
    const p2 = new THREE.PlaneGeometry(0.85, 0.85);
    p2.rotateY(-Math.PI / 4);

    const g1 = p1.toNonIndexed();
    const g2 = p2.toNonIndexed();

    const pos1 = g1.attributes.position.array;
    const pos2 = g2.attributes.position.array;
    const uv1 = g1.attributes.uv.array;
    const uv2 = g2.attributes.uv.array;

    const mergedPos = new Float32Array(pos1.length + pos2.length);
    mergedPos.set(pos1, 0);
    mergedPos.set(pos2, pos1.length);

    const mergedUv = new Float32Array(uv1.length + uv2.length);
    mergedUv.set(uv1, 0);
    mergedUv.set(uv2, uv1.length);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
    geo.translate(0.5, 0.425, 0.5);
    return geo;
})();

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// First-Person Held Block
const heldBlockGroup = new THREE.Group();
camera.add(heldBlockGroup);
scene.add(camera);
heldBlockGroup.position.set(0.4, -0.35, -0.65);

let heldMesh = null;
let swingAnimation = 0;

function updateHeldBlock(type) {
    if (heldMesh) {
        heldBlockGroup.remove(heldMesh);
        heldMesh.geometry.dispose();
    }
    const isPlant = isFoliage(type);
    const geo = isPlant ? foliageGeometry.clone() : new THREE.BoxGeometry(0.35, 0.35, 0.35);
    if (isPlant) {
        geo.scale(0.5, 0.5, 0.5);
    }
    const mat = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[type],
        transparent: isPlant || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.WATER || type === BLOCK_TYPES.LEAVES,
        opacity: type === BLOCK_TYPES.GLASS ? 0.6 : (type === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: isPlant || type === BLOCK_TYPES.LEAVES ? 0.5 : 0,
        side: isPlant || type === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
    });
    heldMesh = new THREE.Mesh(geo, mat);
    heldMesh.rotation.set(0.2, -0.4, 0);
    heldBlockGroup.add(heldMesh);
}

// Celestial Objects & Environment
const sunMesh = new THREE.Mesh(
    new THREE.BoxGeometry(8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff59d })
);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xe0e0e0 })
);
scene.add(moonMesh);

// Starfield
const starsGeometry = new THREE.BufferGeometry();
const starPositions = [];
for (let i = 0; i < 400; i++) {
    const x = (Math.random() - 0.5) * 400;
    const y = Math.random() * 200 + 10;
    const z = (Math.random() - 0.5) * 400;
    starPositions.push(x, y, z);
}
starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
const starfield = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starfield);

// Clouds
const cloudsGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
for (let i = 0; i < 12; i++) {
    const cloudCluster = new THREE.Group();
    const width = Math.floor(Math.random() * 3) + 2;
    for (let cx = 0; cx < width; cx++) {
        for (let cz = 0; cz < 2; cz++) {
            const cloudMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 8), cloudMaterial);
            cloudMesh.position.set(cx * 6, 0, cz * 6);
            cloudCluster.add(cloudMesh);
        }
    }
    cloudCluster.position.set((Math.random() - 0.5) * 300, 22, (Math.random() - 0.5) * 300);
    cloudsGroup.add(cloudCluster);
}
scene.add(cloudsGroup);

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
        createOscillatorSound(480, 0.04, 'sine', 0.03, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(110, 0.18, 'sine', 0.06, 0.01);
    } else if (action === 'footstep') {
        createOscillatorSound(80 + Math.random() * 30, 0.04, 'triangle', 0.02, 0.002);
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;
let isUnderwater = false;
const underwaterOverlay = document.getElementById('underwater-overlay');

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    const distance = 160;

    sunMesh.position.set(
        camera.position.x + Math.cos(sunAngle) * distance,
        camera.position.y + Math.sin(sunAngle) * distance,
        camera.position.z + 40
    );

    moonMesh.position.set(
        camera.position.x - Math.cos(sunAngle) * distance,
        camera.position.y - Math.sin(sunAngle) * distance,
        camera.position.z - 40
    );

    starfield.position.copy(camera.position);
    cloudsGroup.position.x += 0.02;

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
        starOpacity = t * 0.4;
    } else if (gameTime < 14000) { // Dusk
        const t = (gameTime - 12000) / 2000;
        skyColor = new THREE.Color(0xff7043).lerp(new THREE.Color(0x0a0a1a), t);
        lightIntensity = 0.4 - t * 0.3;
        starOpacity = 0.4 + t * 0.4;
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

    starsMaterial.opacity = starOpacity;

    // Check camera underwater
    const camBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    if (camBlock === BLOCK_TYPES.WATER) {
        if (!isUnderwater) {
            isUnderwater = true;
            underwaterOverlay.style.display = 'block';
            playSound('splash');
        }
        scene.background.setHex(0x0d47a1);
        scene.fog.color.setHex(0x0d47a1);
        scene.fog.near = 0.5;
        scene.fog.far = 12;
    } else {
        if (isUnderwater) {
            isUnderwater = false;
            underwaterOverlay.style.display = 'none';
        }
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    directionalLight.position.copy(sunMesh.position);
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
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.2, (y + worldZ + 50) * 0.2);
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

            // Trees and Foliage
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
                } else {
                    // Foliage (Flowers & Tall Grass)
                    const plantNoise = textureNoise.noise2D(worldX * 0.8 + 100, worldZ * 0.8 + 100);
                    if (plantNoise > 0.75) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                    } else if (plantNoise > 0.68) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                    } else if (plantNoise > 0.62) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
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
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    cubeGeometry.translate(0.5, 0.5, 0.5); // Align mesh with grid

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
        const plant = isFoliage(blockType);
        const geo = plant ? foliageGeometry : cubeGeometry;
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: plant || blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: plant || blockType === BLOCK_TYPES.LEAVES ? 0.5 : 0,
            side: plant || blockType === BLOCK_TYPES.LEAVES ? THREE.DoubleSide : THREE.FrontSide
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

    createdChunks.forEach(([cx, cz]) => {
        const chunk = chunks.get(getChunkKey(cx, cz));
        if (chunk) createChunkMesh(chunk);
    });

    for (const [key, chunk] of chunks.entries()) {
        if (!requiredChunkKeys.has(key)) {
            if (chunk.mesh) scene.remove(chunk.mesh);
            chunks.delete(key);
        }
    }
}

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
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.GLASS,
    BLOCK_TYPES.IRON_ORE
];

function selectInventorySlot(index) {
    if (index >= 0 && index < inventoryBlocks.length) {
        selectedBlock = inventoryBlocks[index];
        document.querySelectorAll('.inventory-slot').forEach((s, idx) => {
            if (idx === index) s.classList.add('selected');
            else s.classList.remove('selected');
        });
        updateHeldBlock(selectedBlock);
        playSound('click');
    }
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    if (type === selectedBlock) slot.classList.add('selected');

    const keyLabel = document.createElement('span');
    keyLabel.className = 'slot-key';
    keyLabel.textContent = `${index + 1}`;
    slot.appendChild(keyLabel);

    if (BLOCK_CANVASES[type]) {
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 16;
        iconCanvas.height = 16;
        const ctx = iconCanvas.getContext('2d');
        ctx.drawImage(BLOCK_CANVASES[type], 0, 0);
        slot.appendChild(iconCanvas);
    }

    slot.onclick = () => {
        selectInventorySlot(index);
    };

    inventoryUI.appendChild(slot);
});

updateHeldBlock(selectedBlock);

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
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const slotIndex = parseInt(e.code.replace('Digit', '')) - 1;
        selectInventorySlot(slotIndex);
    }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('wheel', (e) => {
    if (!controls.isLocked) return;
    const currentIndex = inventoryBlocks.indexOf(selectedBlock);
    let nextIndex = currentIndex;
    if (e.deltaY > 0) {
        nextIndex = (currentIndex + 1) % inventoryBlocks.length;
    } else if (e.deltaY < 0) {
        nextIndex = (currentIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length;
    }
    selectInventorySlot(nextIndex);
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
                swingAnimation = 1.0;
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            // Check player collision footprint
            const playerPos = camera.position.clone();
            const minX = playerPos.x - PLAYER_RADIUS;
            const maxX = playerPos.x + PLAYER_RADIUS;
            const minZ = playerPos.z - PLAYER_RADIUS;
            const maxZ = playerPos.z + PLAYER_RADIUS;
            const minY = playerPos.y - currentPlayerHeight;
            const maxY = playerPos.y;

            if (x >= Math.floor(minX) && x <= Math.floor(maxX) &&
                z >= Math.floor(minZ) && z <= Math.floor(maxZ) &&
                y >= Math.floor(minY) && y < Math.ceil(maxY)) {
                return;
            }

            updateBlock(x, y, z, selectedBlock);
            playSound('place');
            swingAnimation = 1.0;
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
let isSprinting = false;
let isCrouching = false;

function handleMovement() {
    isSprinting = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    isCrouching = !!(keys['ControlLeft'] || keys['ControlRight']);

    const targetHeight = isCrouching ? PLAYER_HEIGHT_CROUCHING : PLAYER_HEIGHT_STANDING;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.15;

    let moveSpeed = BASE_MOVE_SPEED;
    let targetFov = 75;

    if (isSprinting && !isCrouching) {
        moveSpeed *= 1.5;
        targetFov = 85;
    } else if (isCrouching) {
        moveSpeed *= 0.5;
        targetFov = 70;
    }

    if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * 0.1;
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

    direction
        .normalize()
        .multiplyScalar(moveSpeed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    const inWater = getBlockAt(camera.position.x, camera.position.y - currentPlayerHeight + 0.2, camera.position.z) === BLOCK_TYPES.WATER;

    if (keys['Space']) {
        if (inWater) {
            playerVelocity.y = 0.08;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }

    if (isGrounded && (direction.x !== 0 || direction.z !== 0)) {
        footstepTimer += isSprinting ? 0.3 : 0.2;
        if (footstepTimer > Math.PI * 2) {
            footstepTimer = 0;
            playSound('footstep');
        }
    } else if (!isGrounded && direction.x === 0 && direction.z === 0) {
        footstepTimer = 0;
    }
}

let bobTimer = 0;
let visualBobOffset = 0;

function updatePhysics() {
    // Subtract previous bobbing offset before running physics
    camera.position.y -= visualBobOffset;

    const playerFootY = camera.position.y - currentPlayerHeight + 0.2;
    const inWater = getBlockAt(camera.position.x, playerFootY, camera.position.z) === BLOCK_TYPES.WATER;

    if (inWater) {
        playerVelocity.y += GRAVITY * 0.2;
        playerVelocity.x *= 0.85;
        playerVelocity.z *= 0.85;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Dynamic ground collision based on height
    const blockBelow = getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z);
    if (!isNonSolid(blockBelow)) {
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
        if (!isNonSolid(getBlockAt(checkX, playerY, camera.position.z)) ||
            !isNonSolid(getBlockAt(checkX, playerY + 1, camera.position.z))) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (!isNonSolid(getBlockAt(camera.position.x, playerY, checkZ)) ||
            !isNonSolid(getBlockAt(camera.position.x, playerY + 1, checkZ))) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);

    // View bobbing calculation
    const speed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z);
    if (isGrounded && speed > 0.01) {
        bobTimer += speed * 2.5;
        visualBobOffset = Math.sin(bobTimer) * 0.05;
    } else {
        bobTimer = 0;
        visualBobOffset = visualBobOffset * 0.8;
    }
    camera.position.y += visualBobOffset;
}

function updateHeldBlockAnimation() {
    if (!heldMesh) return;

    if (swingAnimation > 0) {
        swingAnimation -= 0.1;
        if (swingAnimation < 0) swingAnimation = 0;
        const swing = Math.sin(swingAnimation * Math.PI);
        heldMesh.rotation.x = 0.2 - swing * 0.6;
        heldMesh.rotation.y = -0.4 + swing * 0.4;
        heldMesh.position.z = -0.1 * swing;
    } else {
        heldMesh.rotation.set(0.2, -0.4, 0);
        heldMesh.position.set(0, 0, 0);
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

// Basic game loop
function animate() {
    requestAnimationFrame(animate);
    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    updateHeldBlockAnimation();
    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized with enhanced features');
