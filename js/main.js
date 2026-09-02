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
    BRICK: 11,
    IRON_ORE: 12,
    GOLD_ORE: 13,
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
    [BLOCK_TYPES.BRICK]: 0xa04030,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfbc02d,
    [BLOCK_TYPES.RED_FLOWER]: 0xe53935,
    [BLOCK_TYPES.YELLOW_FLOWER]: 0xfdd835,
    [BLOCK_TYPES.TALL_GRASS]: 0x43a047
};

function isFoliage(type) {
    return type === BLOCK_TYPES.RED_FLOWER || type === BLOCK_TYPES.YELLOW_FLOWER || type === BLOCK_TYPES.TALL_GRASS;
}

function isSolidBlock(type) {
    return type !== BLOCK_TYPES.AIR && type !== BLOCK_TYPES.WATER && !isFoliage(type);
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
        ctx.clearRect(0, 0, 16, 16);
        if (blockType === BLOCK_TYPES.RED_FLOWER) {
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(7, 8, 2, 8);
            ctx.fillRect(6, 10, 1, 2);
            ctx.fillStyle = '#e53935';
            ctx.fillRect(5, 4, 6, 5);
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(7, 5, 2, 2);
        } else if (blockType === BLOCK_TYPES.YELLOW_FLOWER) {
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(7, 8, 2, 8);
            ctx.fillRect(9, 11, 1, 2);
            ctx.fillStyle = '#fdd835';
            ctx.fillRect(5, 4, 6, 5);
            ctx.fillStyle = '#ff8f00';
            ctx.fillRect(7, 5, 2, 2);
        } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
            ctx.fillStyle = '#43a047';
            ctx.fillRect(2, 6, 2, 10);
            ctx.fillRect(5, 3, 2, 13);
            ctx.fillRect(8, 4, 2, 12);
            ctx.fillRect(11, 7, 2, 9);
            ctx.fillStyle = '#66bb6a';
            ctx.fillRect(3, 4, 1, 8);
            ctx.fillRect(6, 1, 1, 10);
            ctx.fillRect(9, 2, 1, 9);
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
            const oreColor = blockType === BLOCK_TYPES.COAL_ORE ? '#222222' : (blockType === BLOCK_TYPES.IRON_ORE ? '#d8af93' : '#fbc02d');
            for (let i = 0; i < 6; i++) {
                const rx = Math.floor(Math.random() * 12) + 2;
                const ry = Math.floor(Math.random() * 12) + 2;
                ctx.fillStyle = oreColor;
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
            ctx.fillStyle = '#b04a38';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#dcdca0';
            ctx.fillRect(0, 3, 16, 1);
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(0, 11, 16, 1);
            ctx.fillRect(0, 15, 16, 1);
            ctx.fillRect(4, 0, 1, 4);
            ctx.fillRect(12, 0, 1, 4);
            ctx.fillRect(8, 4, 1, 4);
            ctx.fillRect(4, 8, 1, 4);
            ctx.fillRect(12, 8, 1, 4);
            ctx.fillRect(8, 12, 1, 4);
        }

        if (blockType !== BLOCK_TYPES.DIRT && blockType !== BLOCK_TYPES.GRASS && blockType !== BLOCK_TYPES.SAND && blockType !== BLOCK_TYPES.LEAVES && blockType !== BLOCK_TYPES.BRICK) {
            for (let i = 0; i < 80; i++) {
                const x = Math.floor(Math.random() * 16);
                const y = Math.floor(Math.random() * 16);
                const opacity = Math.random() * 0.22;
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        if (blockType !== BLOCK_TYPES.BRICK) {
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
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 1, RENDER_DISTANCE * CHUNK_SIZE * 1.5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(CHUNK_SIZE / 2, CHUNK_HEIGHT, CHUNK_SIZE / 2);
camera.rotation.order = 'YXZ';

// First-person held item setup
const heldBlockGroup = new THREE.Group();
const heldBlockGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
let selectedBlock = BLOCK_TYPES.STONE;

const heldBlockMaterial = new THREE.MeshLambertMaterial({
    map: BLOCK_TEXTURES[selectedBlock],
    transparent: false
});
const heldBlockMesh = new THREE.Mesh(heldBlockGeometry, heldBlockMaterial);
heldBlockMesh.position.set(0.38, -0.35, -0.55);
heldBlockMesh.rotation.set(0.2, -0.35, 0.1);
heldBlockGroup.add(heldBlockMesh);
camera.add(heldBlockGroup);
scene.add(camera);

function updateHeldBlock() {
    heldBlockMesh.material.map = BLOCK_TEXTURES[selectedBlock];
    heldBlockMesh.material.transparent = selectedBlock === BLOCK_TYPES.GLASS || selectedBlock === BLOCK_TYPES.WATER || selectedBlock === BLOCK_TYPES.LEAVES || isFoliage(selectedBlock);
    heldBlockMesh.material.opacity = selectedBlock === BLOCK_TYPES.GLASS ? 0.6 : (selectedBlock === BLOCK_TYPES.WATER ? 0.6 : 1);
    heldBlockMesh.material.alphaTest = (selectedBlock === BLOCK_TYPES.LEAVES || isFoliage(selectedBlock)) ? 0.5 : 0;
    heldBlockMesh.material.side = (selectedBlock === BLOCK_TYPES.LEAVES || isFoliage(selectedBlock)) ? THREE.DoubleSide : THREE.FrontSide;
    heldBlockMesh.material.needsUpdate = true;
}

let swingTimer = 0;
function triggerSwingAnimation() {
    swingTimer = 1.0;
}

function updateHeldBlockAnimation() {
    if (swingTimer > 0) {
        swingTimer -= 0.08;
        if (swingTimer < 0) swingTimer = 0;
    }
    const swingProgress = Math.sin(swingTimer * Math.PI);
    heldBlockMesh.position.z = -0.55 + swingProgress * 0.15;
    heldBlockMesh.position.y = -0.35 - swingProgress * 0.2;
    heldBlockMesh.rotation.x = 0.2 + swingProgress * 0.8;
}

let bobTimer = 0;
let currentBobOffset = new THREE.Vector3();

function updateViewBobbing() {
    const isMoving = (playerVelocity.x !== 0 || playerVelocity.z !== 0) && isGrounded;
    if (isMoving) {
        bobTimer += 0.15;
        const targetBobY = Math.sin(bobTimer) * 0.03;
        const targetBobX = Math.cos(bobTimer * 0.5) * 0.015;
        currentBobOffset.y += (targetBobY - currentBobOffset.y) * 0.2;
        currentBobOffset.x += (targetBobX - currentBobOffset.x) * 0.2;
    } else {
        bobTimer = 0;
        currentBobOffset.y += (0 - currentBobOffset.y) * 0.2;
        currentBobOffset.x += (0 - currentBobOffset.x) * 0.2;
    }
    heldBlockGroup.position.x = currentBobOffset.x;
    heldBlockGroup.position.y = currentBobOffset.y;
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
    } else if (action === 'place') {
        createOscillatorSound(280, 0.07, 'sine', 0.035, 0.002);
        createOscillatorSound(420, 0.06, 'triangle', 0.022, 0.002);
    } else if (action === 'jump') {
        createOscillatorSound(210, 0.12, 'triangle', 0.045, 0.003);
        createOscillatorSound(300, 0.08, 'sine', 0.022, 0.002);
    } else if (action === 'click') {
        createOscillatorSound(800, 0.03, 'sine', 0.04, 0.001);
    } else if (action === 'splash') {
        createOscillatorSound(120, 0.25, 'triangle', 0.06, 0.01);
        createOscillatorSound(80, 0.2, 'sawtooth', 0.03, 0.01);
    } else if (action === 'footstep') {
        createOscillatorSound(110, 0.04, 'triangle', 0.015, 0.002);
    }
}

// Sun, Moon, Stars & Clouds setup
const sunGeometry = new THREE.BoxGeometry(8, 8, 8);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffea00 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(7, 7, 7);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

const starGeometry = new THREE.BufferGeometry();
const starCount = 300;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 180 + Math.random() * 20;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi));
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0
});
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

const cloudGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75
});

for (let i = 0; i < 15; i++) {
    const cloudCluster = new THREE.Group();
    const width = 4 + Math.floor(Math.random() * 5);
    const length = 4 + Math.floor(Math.random() * 5);

    for (let cx = 0; cx < width; cx++) {
        for (let cz = 0; cz < length; cz++) {
            if (Math.random() > 0.3) {
                const cloudGeom = new THREE.BoxGeometry(2, 0.8, 2);
                const cloudPiece = new THREE.Mesh(cloudGeom, cloudMaterial);
                cloudPiece.position.set(cx * 2, 0, cz * 2);
                cloudCluster.add(cloudPiece);
            }
        }
    }
    cloudCluster.position.set(
        (Math.random() - 0.5) * 200,
        22,
        (Math.random() - 0.5) * 200
    );
    cloudGroup.add(cloudCluster);
}
scene.add(cloudGroup);

function updateClouds() {
    cloudGroup.position.x += 0.02;
    if (cloudGroup.position.x > 100) {
        cloudGroup.position.x = -100;
    }
}

const DAY_DURATION = 24000;
let gameTime = 6000;

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
    directionalLight.intensity = lightIntensity;
    ambientLight.intensity = lightIntensity * 0.6 + 0.1;

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    directionalLight.position.set(
        camera.position.x + Math.cos(sunAngle) * 100,
        camera.position.y + Math.sin(sunAngle) * 100,
        camera.position.z + 50
    );

    sunMesh.position.set(
        camera.position.x + Math.cos(sunAngle) * 120,
        camera.position.y + Math.sin(sunAngle) * 120,
        camera.position.z + 40
    );

    moonMesh.position.set(
        camera.position.x - Math.cos(sunAngle) * 120,
        camera.position.y - Math.sin(sunAngle) * 120,
        camera.position.z - 40
    );

    starField.position.copy(camera.position);

    let targetStarOpacity = 0;
    if (gameTime >= 12000 && gameTime <= 22000) {
        if (gameTime < 14000) {
            targetStarOpacity = (gameTime - 12000) / 2000;
        } else if (gameTime > 20000) {
            targetStarOpacity = (22000 - gameTime) / 2000;
        } else {
            targetStarOpacity = 1.0;
        }
    }
    starMaterial.opacity = targetStarOpacity;

    const isUnderwater = getBlockAt(camera.position.x, camera.position.y, camera.position.z) === BLOCK_TYPES.WATER;
    const underwaterOverlay = document.getElementById('underwater-overlay');

    if (isUnderwater) {
        if (underwaterOverlay) underwaterOverlay.style.display = 'block';
        scene.fog.color.setHex(0x003366);
        scene.fog.near = 0.5;
        scene.fog.far = 12;
    } else {
        if (underwaterOverlay) underwaterOverlay.style.display = 'none';
        scene.fog.color.copy(skyColor);
        scene.fog.near = 1;
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
    }

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
                    const ironNoise = simplex.noise2D(worldX * 0.25 + 10, (y + worldZ) * 0.25 + 10);
                    const goldNoise = simplex.noise2D(worldX * 0.3 + 20, (y + worldZ) * 0.3 + 20);

                    if (coalNoise > 0.68) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.COAL_ORE);
                    } else if (ironNoise > 0.7) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.IRON_ORE);
                    } else if (y < height - 7 && goldNoise > 0.73) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
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

            // Surface Foliage and Trees
            if (!isBeach && height > 6) {
                const treeNoise = textureNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                const foliageNoise = textureNoise.noise2D(worldX * 0.7 + 15.3, worldZ * 0.7 + 27.8);

                if (treeNoise > 0.8 && x > 1 && x < CHUNK_SIZE - 2 && z > 1 && z < CHUNK_SIZE - 2) {
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
                } else if (foliageNoise > 0.5) {
                    if (foliageNoise > 0.82) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                    } else if (foliageNoise > 0.72) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.YELLOW_FLOWER);
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

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliage(type);
}

function createFoliageGeometry() {
    const p1 = new THREE.PlaneGeometry(1, 1);
    p1.rotateY(Math.PI / 4);
    const p2 = new THREE.PlaneGeometry(1, 1);
    p2.rotateY(-Math.PI / 4);

    const g1 = p1.toNonIndexed();
    const g2 = p2.toNonIndexed();

    const pos1 = g1.attributes.position.array;
    const pos2 = g2.attributes.position.array;
    const uv1 = g1.attributes.uv.array;
    const uv2 = g2.attributes.uv.array;

    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);

    const combinedUv = new Float32Array(uv1.length + uv2.length);
    combinedUv.set(uv1, 0);
    combinedUv.set(uv2, uv1.length);

    const mergedGeom = new THREE.BufferGeometry();
    mergedGeom.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    mergedGeom.setAttribute('uv', new THREE.BufferAttribute(combinedUv, 2));
    mergedGeom.translate(0.5, 0.5, 0.5);
    return mergedGeom;
}

function createChunkMesh(chunk) {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    cubeGeometry.translate(0.5, 0.5, 0.5);
    const foliageGeometry = createFoliageGeometry();

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

                    const isVisible = isFoliage(blockType) || neighbors.some(neighbor => isBlockTransparent(neighbor));

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
        const foliage = isFoliage(blockType);
        const geom = foliage ? foliageGeometry : cubeGeometry;
        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || foliage,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || foliage) ? 0.5 : 0,
            side: (blockType === BLOCK_TYPES.LEAVES || foliage) ? THREE.DoubleSide : THREE.FrontSide
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
let currentPlayerHeight = PLAYER_HEIGHT;
let isCrouching = false;
let isSprinting = false;

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

let currentSlotIndex = 2; // default stone
function selectInventorySlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    currentSlotIndex = index;
    selectedBlock = inventoryBlocks[index];

    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach((s, idx) => {
        if (idx === index) s.classList.add('selected');
        else s.classList.remove('selected');
    });

    updateHeldBlock();
    triggerSwingAnimation();
    playSound('click');
}

inventoryBlocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    const canvas = BLOCK_CANVASES[type];
    if (canvas) {
        slot.style.backgroundImage = `url(${canvas.toDataURL()})`;
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
    if (e.deltaY > 0) {
        selectInventorySlot((currentSlotIndex + 1) % inventoryBlocks.length);
    } else if (e.deltaY < 0) {
        selectInventorySlot((currentSlotIndex - 1 + inventoryBlocks.length) % inventoryBlocks.length);
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

const raycaster = new THREE.Raycaster();
function performAction(action) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.distance > 5) return;

        const pos = intersect.point.clone();

        triggerSwingAnimation();
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

function handleMovement() {
    isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && !isCrouching;
    isCrouching = (keys['ControlLeft'] || keys['ControlRight']);

    const targetHeight = isCrouching ? 1.4 : PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    let speed = MOVE_SPEED;
    if (isSprinting) speed *= 1.5;
    if (isCrouching) speed *= 0.5;

    const inWater = getBlockAt(camera.position.x, camera.position.y - 0.5, camera.position.z) === BLOCK_TYPES.WATER;
    if (inWater) speed *= 0.6;

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

    direction
        .normalize()
        .multiplyScalar(speed)
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));

    playerVelocity.x = direction.x;
    playerVelocity.z = direction.z;

    if (keys['Space']) {
        if (inWater) {
            playerVelocity.y = 0.08;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            isGrounded = false;
            playSound('jump');
        }
    }
}

function updatePhysics() {
    const inWater = getBlockAt(camera.position.x, camera.position.y - 0.5, camera.position.z) === BLOCK_TYPES.WATER;

    if (inWater) {
        playerVelocity.y += GRAVITY * 0.3;
        playerVelocity.y = Math.max(-0.05, playerVelocity.y);
    } else {
        playerVelocity.y += GRAVITY;
    }

    const nextPos = camera.position.clone().add(playerVelocity);

    // Collision detection with dynamic height
    if (isSolidBlock(getBlockAt(nextPos.x, nextPos.y - currentPlayerHeight, nextPos.z))) {
        if (playerVelocity.y < 0 && !isGrounded) {
            playSound('footstep');
        }
        playerVelocity.y = 0;
        isGrounded = true;
        nextPos.y = Math.ceil(nextPos.y - currentPlayerHeight) + currentPlayerHeight;
    } else {
        isGrounded = false;
    }

    // Horizontal collisions with solid blocks
    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    // Check X direction
    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        if (isSolidBlock(getBlockAt(checkX, playerY, camera.position.z)) ||
            isSolidBlock(getBlockAt(checkX, playerY + 1, camera.position.z))) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    // Check Z direction
    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        if (isSolidBlock(getBlockAt(camera.position.x, playerY, checkZ)) ||
            isSolidBlock(getBlockAt(camera.position.x, playerY + 1, checkZ))) {
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
    handleMovement();
    updatePhysics();
    updateVisibleChunks();
    updateSelectionBox();
    updateEnvironment();
    updateParticles();
    updateHeldBlockAnimation();
    updateViewBobbing();
    renderer.render(scene, camera);
}

animate();

console.log('Three.js scene initialized');
