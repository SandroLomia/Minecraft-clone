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
    RED_FLOWER: 11,
    YELLOW_FLOWER: 12,
    TALL_GRASS: 13
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
    [BLOCK_TYPES.RED_FLOWER]: 0xf44336,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xffeb3b,
    [BLOCK_TYPES.TALL_GRASS]: 0x357a38
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
    } else if (blockType === BLOCK_TYPES.RED_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        // Draw stem
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillRect(5, 8, 2, 2);
        // Draw petals
        ctx.fillStyle = adjustHexColor(color, 0);
        ctx.fillRect(6, 3, 4, 3);
        ctx.fillRect(5, 4, 6, 1);
        ctx.fillStyle = '#ffeb3b'; // Yellow center
        ctx.fillRect(7, 4, 2, 1);
    } else if (blockType === BLOCK_TYPES.YELLOW_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        // Draw stem
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 6, 2, 10);
        ctx.fillRect(9, 9, 2, 2);
        // Draw petals
        ctx.fillStyle = adjustHexColor(color, 0);
        ctx.fillRect(6, 3, 4, 3);
        ctx.fillRect(5, 4, 6, 1);
        ctx.fillStyle = '#ff5722'; // Orange center
        ctx.fillRect(7, 4, 2, 1);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = adjustHexColor(color, 0);
        // Draw several blades of grass
        for (let i = 0; i < 5; i++) {
            const h = 8 + Math.floor(Math.random() * 6);
            const x = 2 + i * 3;
            ctx.fillStyle = adjustHexColor(color, (i % 2 === 0 ? 10 : -10));
            ctx.fillRect(x, 16 - h, 2, h);
            // Blade tip curves
            if (i % 2 === 0 && x > 2) {
                ctx.fillRect(x - 1, 16 - h, 1, 2);
            } else if (x < 14) {
                ctx.fillRect(x + 2, 16 - h, 1, 2);
            }
        }
    }

    if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES &&
        blockType !== BLOCK_TYPES.RED_FLOWER && blockType !== BLOCK_TYPES.YELLOW_FLOWER && blockType !== BLOCK_TYPES.TALL_GRASS) {
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

// Helper to create crossed plane geometries for foliage billboards
function createCrossedPlaneGeometry() {
    // We create two PlaneGeometries, rotate them, and merge them manually.
    // This allows them to render as double sided crossed planes.
    const p1 = new THREE.PlaneGeometry(1, 1);
    p1.translate(0, 0.5, 0); // align bottom with y=0
    p1.rotateY(Math.PI / 4);

    const p2 = new THREE.PlaneGeometry(1, 1);
    p2.translate(0, 0.5, 0);
    p2.rotateY(-Math.PI / 4);

    // Convert both to non-indexed to merge cleanly
    const g1 = p1.toNonIndexed();
    const g2 = p2.toNonIndexed();

    const posAttr1 = g1.attributes.position;
    const posAttr2 = g2.attributes.position;
    const uvAttr1 = g1.attributes.uv;
    const uvAttr2 = g2.attributes.uv;

    const count1 = posAttr1.count;
    const count2 = posAttr2.count;
    const totalCount = count1 + count2;

    const positions = new Float32Array(totalCount * 3);
    const uvs = new Float32Array(totalCount * 2);

    for (let i = 0; i < count1; i++) {
        positions[i * 3] = posAttr1.getX(i);
        positions[i * 3 + 1] = posAttr1.getY(i);
        positions[i * 3 + 2] = posAttr1.getZ(i);

        uvs[i * 2] = uvAttr1.getX(i);
        uvs[i * 2 + 1] = uvAttr1.getY(i);
    }

    for (let i = 0; i < count2; i++) {
        const idx = count1 + i;
        positions[idx * 3] = posAttr2.getX(i);
        positions[idx * 3 + 1] = posAttr2.getY(i);
        positions[idx * 3 + 2] = posAttr2.getZ(i);

        uvs[idx * 2] = uvAttr2.getX(i);
        uvs[idx * 2 + 1] = uvAttr2.getY(i);
    }

    const mergedGeometry = new THREE.BufferGeometry();
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Calculate normals
    mergedGeometry.computeVertexNormals();

    p1.dispose();
    p2.dispose();
    g1.dispose();
    g2.dispose();

    return mergedGeometry;
}

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
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
        createOscillatorSound(600, 0.04, 'sine', 0.04, 0.002);
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;

function checkCameraInWater() {
    // Camera is strictly at camera.position
    return getBlockAt(camera.position.x, camera.position.y, camera.position.z) === BLOCK_TYPES.WATER;
}

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

    const cameraSubmerged = checkCameraInWater();
    const waterOverlay = document.getElementById('underwater-overlay');

    if (cameraSubmerged) {
        const waterColor = new THREE.Color(0x0d47a1);
        scene.background.copy(waterColor);
        scene.fog.color.copy(waterColor);
        scene.fog.near = 0.1;
        scene.fog.far = 15; // Thick underwater fog
        if (waterOverlay) waterOverlay.style.display = 'block';
    } else {
        scene.background.copy(skyColor);
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
        if (waterOverlay) waterOverlay.style.display = 'none';
    }

    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
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

// Procedural Clouds System
const cloudsGroup = new THREE.Group();
scene.add(cloudsGroup);

const clouds = [];
const cloudGeometry = new THREE.BoxGeometry(10, 2, 8);
const cloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    roughness: 0.9
});

function createClouds() {
    // Generate an initial cluster of moving clouds
    for (let i = 0; i < 15; i++) {
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        // Random placement over a reasonably sized area centered near spawning point
        resetCloudPosition(cloudMesh);
        // Randomize initial x position so they don't all start on the edge
        cloudMesh.position.x = (Math.random() - 0.5) * 300;

        cloudsGroup.add(cloudMesh);
        clouds.push(cloudMesh);
    }
}

function resetCloudPosition(cloudMesh) {
    cloudMesh.position.set(
        -150 - Math.random() * 50, // start far left
        22 + (Math.random() - 0.5) * 2, // y level around 22
        (Math.random() - 0.5) * 300 // random depth z
    );
    // Give varying sizes to look natural
    const scaleX = 0.6 + Math.random() * 1.8;
    const scaleY = 0.5 + Math.random() * 0.8;
    const scaleZ = 0.6 + Math.random() * 1.8;
    cloudMesh.scale.set(scaleX, scaleY, scaleZ);
    // speed variation
    cloudMesh.userData = { speed: 0.05 + Math.random() * 0.08 };
}

function updateClouds() {
    const playerX = camera.position.x;
    const playerZ = camera.position.z;

    clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;

        // Wrap around relative to player so we never run out of clouds
        if (cloud.position.x - playerX > 200) {
            cloud.position.x = playerX - 200;
            cloud.position.z = playerZ + (Math.random() - 0.5) * 350;
        }
    });
}

createClouds();

// Starfield
let starGeometry, starMaterial, starField;

function createStarfield() {
    const starCount = 1000;
    starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        // Distribute stars on a sphere centered around the player's initial/relative position
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 150 + Math.random() * 50; // far away but within rendering limits

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // Keep them above ground/horizon
        positions[i * 3 + 2] = r * Math.cos(phi);

        sizes[i] = 1.0 + Math.random() * 2.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom shader/canvas texture is not needed; a high performance PointsMaterial is perfect
    starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.2,
        transparent: true,
        opacity: 0,
        sizeAttenuation: false
    });

    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

createStarfield();

function updateStarfield() {
    if (!starField) return;

    // Follow the player position in horizontal space
    starField.position.x = camera.position.x;
    starField.position.z = camera.position.z;

    // Fade stars in during night (between 12000 and 22000) and out during daytime
    let targetOpacity = 0;
    if (gameTime >= 13000 && gameTime < 21000) {
        // Fully night
        targetOpacity = 0.85;
    } else if (gameTime >= 11000 && gameTime < 13000) {
        // Sunset fade in
        targetOpacity = ((gameTime - 11000) / 2000) * 0.85;
    } else if (gameTime >= 21000 && gameTime < 23000) {
        // Sunrise fade out
        targetOpacity = (1.0 - (gameTime - 21000) / 2000) * 0.85;
    }

    // Twinkling effect: oscillate star opacity slightly
    const twinkle = Math.sin(Date.now() * 0.005) * 0.15;
    starMaterial.opacity = Math.max(0.0, Math.min(1.0, targetOpacity + twinkle * (targetOpacity > 0 ? 1 : 0)));
}

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
                    chunk.setBlock(x, y, z, coalNoise > 0.6 ? BLOCK_TYPES.COAL_ORE : BLOCK_TYPES.STONE);
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

            // Foliage & Trees
            if (!isBeach && height > 6) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
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
                } else {
                    // Spawn grass or flowers procedurally
                    const foliageNoise = textureNoise.noise2D(worldX * 1.5, worldZ * 1.5);
                    if (foliageNoise > 0.5) {
                        const rand = Math.abs(textureNoise.noise2D(worldX * 5.0, worldZ * 5.0));
                        if (rand < 0.1) {
                            chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                        } else if (rand < 0.2) {
                            chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                        } else {
                            chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
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
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER ||
           type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

function isBlockFoliage(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

const foliageGeometry = createCrossedPlaneGeometry();

function createChunkMesh(chunk) {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    boxGeometry.translate(0.5, 0.5, 0.5); // Align mesh with grid
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
        const isFol = isBlockFoliage(blockType);

        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || isFol,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || isFol) ? 0.5 : 0,
            side: (blockType === BLOCK_TYPES.LEAVES || isFol) ? THREE.DoubleSide : THREE.FrontSide
        });

        const activeGeometry = isFol ? foliageGeometry : boxGeometry;
        const mesh = new THREE.InstancedMesh(activeGeometry, material, matrices.length);
        for (let i = 0; i < matrices.length; i++) {
            mesh.setMatrixAt(i, matrices[i]);
        }
        group.add(mesh);
    }
    chunk.mesh = group;
    scene.add(group);

    // Clean up local boxGeometry to prevent leaks (keep foliageGeometry globally though)
    boxGeometry.dispose();
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

// Advanced movement state variables
let isCrouching = false;
let isSprinting = false;
let currentPlayerHeight = PLAYER_HEIGHT;

// View Bobbing state variables
let bobTimer = 0;
let bobOffset = new THREE.Vector3();

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
    BLOCK_TYPES.COAL_ORE
];

const slots = [];

function selectInventorySlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedBlock = inventoryBlocks[index];

    document.querySelectorAll('.inventory-slot').forEach(s => s.classList.remove('selected'));
    if (slots[index]) {
        slots[index].classList.add('selected');
    }
    playSound('click');
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';

    // Set procedural texture background
    const bgCanvas = BLOCK_CANVASES[type];
    if (bgCanvas) {
        slot.style.backgroundImage = `url(${bgCanvas.toDataURL()})`;
        slot.style.backgroundSize = 'cover';
        slot.style.imageRendering = 'pixelated';
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }

    if (type === selectedBlock) slot.classList.add('selected');

    slot.onclick = () => {
        selectInventorySlot(index);
    };

    inventoryUI.appendChild(slot);
    slots.push(slot);
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
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isSprinting = true;
    }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
        isCrouching = true;
    }

    // Select inventory slot via keyboard digits 1-9
    if (e.code.startsWith('Digit')) {
        const digitVal = parseInt(e.code.charAt(5));
        if (digitVal >= 1 && digitVal <= 9) {
            selectInventorySlot(digitVal - 1);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isSprinting = false;
    }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
        isCrouching = false;
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

// Mouse scroll wheel support for selecting slots
document.addEventListener('wheel', (e) => {
    if (!controls.isLocked) return;

    // Find index of current selected block in hotbar
    let currentIndex = inventoryBlocks.indexOf(selectedBlock);
    if (currentIndex === -1) currentIndex = 0;

    if (e.deltaY > 0) {
        // scroll down -> next slot
        currentIndex = (currentIndex + 1) % inventoryBlocks.length;
    } else if (e.deltaY < 0) {
        // scroll up -> previous slot
        currentIndex = (currentIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length;
    }

    selectInventorySlot(currentIndex);
}, { passive: true });

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

function checkInWater() {
    // Check if player is submerged (either at eye level or lower half)
    const playerFeetY = camera.position.y - currentPlayerHeight;
    const blockFeet = getBlockAt(camera.position.x, playerFeetY + 0.2, camera.position.z);
    const blockEyes = getBlockAt(camera.position.x, camera.position.y - 0.2, camera.position.z);
    return blockFeet === BLOCK_TYPES.WATER || blockEyes === BLOCK_TYPES.WATER;
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

    const inWater = checkInWater();

    // Determine current speed multiplier
    let currentSpeed = MOVE_SPEED;
    if (inWater) {
        currentSpeed *= 0.45; // slowed horizontal movement in water
    } else if (isSprinting && !isCrouching) {
        currentSpeed *= 1.5;
    } else if (isCrouching) {
        currentSpeed *= 0.5;
    }

    direction
        .normalize()
        .multiplyScalar(currentSpeed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    // Swimming / Jumping
    if (keys['Space']) {
        if (inWater) {
            // Swim upwards
            playerVelocity.y = 0.08;
            isGrounded = false;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }

    // Smoothly adjust player height
    const targetHeight = isCrouching ? 1.4 : PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.25;

    // Smooth FOV transitions based on sprinting
    const targetFOV = isSprinting && !isCrouching && (playerVelocity.x !== 0 || playerVelocity.z !== 0) ? 85 : 75;
    camera.fov += (targetFOV - camera.fov) * 0.15;
    camera.updateProjectionMatrix();
}

function updatePhysics() {
    const inWater = checkInWater();

    if (inWater) {
        // Slow gravity and apply drag
        playerVelocity.y += GRAVITY * 0.2;
        // Dampen velocity
        playerVelocity.y *= 0.8;
        playerVelocity.x *= 0.8;
        playerVelocity.z *= 0.8;
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Helper to check if block is solid (non-air, non-foliage, non-water)
    const isSolid = (x, y, z) => {
        const type = getBlockAt(x, y, z);
        return type !== BLOCK_TYPES.AIR && type !== BLOCK_TYPES.WATER && !isBlockFoliage(type);
    };

    // Simple collision detection using current height
    if (isSolid(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z)) {
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions using current height
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (isSolid(checkX, playerY, camera.position.z) ||
            isSolid(checkX, playerY + 1, camera.position.z)) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (isSolid(camera.position.x, playerY, checkZ) ||
            isSolid(camera.position.x, playerY + 1, checkZ)) {
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

// Basic game loop
function animate() {
    requestAnimationFrame(animate);

    // Remove old bobbing offset prior to updates to avoid drift
    camera.position.sub(bobOffset);

    handleMovement();
    updatePhysics();

    // Calculate view bobbing if grounded and moving
    const isMoving = playerVelocity.x !== 0 || playerVelocity.z !== 0;
    const targetBob = new THREE.Vector3();

    if (isGrounded && isMoving) {
        const speedMultiplier = isSprinting ? 1.5 : (isCrouching ? 0.5 : 1.0);
        bobTimer += 0.15 * speedMultiplier;

        // vertical bobbing (twice the frequency of horizontal bobbing)
        targetBob.y = Math.sin(bobTimer * 2) * 0.08 * (isCrouching ? 0.4 : 1.0);
        // horizontal bobbing (sway)
        targetBob.x = Math.cos(bobTimer) * 0.05 * (isCrouching ? 0.4 : 1.0);
    } else {
        bobTimer = 0; // reset when stationary or airborne
    }

    // Lerp to the target bob offset smoothly
    bobOffset.lerp(targetBob, 0.15);
    camera.position.add(bobOffset);

    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateClouds();
    updateStarfield();
    updateParticles();
    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized');
