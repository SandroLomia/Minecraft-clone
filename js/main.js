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

const FOLIAGE_TYPES = [
    BLOCK_TYPES.RED_FLOWER,
    BLOCK_TYPES.YELLOW_FLOWER,
    BLOCK_TYPES.TALL_GRASS
];

function isFoliage(type) {
    return FOLIAGE_TYPES.includes(type);
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
    [BLOCK_TYPES.BRICK]: 0xa04030,
    [BLOCK_TYPES.IRON_ORE]: 0xd8af93,
    [BLOCK_TYPES.GOLD_ORE]: 0xfcdb34,
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
            const rx = (i * 5 + 2) % 12 + 1;
            const ry = (i * 7 + 3) % 12 + 1;
            ctx.fillStyle = '#222';
            ctx.fillRect(rx, ry, 3, 3);
        }
    } else if (blockType === BLOCK_TYPES.IRON_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        const orePositions = [[3, 3], [4, 4], [10, 4], [9, 5], [5, 10], [6, 11], [11, 11]];
        ctx.fillStyle = '#d8af93';
        orePositions.forEach(([rx, ry]) => ctx.fillRect(rx, ry, 2, 2));
    } else if (blockType === BLOCK_TYPES.GOLD_ORE) {
        ctx.fillStyle = adjustHexColor(BLOCK_COLORS[BLOCK_TYPES.STONE], 0);
        ctx.fillRect(0, 0, 16, 16);
        const orePositions = [[2, 4], [3, 5], [9, 3], [10, 4], [4, 11], [5, 12], [11, 10]];
        ctx.fillStyle = '#fcdb34';
        orePositions.forEach(([rx, ry]) => ctx.fillRect(rx, ry, 2, 2));
    } else if (blockType === BLOCK_TYPES.BRICK) {
        ctx.fillStyle = '#a04030';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#d0d0d0';
        for (let y = 3; y < 16; y += 4) {
            ctx.fillRect(0, y, 16, 1);
        }
        for (let x = 7; x < 16; x += 8) ctx.fillRect(x, 0, 1, 4);
        for (let x = 3; x < 16; x += 8) ctx.fillRect(x, 4, 1, 4);
        for (let x = 7; x < 16; x += 8) ctx.fillRect(x, 8, 1, 4);
        for (let x = 3; x < 16; x += 8) ctx.fillRect(x, 12, 1, 4);
    } else if (blockType === BLOCK_TYPES.COBBLESTONE) {
        for (let y = 0; y < 16; y += 4) {
            for (let x = 0; x < 16; x += 4) {
                ctx.fillStyle = adjustHexColor(color, (x + y) % 8 === 0 ? 10 : -10);
                ctx.fillRect(x, y, 4, 4);
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.strokeRect(x, y, 4, 4);
            }
        }
    } else if (blockType === BLOCK_TYPES.RED_FLOWER || blockType === BLOCK_TYPES.YELLOW_FLOWER) {
        ctx.clearRect(0, 0, 16, 16);
        // Stem
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(7, 7, 2, 9);
        // Leaves on stem
        ctx.fillRect(5, 10, 2, 2);
        ctx.fillRect(9, 12, 2, 2);
        // Flower petals
        ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#e53935' : '#fdd835';
        ctx.fillRect(5, 3, 6, 6);
        // Center
        ctx.fillStyle = blockType === BLOCK_TYPES.RED_FLOWER ? '#ffeb3b' : '#ff9800';
        ctx.fillRect(7, 5, 2, 2);
    } else if (blockType === BLOCK_TYPES.TALL_GRASS) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#43a047';
        for (let i = 0; i < 6; i++) {
            const gx = (i * 2 + 2);
            const gh = 8 + (i % 3) * 3;
            ctx.fillRect(gx, 16 - gh, 2, gh);
        }
    }

    if (![BLOCK_TYPES.DIRT, BLOCK_TYPES.GRASS, BLOCK_TYPES.SAND, BLOCK_TYPES.LEAVES, BLOCK_TYPES.RED_FLOWER, BLOCK_TYPES.YELLOW_FLOWER, BLOCK_TYPES.TALL_GRASS, BLOCK_TYPES.GLASS].includes(blockType)) {
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

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';
camera.position.set(0, 10, 0);

function createOscillatorSound(frequency, duration, type = 'sine', gain = 0.07, attack = 0.005) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
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

let lastStepTime = 0;

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
        const now = performance.now();
        if (now - lastStepTime > 320) {
            createOscillatorSound(110 + Math.random() * 40, 0.05, 'triangle', 0.025, 0.001);
            lastStepTime = now;
        }
    } else if (action === 'splash') {
        createOscillatorSound(180, 0.15, 'sine', 0.06, 0.01);
    } else if (action === 'click') {
        createOscillatorSound(600, 0.03, 'square', 0.02, 0.001);
    }
}

// Day / Night Cycle & Sky Objects
const DAY_DURATION = 24000;
let gameTime = 6000;

const sunGeometry = new THREE.BoxGeometry(8, 8, 8);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffee });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

const moonGeometry = new THREE.BoxGeometry(7, 7, 7);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xddddff });
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Starfield setup
const starCount = 300;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const r = 250;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// Cloud system setup
const cloudGroup = new THREE.Group();
const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
const cloudGeo = new THREE.BoxGeometry(1, 1, 1);

function createClouds() {
    for (let c = 0; c < 12; c++) {
        const cluster = new THREE.Group();
        const cx = (Math.random() - 0.5) * 160;
        const cz = (Math.random() - 0.5) * 160;
        const cy = 22 + Math.random() * 2;
        const sizeX = Math.floor(Math.random() * 5) + 4;
        const sizeZ = Math.floor(Math.random() * 5) + 4;

        for (let x = 0; x < sizeX; x++) {
            for (let z = 0; z < sizeZ; z++) {
                if (Math.random() > 0.2) {
                    const cloudBox = new THREE.Mesh(cloudGeo, cloudMaterial);
                    cloudBox.position.set(x * 3, 0, z * 3);
                    cloudBox.scale.set(3, 1.2, 3);
                    cluster.add(cloudBox);
                }
            }
        }
        cluster.position.set(cx, cy, cz);
        cloudGroup.add(cluster);
    }
    scene.add(cloudGroup);
}
createClouds();

function updateClouds() {
    cloudGroup.children.forEach(cluster => {
        cluster.position.x += 0.02;
        if (cluster.position.x > 100) cluster.position.x = -100;
    });
}

function updateEnvironment() {
    gameTime = (gameTime + 1) % DAY_DURATION;

    const skyNight = new THREE.Color(0x050515);
    const skySunrise = new THREE.Color(0xfd7d53);
    const skyDay = new THREE.Color(0x87ceeb);
    const skySunset = new THREE.Color(0xe25822);
    const skyDusk = new THREE.Color(0x2c1654);

    let currentSky = new THREE.Color();
    let starOpacity = 0;

    if (gameTime < 2000) {
        const t = gameTime / 2000;
        currentSky.lerpColors(skyNight, skySunrise, t);
        starOpacity = 1 - t;
    } else if (gameTime < 4000) {
        const t = (gameTime - 2000) / 2000;
        currentSky.lerpColors(skySunrise, skyDay, t);
        starOpacity = 0;
    } else if (gameTime < 14000) {
        currentSky.copy(skyDay);
        starOpacity = 0;
    } else if (gameTime < 16000) {
        const t = (gameTime - 14000) / 2000;
        currentSky.lerpColors(skyDay, skySunset, t);
        starOpacity = t * 0.5;
    } else if (gameTime < 18000) {
        const t = (gameTime - 16000) / 2000;
        currentSky.lerpColors(skySunset, skyDusk, t);
        starOpacity = 0.5 + t * 0.5;
    } else {
        const t = (gameTime - 18000) / 6000;
        currentSky.lerpColors(skyDusk, skyNight, t);
        starOpacity = 1.0;
    }

    starMaterial.opacity = starOpacity;
    starField.position.copy(camera.position);

    const sunAngle = (gameTime / DAY_DURATION) * Math.PI * 2 + Math.PI;
    sunMesh.position.set(
        camera.position.x + Math.cos(sunAngle) * 120,
        camera.position.y + Math.sin(sunAngle) * 120,
        camera.position.z + Math.sin(sunAngle) * 40
    );
    moonMesh.position.set(
        camera.position.x - Math.cos(sunAngle) * 120,
        camera.position.y - Math.sin(sunAngle) * 120,
        camera.position.z - Math.sin(sunAngle) * 40
    );

    const isSubmerged = checkUnderwater();
    if (!isSubmerged) {
        scene.background.copy(currentSky);
        scene.fog.color.copy(currentSky);
        scene.fog.density = 0.015;
    }

    const sunHeight = Math.sin(sunAngle);
    ambientLight.intensity = Math.max(0.15, Math.min(0.6, sunHeight * 0.6 + 0.2));
    directionalLight.intensity = Math.max(0.0, Math.min(0.8, sunHeight * 0.8));
    directionalLight.position.copy(sunMesh.position);

    updateClouds();
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.getInnerHTML ? renderer.getInnerHTML() : renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 50);
scene.add(directionalLight);

const selectionBoxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
selectionBoxGeometry.translate(0.5, 0.5, 0.5);
const selectionBoxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(selectionBoxGeometry, selectionBoxMaterial);
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
        p.life -= 0.05;
        p.scale.multiplyScalar(0.92);

        if (p.life <= 0) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            particles.splice(i, 1);
        }
    }
}

// First Person Held Block
const heldBlockGroup = new THREE.Group();
camera.add(heldBlockGroup);
scene.add(camera);

let heldBlockMesh = null;
let swingAnim = 0;

function createFoliageGeometry() {
    const p1 = new THREE.PlaneGeometry(0.8, 0.8);
    p1.rotateY(Math.PI / 4);
    const p2 = new THREE.PlaneGeometry(0.8, 0.8);
    p2.rotateY(-Math.PI / 4);

    const nonIndexed1 = p1.toNonIndexed();
    const nonIndexed2 = p2.toNonIndexed();

    const pos1 = nonIndexed1.attributes.position.array;
    const pos2 = nonIndexed2.attributes.position.array;
    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);

    const uv1 = nonIndexed1.attributes.uv.array;
    const uv2 = nonIndexed2.attributes.uv.array;
    const combinedUv = new Float32Array(uv1.length + uv2.length);
    combinedUv.set(uv1, 0);
    combinedUv.set(uv2, uv1.length);

    const foliageGeo = new THREE.BufferGeometry();
    foliageGeo.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    foliageGeo.setAttribute('uv', new THREE.BufferAttribute(combinedUv, 2));
    foliageGeo.computeVertexNormals();
    return foliageGeo;
}

const foliageBillboardGeometry = createFoliageGeometry();

function updateHeldBlock() {
    if (heldBlockMesh) {
        heldBlockGroup.remove(heldBlockMesh);
        heldBlockMesh.geometry.dispose();
        heldBlockMesh.material.dispose();
    }

    const foliage = isFoliage(selectedBlock);
    const geo = foliage ? foliageBillboardGeometry : new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const mat = new THREE.MeshLambertMaterial({
        map: BLOCK_TEXTURES[selectedBlock],
        transparent: selectedBlock === BLOCK_TYPES.GLASS || selectedBlock === BLOCK_TYPES.WATER || foliage,
        opacity: selectedBlock === BLOCK_TYPES.GLASS ? 0.6 : (selectedBlock === BLOCK_TYPES.WATER ? 0.6 : 1),
        alphaTest: foliage ? 0.5 : 0,
        side: THREE.DoubleSide
    });

    heldBlockMesh = new THREE.Mesh(geo, mat);
    if (!foliage) {
        heldBlockMesh.rotation.set(0.2, -0.4, 0.1);
    }
    heldBlockGroup.add(heldBlockMesh);
}

heldBlockGroup.position.set(0.4, -0.35, -0.55);

function updateHeldBlockAnimation() {
    if (!heldBlockMesh) return;

    if (swingAnim > 0) {
        swingAnim -= 0.1;
        if (swingAnim < 0) swingAnim = 0;
    }

    const swingAngle = Math.sin(swingAnim * Math.PI) * 0.6;
    heldBlockGroup.position.set(0.4 - swingAngle * 0.1, -0.35 - swingAngle * 0.15, -0.55 + swingAngle * 0.1);
    heldBlockGroup.rotation.set(-swingAngle * 0.8, -swingAngle * 0.5, swingAngle * 0.4);
}

function triggerSwing() {
    swingAnim = 1.0;
}

// World / Chunk Class
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
                    const ironNoise = simplex.noise2D((worldX + 50) * 0.25, (y + worldZ) * 0.25);
                    const goldNoise = simplex.noise2D((worldX + 120) * 0.3, (y + worldZ) * 0.3);

                    if (y < 4 && goldNoise > 0.72) {
                        chunk.setBlock(x, y, z, BLOCK_TYPES.GOLD_ORE);
                    } else if (y < 7 && ironNoise > 0.68) {
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

            // Trees and Flowers
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
                    const foliageNoise = textureNoise.noise2D(worldX * 0.8 + 15, worldZ * 0.8 + 25);
                    if (foliageNoise > 0.6) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.TALL_GRASS);
                    } else if (foliageNoise > 0.45) {
                        chunk.setBlock(x, height, z, BLOCK_TYPES.RED_FLOWER);
                    } else if (foliageNoise > 0.35) {
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

function isBlockTransparent(type) {
    return type === BLOCK_TYPES.AIR || type === BLOCK_TYPES.GLASS || type === BLOCK_TYPES.LEAVES || type === BLOCK_TYPES.WATER || isFoliage(type);
}

const sharedBlockGeometry = new THREE.BoxGeometry(1, 1, 1);
sharedBlockGeometry.translate(0.5, 0.5, 0.5);

const sharedFoliageGeometry = createFoliageGeometry();
sharedFoliageGeometry.translate(0.5, 0.4, 0.5);

function createChunkMesh(chunk) {
    const instancedMeshes = {};

    const instancedMeshes = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk.getBlock(x, y, z);
                if (blockType !== BLOCK_TYPES.AIR) {
                    let isVisible = true;
                    if (!isFoliage(blockType)) {
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
        const foliage = isFoliage(blockType);
        const geometryToUse = foliage ? sharedFoliageGeometry : sharedBlockGeometry;

        const material = new THREE.MeshLambertMaterial({
            map: BLOCK_TEXTURES[blockType],
            transparent: blockType === BLOCK_TYPES.GLASS || blockType === BLOCK_TYPES.WATER || blockType === BLOCK_TYPES.LEAVES || foliage,
            opacity: blockType === BLOCK_TYPES.GLASS ? 0.6 : (blockType === BLOCK_TYPES.WATER ? 0.6 : 1),
            alphaTest: (blockType === BLOCK_TYPES.LEAVES || foliage) ? 0.5 : 0,
            side: (blockType === BLOCK_TYPES.LEAVES || foliage) ? THREE.DoubleSide : THREE.FrontSide
        });

        const mesh = new THREE.InstancedMesh(geometryToUse, material, matrices.length);
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
        chunk.mesh.traverse(child => {
            if (child.material) child.material.dispose();
        });
        chunk.mesh = null;
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

    let createdAny = false;
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            if (ensureChunk(playerChunkX + x, playerChunkZ + z)) {
                createdAny = true;
            }
        }
    }

    if (createdAny || force) {
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const chunk = chunks.get(getChunkKey(playerChunkX + x, playerChunkZ + z));
                if (chunk && !chunk.mesh) {
                    rebuildChunkMesh(chunk);
                }
            }
        }
    }

    for (const [key, chunk] of chunks.entries()) {
        if (Math.abs(chunk.x - playerChunkX) > RENDER_DISTANCE + 1 || Math.abs(chunk.z - playerChunkZ) > RENDER_DISTANCE + 1) {
            if (chunk.mesh) {
                scene.remove(chunk.mesh);
                chunk.mesh.traverse(child => {
                    if (child.material) child.material.dispose();
                });
                chunk.mesh = null;
            }
            chunks.delete(key);
        }
    }
}

// Player state & Inventory
const playerVelocity = new THREE.Vector3();
let isGrounded = false;
let isSprinting = false;
let isCrouching = false;
let currentPlayerHeight = PLAYER_HEIGHT;

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
    BLOCK_TYPES.SAND
];

function selectInventorySlot(index) {
    if (index < 0 || index >= inventoryBlocks.length) return;
    selectedBlock = inventoryBlocks[index];
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach((s, idx) => {
        if (idx === index) s.classList.add('selected');
        else s.classList.remove('selected');
    });
    updateHeldBlock();
    playSound('click');
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

    if (type === selectedBlock) slot.classList.add('selected');

    slot.onclick = () => {
        selectInventorySlot(index);
    };

    inventoryUI.appendChild(slot);
});

updateHeldBlock();

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

let joystickVector = new THREE.Vector2();
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
let isTouchingJoystick = false;

joystickBase.addEventListener('touchstart', (e) => {
    isTouchingJoystick = true;
    updateJoystick(e.touches[0]);
});

document.addEventListener('touchmove', (e) => {
    if (isTouchingJoystick) {
        updateJoystick(e.touches[0]);
    }
});

document.addEventListener('touchend', () => {
    isTouchingJoystick = false;
    joystickVector.set(0, 0);
    joystickHandle.style.transform = `translate(-50%, -50%)`;
});

function updateJoystick(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    const maxRadius = rect.width / 2;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > maxRadius) {
        deltaX = (deltaX / distance) * maxRadius;
        deltaY = (deltaY / distance) * maxRadius;
    }

    joystickHandle.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    joystickVector.set(deltaX / maxRadius, deltaY / maxRadius);
}

let lastTouchX, lastTouchY;
document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && !isTouchingJoystick) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
});

document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && !isTouchingJoystick && controls.isLocked) {
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        camera.rotation.y -= deltaX * 0.002;
        camera.rotation.x -= deltaY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
});

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const slotIdx = parseInt(e.code.replace('Digit', '')) - 1;
        selectInventorySlot(slotIdx);
    }

    if (e.code === 'KeyC') {
        isCrouching = !isCrouching;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

document.addEventListener('wheel', (e) => {
    const currentIdx = inventoryBlocks.indexOf(selectedBlock);
    if (e.deltaY > 0) {
        selectInventorySlot((currentIdx + 1) % inventoryBlocks.length);
    } else {
        selectInventorySlot((currentIdx - 1 + inventoryBlocks.length) % inventoryBlocks.length);
    }
});

document.getElementById('jump-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGrounded && !isCrouching) {
        playerVelocity.y = JUMP_FORCE;
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
    triggerSwing();
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
                updateBlock(x, y, z, BLOCK_TYPES.AIR);
                createParticles(pos, BLOCK_COLORS[blockType] || 0xffffff);
                playSound('break');
            }
        } else if (action === 'place') {
            pos.add(intersect.face.normal.clone().multiplyScalar(0.5));
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const z = Math.floor(pos.z);

            const playerMinX = camera.position.x - PLAYER_RADIUS;
            const playerMaxX = camera.position.x + PLAYER_RADIUS;
            const playerMinZ = camera.position.z - PLAYER_RADIUS;
            const playerMaxZ = camera.position.z + PLAYER_RADIUS;
            const playerMinY = camera.position.y - currentPlayerHeight;
            const playerMaxY = camera.position.y;

            const isIntersectingPlayer = !isFoliage(selectedBlock) && (
                x + 1 > playerMinX && x < playerMaxX &&
                y + 1 > playerMinY && y < playerMaxY &&
                z + 1 > playerMinZ && z < playerMaxZ
            );

            if (!isIntersectingPlayer) {
                updateBlock(x, y, z, selectedBlock);
                playSound('place');
            }
        }
    }
}

function updateBlock(worldX, worldY, worldZ, type) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = chunks.get(getChunkKey(chunkX, chunkZ));

    if (chunk) {
        const x = Math.floor(worldX) - chunkX * CHUNK_SIZE;
        const y = Math.floor(worldY);
        const z = Math.floor(worldZ) - chunkZ * CHUNK_SIZE;

        chunk.setBlock(x, y, z, type);
        rebuildChunkAndNeighbors(chunkX, chunkZ);
    }
}

let bobTimer = 0;
let bobOffset = new THREE.Vector3();

function handleMovement() {
    isSprinting = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    if (keys['ControlLeft'] || keys['ControlRight']) isCrouching = true;
    else if (!keys['KeyC']) isCrouching = false;

    let targetHeight = isCrouching ? 1.4 : PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * 0.2;

    let speed = MOVE_SPEED;
    if (isSprinting && !isCrouching) speed *= 1.5;
    if (isCrouching) speed *= 0.5;

    const inWater = checkUnderwater();
    if (inWater) speed *= 0.65;

    const moveVector = new THREE.Vector3();

    if (controls.isLocked) {
        if (keys['KeyW']) moveVector.z -= 1;
        if (keys['KeyS']) moveVector.z += 1;
        if (keys['KeyA']) moveVector.x -= 1;
        if (keys['KeyD']) moveVector.x += 1;
    }

    if (joystickVector.length() > 0) {
        moveVector.x = joystickVector.x;
        moveVector.z = joystickVector.y;
    }

    moveVector.normalize();
    moveVector.applyQuaternion(camera.quaternion);
    moveVector.y = 0;
    moveVector.normalize();

    playerVelocity.x = moveVector.x * speed;
    playerVelocity.z = moveVector.z * speed;

    if (isGrounded && moveVector.length() > 0) {
        playSound('footstep');
        bobTimer += isSprinting ? 0.25 : 0.15;
        const targetBobY = Math.sin(bobTimer) * 0.05;
        const targetBobX = Math.cos(bobTimer * 0.5) * 0.03;
        bobOffset.x += (targetBobX - bobOffset.x) * 0.2;
        bobOffset.y += (targetBobY - bobOffset.y) * 0.2;
    } else {
        bobOffset.multiplyScalar(0.8);
        if (isGrounded) bobTimer = 0;
    }

    if (keys['Space']) {
        if (inWater) {
            playerVelocity.y = 0.08;
        } else if (isGrounded && !isCrouching) {
            playerVelocity.y = JUMP_FORCE;
            playSound('jump');
        }
    }

    // Dynamic FOV update
    const targetFOV = isSprinting ? 85 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }
}

function checkUnderwater() {
    const headBlock = getBlockAt(camera.position.x, camera.position.y, camera.position.z);
    return headBlock === BLOCK_TYPES.WATER;
}

function updatePhysics() {
    const inWater = checkUnderwater();
    const underwaterOverlay = document.getElementById('underwater-overlay');

    if (inWater) {
        playerVelocity.y += GRAVITY * 0.25;
        playerVelocity.y *= 0.85;
        if (underwaterOverlay) underwaterOverlay.style.display = 'block';
        scene.fog.color.setHex(0x0033aa);
        scene.fog.density = 0.08;
    } else {
        playerVelocity.y += GRAVITY;
        if (underwaterOverlay) underwaterOverlay.style.display = 'none';
    }

    camera.position.sub(bobOffset);

    const nextPos = camera.position.clone().add(playerVelocity);

    const feetY = nextPos.y - currentPlayerHeight;
    const feetBlock = getBlockAt(nextPos.x, feetY, nextPos.z);
    if (feetBlock !== BLOCK_TYPES.AIR && !isFoliage(feetBlock) && feetBlock !== BLOCK_TYPES.WATER) {
        if (playerVelocity.y <= 0) {
            playerVelocity.y = 0;
            isGrounded = true;
            nextPos.y = Math.floor(feetY) + 1 + currentPlayerHeight;
        }
    } else {
        isGrounded = false;
    }

    const checkRadius = PLAYER_RADIUS;
    const playerY = camera.position.y - currentPlayerHeight + 0.1;

    if (playerVelocity.x !== 0) {
        const checkX = nextPos.x + (playerVelocity.x > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(checkX, playerY, camera.position.z);
        const b2 = getBlockAt(checkX, playerY + 1, camera.position.z);
        if ((b1 !== BLOCK_TYPES.AIR && !isFoliage(b1) && b1 !== BLOCK_TYPES.WATER) ||
            (b2 !== BLOCK_TYPES.AIR && !isFoliage(b2) && b2 !== BLOCK_TYPES.WATER)) {
            playerVelocity.x = 0;
            nextPos.x = camera.position.x;
        }
    }

    if (playerVelocity.z !== 0) {
        const checkZ = nextPos.z + (playerVelocity.z > 0 ? checkRadius : -checkRadius);
        const b1 = getBlockAt(camera.position.x, playerY, checkZ);
        const b2 = getBlockAt(camera.position.x, playerY + 1, checkZ);
        if ((b1 !== BLOCK_TYPES.AIR && !isFoliage(b1) && b1 !== BLOCK_TYPES.WATER) ||
            (b2 !== BLOCK_TYPES.AIR && !isFoliage(b2) && b2 !== BLOCK_TYPES.WATER)) {
            playerVelocity.z = 0;
            nextPos.z = camera.position.z;
        }
    }

    camera.position.copy(nextPos);
    camera.position.add(bobOffset);
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
    updateHeldBlockAnimation();
    renderer.render(scene, camera);
}

animate();

console.log('Minecraft clone initialized successfully');
