// ==========================================
// 1. THREE.JS SETUP (The 3D Particle World)
// ==========================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Build the Particle Sphere
const geometry = new THREE.BufferGeometry();
const particlesCount = 3000;
const posArray = new Float32Array(particlesCount * 3);
const basePositions = new Float32Array(particlesCount * 3); // Stores original shape

// Distribute points spherically
for(let i = 0; i < particlesCount * 3; i += 3) {
    const radius = 2;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    posArray[i] = x; 
    posArray[i+1] = y; 
    posArray[i+2] = z;
    
    basePositions[i] = x; 
    basePositions[i+1] = y; 
    basePositions[i+2] = z;
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const material = new THREE.PointsMaterial({ size: 0.02, color: 0x00ffff, transparent: true, opacity: 0.8 });
const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

camera.position.z = 5;

// Variables to store where your finger is
let targetX = 0;
let targetY = 0;

// The Animation Loop
function animate() {
    requestAnimationFrame(animate);
    
    const positions = particlesMesh.geometry.attributes.position.array;

    for (let i = 0; i < particlesCount * 3; i += 3) {
        // Elastic pull towards the finger + restoring the sphere shape
        positions[i] += (basePositions[i] + (targetX * 0.8) - positions[i]) * 0.05;
        positions[i+1] += (basePositions[i+1] + (targetY * 0.8) - positions[i+1]) * 0.05;
        positions[i+2] += (basePositions[i+2] - positions[i+2]) * 0.05;
    }
    
    particlesMesh.geometry.attributes.position.needsUpdate = true;
    particlesMesh.rotation.y += 0.002; // Slow idle spin
    
    renderer.render(scene, camera);
}
animate();

// Handle window resizing smoothly
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// ==========================================
// 2. MEDIAPIPE HANDS SETUP (Camera Tracking)
// ==========================================
const videoElement = document.getElementById('videoElement');

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const indexFinger = results.multiHandLandmarks[0][8]; // Landmark 8 is the index finger tip
        
        // Map 2D camera coordinates (0.0 to 1.0) to 3D space
        // Multiply by 8 to amplify the movement range across the screen
        targetX = (indexFinger.x - 0.5) * -8; 
        targetY = -(indexFinger.y - 0.5) * 8; 
    } else {
        // Smoothly return the sphere to the center if you hide your hand
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

// Start the webcam tracking
cameraUtils.start();