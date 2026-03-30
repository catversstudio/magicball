// ==========================================
// 1. THREE.JS SETUP & PHYSICS ENGINE
// ==========================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Better performance: limit pixel ratio for high-res screens
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BufferGeometry();
const particlesCount = 4000; // Increased count for a denser look
const posArray = new Float32Array(particlesCount * 3);
const basePositions = new Float32Array(particlesCount * 3);
const velocities = new Float32Array(particlesCount * 3); // NEW: Velocity vectors for physics

// Distribute points spherically
for(let i = 0; i < particlesCount * 3; i += 3) {
    const radius = 2.5;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    posArray[i] = x; posArray[i+1] = y; posArray[i+2] = z;
    basePositions[i] = x; basePositions[i+1] = y; basePositions[i+2] = z;
    
    // Start with zero velocity
    velocities[i] = 0; velocities[i+1] = 0; velocities[i+2] = 0;
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
// Use additive blending for a glowing, holographic look
const material = new THREE.PointsMaterial({ 
    size: 0.015, 
    color: 0x00ffff, 
    transparent: true, 
    opacity: 0.6,
    blending: THREE.AdditiveBlending 
});
const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

camera.position.z = 7;

// Interaction States
let targetX = 0;
let targetY = 0;
let isPinching = false;

// The Physics Animation Loop
function animate() {
    requestAnimationFrame(animate);
    
    const positions = particlesMesh.geometry.attributes.position.array;

    for (let i = 0; i < particlesCount * 3; i += 3) {
        let forceX = 0; let forceY = 0; let forceZ = 0;

        if (isPinching) {
            // STATE 1: GATHERING (Strong attraction to hand)
            const dx = targetX - positions[i];
            const dy = targetY - positions[i+1];
            const dz = 0 - positions[i+2]; // Pull to the center Z plane
            
            // Apply a strong attractive force
            forceX = dx * 0.05;
            forceY = dy * 0.05;
            forceZ = dz * 0.05;
            
            // Add some chaotic swirling energy when gathered
            forceX += (Math.random() - 0.5) * 0.2;
            forceY += (Math.random() - 0.5) * 0.2;
        } else {
            // STATE 2: IDLE/THROWING (Spring back to base sphere)
            // Calculate distance from current position to original base position
            const dx = basePositions[i] - positions[i];
            const dy = basePositions[i+1] - positions[i+1];
            const dz = basePositions[i+2] - positions[i+2];

            // Gentle spring force restoring the sphere shape
            forceX = dx * 0.02;
            forceY = dy * 0.02;
            forceZ = dz * 0.02;
        }

        // Apply Forces to Velocity (a = F/m, assuming mass is 1)
        velocities[i] += forceX;
        velocities[i+1] += forceY;
        velocities[i+2] += forceZ;

        // Apply Damping (Friction) so they don't accelerate infinitely
        const damping = isPinching ? 0.85 : 0.92;
        velocities[i] *= damping;
        velocities[i+1] *= damping;
        velocities[i+2] *= damping;

        // Apply Velocity to Position
        positions[i] += velocities[i];
        positions[i+1] += velocities[i+1];
        positions[i+2] += velocities[i+2];
    }
    
    particlesMesh.geometry.attributes.position.needsUpdate = true;
    
    // Slow cinematic rotation when not gathering
    if (!isPinching) {
        particlesMesh.rotation.y += 0.003;
        particlesMesh.rotation.x += 0.001;
    }
    
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// ==========================================
// 2. MEDIAPIPE HANDS (Gesture Recognition)
// ==========================================
const videoElement = document.getElementById('videoElement');

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1, // Keep at 1 for a balance of speed and accuracy
    minDetectionConfidence: 0.7, // Increased to prevent glitching
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const thumb = hand[4];  // Thumb tip
        const index = hand[8];  // Index tip
        
        // Map 2D camera coordinates to 3D space
        targetX = (index.x - 0.5) * -12; 
        targetY = -(index.y - 0.5) * 12; 
        
        // Calculate the distance between thumb and index finger using Pythagorean theorem
        const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        
        // If fingers are close together, activate the "Gather" state
        isPinching = distance < 0.08; 
        
    } else {
        isPinching = false;
        targetX *= 0.9;
        targetY *= 0.9;
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

cameraUtils.start();