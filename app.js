// ==========================================
// 1. CANVAS SETUP (The White Digital Board)
// ==========================================
// Create a 2D canvas and add it to the screen
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

// Fill the background with white
function clearBoard() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
clearBoard();

// Variables to track the pen position
let lastX = null;
let lastY = null;

// Handle window resizing
window.addEventListener('resize', () => {
    // Save current drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
    
    // Resize main canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Restore background and drawing
    clearBoard();
    ctx.drawImage(tempCanvas, 0, 0);
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
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        
        // Get finger tips and lower joints (PIPs) to check if fingers are up or down
        const indexTip = hand[8];
        const middleTip = hand[12];
        const middlePip = hand[10];
        const ringTip = hand[16];
        const pinkyTip = hand[20];
        
        // Convert camera coordinates to screen pixels. 
        // We use (1 - x) to act like a mirror, so left is left and right is right.
        const currentX = (1 - indexTip.x) * canvas.width;
        const currentY = indexTip.y * canvas.height;

        // Gesture Logic: MediaPipe Y-axis goes top(0) to bottom(1). 
        // If a tip's Y is less than its lower joint's Y, the finger is "Up".
        const isMiddleUp = middleTip.y < middlePip.y;
        
        // Are all fingers open? (Checking distance to see if hand is wide open)
        const isHandOpen = (ringTip.y < hand[14].y) && (pinkyTip.y < hand[18].y) && isMiddleUp;

        if (isHandOpen) {
            // GESTURE 3: All fingers open -> Clear the board
            clearBoard();
            lastX = null;
            lastY = null;
            
        } else if (isMiddleUp) {
            // GESTURE 2: Index + Middle fingers up -> Hover Mode (Don't draw)
            lastX = null;
            lastY = null;
            
        } else {
            // GESTURE 1: Only Index finger up -> Draw Mode
            if (lastX !== null && lastY !== null) {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY); // Start line from previous frame
                ctx.lineTo(currentX, currentY); // Draw line to current frame
                
                // Pen Styling
                ctx.strokeStyle = "#0055ff"; // Bright blue ink
                ctx.lineWidth = 8;           // Pen thickness
                ctx.lineCap = "round";       // Smooth rounded edges for the line
                ctx.lineJoin = "round";
                
                ctx.stroke();
            }
            // Update the last position for the next frame
            lastX = currentX;
            lastY = currentY;
        }
        
    } else {
        // If hand is taken out of the camera frame, break the drawing line
        lastX = null;
        lastY = null;
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