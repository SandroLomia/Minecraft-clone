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
    SNOW: 11,
    BRICK: 12,
    IRON_ORE: 13,
    GOLD_ORE: 14,
    RED_FLOWER: 15,
    YELLOW_FLOWER: 16,
    TALL_GRASS: 17,
    PLANK: 18
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
    [BLOCK_TYPES.BRICK]: 0xa04030,
    [BLOCK_TYPES.IRON_ORE]: 0xd2b48c,
    [BLOCK_TYPES.GOLD_ORE]: 0xffd700,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfdd835,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047,
    [BLOCK_TYPES.PLANK]: 0xc8963e
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
    } else if (blockType === BLOCK_TYPES.SNOW) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 0.8 + 15, y * 0.8 + 25);
                const shade = Math.floor(noise * 12);
                paintPixel(x, y, shade);
            }
        }
    } else if (blockType === BLOCK_TYPES.BRICK) {
        ctx.fillStyle = '#9e382b';
        ctx.fillRect(0, 0, 16, 16);
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 1.5, y * 1.5);
                ctx.fillStyle = adjustHexColor(0x9e382b, noise * 15);
                ctx.fillRect(x, y, 1, 1);
            }
        }
        ctx.fillStyle = '#dcd6cd';
        for (let y = 3; y < 16; y += 4) {
            ctx.fillRect(0, y, 16, 1);
        }
        for (let row = 0; row < 4; row++) {
            const yStart = row * 4;
            const x1 = (row % 2 === 0) ? 7 : 15;
            const x2 = (row % 2 === 0) ? 15 : 7;
            ctx.fillRect(x1, yStart, 1, 3);
            ctx.fillRect(x2, yStart, 1, 3);
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE || blockType === BLOCK_TYPES.GOLD_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        const fleckColor = blockType === BLOCK_TYPES.IRON_ORE ? '#d28c5a' : '#ffd700';
        for (let i = 0; i < 7; i++) {
            const rx = Math.floor((i * 5 + 3) % 12) + 2;
            const ry = Math.floor((i * 7 + 2) % 12) + 2;
            ctx.fillStyle = fleckColor;
            ctx.fillRect(rx, ry, (i % 2) + 2, (i % 3) + 1);
        }
    } else if (blockType === BLOCK_TYPES.PLANK) {
        ctx.fillStyle = '#c8963e';
        ctx.fillRect(0, 0, 16, 16);
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = '#a0722a';
            ctx.fillRect(0, y, 16, 1);
        }
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const noise = textureNoise.noise2D(x * 0.5 + 3, y * 0.2 + 8);
                ctx.fillStyle = adjustHexColor(0xc8963e, noise * 10 - 5);
                ctx.fillRect(x, y, 1, 1);
            }
        }
    } else if (blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 8, 2, 8);
        ctx.fillRect(5, 11, 2, 2);
        ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#e53935' : '#fdd835';
        ctx.fillRect(6, 4, 4, 4);
        ctx.fillRect(5, 5, 6, 2);
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(7, 5, 2, 2);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#43a047';
        for (let x = 2; x < 14; x += 2) {
            const h = 6 + Math.floor(Math.sin(x) * 4 + 4);
            ctx.fillStyle = x % 4 === 0 ? '#388e3c' : '#4caf50';
            ctx.fillRect(x, 16 - h, 2, h);
        }
    }

    if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && !isFoliage(blockType)) {
        for (let i = 0; i < 80; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const opacity = Math.random() * 0.22;
            ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (!isFoliage(blockType)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(0, 0, 16, 16);
    }

    BLOCK_CANVASES[blockType] = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function isFoliage(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

function isBlockSolid(type) {
    return type !== BLOCK_TYPES.AIR && type !== BLOCK_TYPES.WATER && !isFoliage(type);
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

// 3D Held Block Model attached to Camera
let selectedBlock = BLOCK_TYPES.STONE;
const heldBlockGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
const heldBlockMaterial = new THREE.MeshLambertMaterial({
    map: BLOCK_TEXTURES[selectedBlock],
    transparent: isFoliage(selectedBlock) || selectedBlock === BLOCK_TYPES.GLASS || selectedBlock === BLOCK_TYPES.WATER || selectedBlock === BLOCK_TYPES.LEAVES,
    alphaTest: (isFoliage(selectedBlock) || selectedBlock === BLOCK_TYPES.LEAVES) ? 0.3 : 0
});
const heldBlock = new THREE.Mesh(heldBlockGeometry, heldBlockMaterial);
heldBlock.position.set(0.35, -0.3, -0.5);
heldBlock.rotation.set(0.2, -0.4, 0);
camera.add(heldBlock);

function updateHeldBlockTexture() {
    if (!heldBlock) return;
    heldBlock.material.map = BLOCK_TEXTURES[selectedBlock];
    heldBlock.material.transparent = isFoliage(selectedBlock) || selectedBlock === BLOCK_TYPES.GLASS || selectedBlock === BLOCK_TYPES.WATER || selectedBlock === BLOCK_TYPES.LEAVES;
    heldBlock.material.alphaTest = (isFoliage(selectedBlock) || selectedBlock === BLOCK_TYPES.LEAVES) ? 0.3 : 0;
    heldBlock.material.needsUpdate = true;
}

// Hand Swing Animation State
let swingProgress = 0;
let isSwinging = false;

function triggerHandSwing() {
    isSwinging = true;
    swingProgress = 0;
}

function updateHandAnimation() {
    let swingOffsetY = 0;
    let swingOffsetZ = 0;
    let swingRotX = 0;
    let swingRotY = 0;

    if (isSwinging) {
        swingProgress += 0.2;
        if (swingProgress >= Math.PI) {
            isSwinging = false;
            swingProgress = 0;
        }
        const s = Math.sin(swingProgress);
        swingOffsetY = -s * 0.15;
        swingOffsetZ = -s * 0.2;
        swingRotX = s * 0.7;
        swingRotY = -s * 0.5;
    }

    heldBlock.position.set(
        0.35 + currentBobOffset.x * 1.5,
        -0.3 - currentBobOffset.y * 1.5 + swingOffsetY,
        -0.5 + swingOffsetZ
    );
    heldBlock.rotation.set(
        0.2 + swingRotX,
        -0.4 + swingRotY,
        0
    );
}

// View Bobbing State
let bobTimer = 0;
const currentBobOffset = new THREE.Vector3();
const targetBobOffset = new THREE.Vector3();

function updateBobbing() {
    const horizontalSpeed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z);
    if (isGrounded && horizontalSpeed > 0.005) {
        bobTimer += horizontalSpeed * 2.2;
        targetBobOffset.x = Math.sin(bobTimer) * 0.035;
        targetBobOffset.y = Math.abs(Math.cos(bobTimer)) * 0.045;
        targetBobOffset.z = 0;
    } else {
        bobTimer = 0;
        targetBobOffset.set(0, 0, 0);
    }
    currentBobOffset.lerp(targetBobOffset, 0.25);
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
    if (action === 'footstep') {
        createOscillatorSound(80 + Math.random() * 40, 0.05, 'triangle', 0.02, 0.001);
    }
    if (action === 'splash') {
        createOscillatorSound(160, 0.15, 'sawtooth', 0.05, 0.005);
        createOscillatorSound(90, 0.2, 'sine', 0.06, 0.005);
    }
    if (action === 'select') {
        createOscillatorSound(600, 0.04, 'sine', 0.03, 0.001);
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;

const sunMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffae6, side: THREE.DoubleSide })
);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ color: 0xeeefeb, side: THREE.DoubleSide })
);
scene.add(moonMesh);

function createStarfield() {
    const starCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 250 + Math.random() * 50;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10;
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0
    });

    return new THREE.Points(geometry, material);
}

const starfield = createStarfield();
scene.add(starfield);

function createClouds() {
    const cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85
    });

    for (let i = 0; i < 20; i++) {
        const cluster = new THREE.Group();
        const numBoxes = Math.floor(Math.random() * 4) + 3;
        for (let j = 0; j < numBoxes; j++) {
            const w = Math.floor(Math.random() * 12) + 8;
            const h = Math.floor(Math.random() * 2) + 2;
            const d = Math.floor(Math.random() * 10) + 6;
            const boxGeom = new THREE.BoxGeometry(w, h, d);
            const boxMesh = new THREE.Mesh(boxGeom, cloudMaterial);
            boxMesh.position.set(j * 6, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 6);
            cluster.add(boxMesh);
        }
        cluster.position.set(
            (Math.random() - 0.5) * 200,
            22,
            (Math.random() - 0.5) * 200
        );
        cloudGroup.add(cluster);
    }
    return cloudGroup;
}

const clouds = createClouds();
scene.add(clouds);

function updateClouds() {
    clouds.children.forEach(cluster => {
        cluster.position.x += 0.02;
        if (cluster.position.x - camera.position.x > 150) {
            cluster.position.x -= 300;
        }
    });
}

const underwaterOverlay = document.getElementById('underwater-overlay');
let isSubmerged = false;

function updateUnderwaterState() {
    const headX = camera.position.x;
    const headY = camera.position.y;
    const headZ = camera.position.z;

    const blockTypeAtHead = getBlockAt(headX, headY, headZ);
    const currentlyInWater = (blockTypeAtHead === BLOCK_TYPES.WATER);

    if (currentlyInWater && !isSubmerged) {
        isSubmerged = true;
        if (underwaterOverlay) underwaterOverlay.style.display = 'block';
        playSound('splash');
    } else if (!currentlyInWater && isSubmerged) {
        isSubmerged = false;
        if (underwaterOverlay) underwaterOverlay.style.display = 'none';
        playSound('splash');
    }

    if (isSubmerged) {
        scene.fog.color.setHex(0x0a4080);
        scene.fog.near = 0.1;
        scene.fog.far = 14;
    } else {
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
    }
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

    scene.background.copy(skyColor);
    if (!isSubmerged) {
        scene.fog.color.copy(skyColor);
    }
    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    directionalLight.position.set(
        Math.cos(sunAngle) * 150,
        Math.sin(sunAngle) * 150,
        50
    );

    sunMesh.position.copy(directionalLight.position);
    sunMesh.lookAt(camera.position);

    moonMesh.position.set(-directionalLight.position.x, -directionalLight.position.y, -directionalLight.position.z);
    moonMesh.lookAt(camera.position);

    starfield.position.copy(camera.position);
    let targetStarOpacity = 0;
    if (gameTime > 12000 && gameTime < 22000) {
        targetStarOpacity = 0.85;
    }
    starfield.material.opacity = THREE.MathUtils.lerp(starfield.material.opacity, targetStarOpacity, 0.02);
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
                    const ironNoise = simplex.noise2D((worldX + 100) * 0.2, (y + worldZ + 100) * 0.2);
                    const goldNoise = simplex.noise2D((worldX + 200) * 0.2, (y + worldZ + 200) * 0.2);
                    if (goldNoise > 0.72 && y < 5) {
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
                    if (height >= 10) {
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

            // Surface flora (flowers & tall grass)
            if (!isBeach && height > 6 && height < 10) {
                const floraNoise = textureNoise.noise2D(worldX * 0.7 + 100, worldZ * 0.7 + 100);
                if (floraNoise > 0.82) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                } else if (floraNoise > 0.72) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
                } else if (floraNoise > 0.52) {
                    chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                }
            }

            // Trees
            if (!isBeach && height > 6 && height < 10 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                if (treeNoise > 0.8) {
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

function createFoliageGeometry() {
    const plane1 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    plane1.rotateY(Math.PI / 4);
    plane1.translate(0.5, 0.5, 0.5);

    const plane2 = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    plane2.rotateY(-Math.PI / 4);
    plane2.translate(0.5, 0.5, 0.5);

    const pos1 = plane1.attributes.position.array;
    const pos2 = plane2.attributes.position.array;
    const uv1 = plane1.attributes.uv.array;
    const uv2 = plane2.attributes.uv.array;

    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);

    const combinedUV = new Float32Array(uv1.length + uv2.length);
    combinedUV.set(uv1, 0);
    combinedUV.set(uv2, uv1.length);

    const mergedGeom = new THREE.BufferGeometry();
    mergedGeom.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    mergedGeom.setAttribute('uv', new THREE.BufferAttribute(combinedUV, 2));
    mergedGeom.computeVertexNormals();

    return mergedGeom;
}

const foliageGeometry = createFoliageGeometry();
const blockBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
blockBoxGeometry.translate(0.5, 0.5, 0.5);

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliage(type);
}

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
        const isFol = isFoliage(blockType);
        const geometry = isFol ? foliageGeometry : blockBoxGeometry;

        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: isFol || blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (isFol || blockType === BLOCK_TYPES.LEAVES) ? 0.3 : 0,
            side: (isFol || blockType === BLOCK_TYPES.LEAVES) ? THREE.DoubleSide : THREE.FrontSide
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
let currentSelectedIndex = 2; // STONE
let currentPlayerHeight = PLAYER_HEIGHT;
let footstepTimer = 0;

const inventoryUI = document.getElementById('inventory');
const inventoryBlocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.COBBLESTONE,
    BLOCK_TYPES.BRICK,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.PLANK,
    BLOCK_TYPES.SNOW,
    BLOCK_TYPES.GLASS
];

function selectInventorySlot(index) {
    if (index >= 0 && index < inventoryBlocks.length) {
        currentSelectedIndex = index;
        selectedBlock = inventoryBlocks[index];
        const slots = document.querySelectorAll('.inventory-slot');
        slots.forEach((s, idx) => {
            if (idx === index) {
                s.classList.add('selected');
            } else {
                s.classList.remove('selected');
            }
        });
        updateHeldBlockTexture();
        playSound('select');
    }
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    const canvas = BLOCK_CANVASES[type];
    if (canvas) {
        slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
    } else {
        slot.style.backgroundColor = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    }

    const num = document.createElement('span');
    num.className = 'slot-number';
    num.textContent = index + 1;
    slot.appendChild(num);

    if (type === selectedBlock) slot.classList.add('selected');

    slot.onclick = () => {
        selectInventorySlot(index);
    };

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
    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''));
        if (digit >= 1 && digit <= 9) {
            selectInventorySlot(digit - 1);
        }
    }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('wheel', (e) => {
    let newIndex = currentSelectedIndex;
    if (e.deltaY > 0) {
        newIndex = (currentSelectedIndex + 1) % inventoryBlocks.length;
    } else if (e.deltaY < 0) {
        newIndex = (currentSelectedIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length;
    }
    selectInventorySlot(newIndex);
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
    const isCrouching = keys['ControlLeft'] || keys['ControlRight'];
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
    triggerHandSwing();
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
                createParticles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), BLOCK_COLORS[blockType] || 0x888888);
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

function handleMovement() {
    const isCrouching = keys['ControlLeft'] || keys['ControlRight'];
    const isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && !isCrouching;

    const targetHeight = isCrouching ? 1.4 : PLAYER_HEIGHT;
    const heightDelta = targetHeight - currentPlayerHeight;
    currentPlayerHeight += heightDelta * 0.2;

    let moveSpeed = MOVE_SPEED;
    if (isSprinting) moveSpeed *= 1.5;
    else if (isCrouching) moveSpeed *= 0.5;

    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
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

    if (isSubmerged) {
        playerVelocity.multiplyScalar(0.85);
        if (keys['Space']) {
            playerVelocity.y = 0.08;
        }
    } else if (keys['Space'] && isGrounded && !isCrouching) {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSound('jump');
    }

    // Footstep sound feedback
    const horizSpeed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z);
    if (isGrounded && horizSpeed > 0.01) {
        footstepTimer += horizSpeed;
        if (footstepTimer > 0.4) {
            playSound('footstep');
            footstepTimer = 0;
        }
    } else {
        footstepTimer = 0;
    }
}

function updatePhysics() {
    playerVelocity.y += GRAVITY;

    const nextPos = camera.position.clone().add(playerVelocity);

    // Simple collision detection
    if (isBlockSolid(getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z))) {
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
        if (isBlockSolid(getBlockAt(checkX, playerY, camera.position.z)) ||
            isBlockSolid(getBlockAt(checkX, playerY + 1, camera.position.z))) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (isBlockSolid(getBlockAt(camera.position.x, playerY, checkZ)) ||
            isBlockSolid(getBlockAt(camera.position.x, playerY + 1, checkZ))) {
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

    // Subtract view bobbing offset before physics calculation to prevent drift
    camera.position.sub(currentBobOffset);

    handleMovement();
    updatePhysics();
    updateBobbing();
    updateHandAnimation();

    // Reapply view bobbing offset
    camera.position.add(currentBobOffset);

    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateClouds();
    updateUnderwaterState();
    updateParticles();
    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized');
