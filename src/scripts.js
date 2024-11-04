const localMediaPipePath = './mediapipe';

let camera, hands, videoElement, canvasElement, canvasCtx;
let lastTime = 0, frameCount = 0, fps = 0;
let detectionRunning = false, monitorVisible = false;
let alarmSound = document.getElementById('alarmSound');
let debugEnabled = false;
let isDetectionEnabled = false;
let lastFrameTime = 0;
let errorDebounce = false;
const frameInterval = 1000 / 30; // 30 FPS max

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}

async function checkCameraAvailability() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
            throw new Error('No camera devices found');
        }
        return videoDevices;
    } catch (error) {
        throw new Error(`Camera check failed: ${error.message}`);
    }
}

async function initializeHandDetection() {
    try {
        console.log('Starting hand detection initialization...');
        document.getElementById('loading').style.display = 'block';
        
        await checkCameraAvailability();
        console.log('Camera available');
        
        videoElement = document.getElementById('video');
        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');
        
        console.log('Creating Hands instance...');
        hands = new Hands({
            locateFile: (file) => {
                console.log('Loading MediaPipe file:', file);
                return `mediapipe/hands/${file}`;
            }
        });
        
        console.log('Setting hands options...');
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        console.log('Setting up results handler...');
        hands.onResults(onResults);
        
        console.log('Initializing camera...');
        // Setup camera with improved error handling and performance
        camera = new Camera(videoElement, {
            onFrame: async () => {
                console.log('Frame received:', isDetectionEnabled);
                try {
                    if (isDetectionEnabled) {
                        // Add frame throttling
                        if (!lastFrameTime || performance.now() - lastFrameTime > frameInterval) {
                            await hands.send({image: videoElement});
                            lastFrameTime = performance.now();
                        }
                    }
                } catch (error) {
                    console.error('Frame processing error:', error);
                    // Prevent error spam
                    if (!errorDebounce) {
                        errorDebounce = true;
                        showError(`Frame processing error: ${error.message}`);
                        setTimeout(() => errorDebounce = false, 1000);
                    }
                }
            },
            width: 640,
            height: 480,
            facingMode: 'user'
        });
        
        console.log('Starting camera...');
        await camera.start();
        
        console.log('Initialization complete');
        document.getElementById('loading').style.display = 'none';
        
        // Event listeners
        document.getElementById('toggleDetectionBtn').addEventListener('click', toggleDetection);
        document.getElementById('toggleMonitorBtn').addEventListener('click', toggleMonitor);
        document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
        
    } catch (error) {
        console.error('Error initializing MediaPipe:', error);
        showError(`Initialization error: ${error.message}`);
    }
}

function triggerFlashEffect() {
    const flashEffect = document.getElementById('flashEffect');
    flashEffect.classList.add('active');
    setTimeout(() => {
        flashEffect.classList.remove('active');
    }, 500);
}

// Modify the onResults function to trigger the flash effect
function onResults(results) {
    try {
        console.log('Results received:', results);
        
        if (results.multiHandLandmarks) {
            console.log('Hands detected:', results.multiHandLandmarks.length);
        }
        
        // Calculate FPS
        const now = performance.now();
        frameCount++;
                
        if (now - lastTime >= 1000) {
            fps = frameCount;
            document.getElementById('fps').textContent = fps;
            frameCount = 0;
            lastTime = now;
        }
        
        // Update detection time
        const detectionTime = Math.round(results.handedness ? results.handedness.length > 0 ? performance.now() - now : 0 : 0);
        document.getElementById('detectionTime').textContent = `${detectionTime} ms`;
        
        // Update hands count
        const handsDetected = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
        document.getElementById('handsCount').textContent = handsDetected;
        
        // Update status
        const statusElement = document.getElementById('status');
        if (handsDetected > 0) {
            statusElement.textContent = '危险';
            statusElement.classList.remove('normal');
            statusElement.classList.add('danger');
            if (!muteCheckbox.checked) {
                alarmSound.play();
            }
            triggerFlashEffect(); // Trigger flash effect when hands are detected
        } else {
            statusElement.textContent = '正常';
            statusElement.classList.remove('danger');
            statusElement.classList.add('normal');
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }
        
        // Draw the results
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 5
                });
                drawLandmarks(canvasCtx, landmarks, {
                    color: '#FF0000',
                    lineWidth: 2
                });
            }
        }
        canvasCtx.restore();
    } catch (error) {
        console.error('Error in onResults:', error);
    }
}

async function startCamera() {
    try {
        document.getElementById('errorMessage').style.display = 'none';
        await camera.start();
    } catch (error) {
        console.error('Error starting camera:', error);
        showError(`Failed to start camera: ${error.message}. Please make sure your camera is not being used by another application.`);
    }
}

function stopCamera() {
    try {
        camera.stop();
    } catch (error) {
        console.error('Error stopping camera:', error);
        showError(`Error stopping camera: ${error.message}`);
    }
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}

async function checkCameraAvailability() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
            throw new Error('No camera devices found');
        }
        return videoDevices;
    } catch (error) {
        throw new Error(`Camera check failed: ${error.message}`);
    }
}

async function startCamera() {
    try {
        document.getElementById('errorMessage').style.display = 'none';
        await camera.start();
    } catch (error) {
        console.error('Error starting camera:', error);
        showError(`Failed to start camera: ${error.message}. Please make sure your camera is not being used by another application.`);
    }
}

function stopCamera() {
    try {
        camera.stop();
    } catch (error) {
        console.error('Error stopping camera:', error);
        showError(`Error stopping camera: ${error.message}`);
    }
}

let currentCamera = 'user';
async function switchCamera() {
    try {
        currentCamera = currentCamera === 'user' ? 'environment' : 'user';
        stopCamera();
        camera = new Camera(videoElement, {
            onFrame: async () => {
                try {
                    if (isDetectionEnabled) {
                        // Add frame throttling
                        if (!lastFrameTime || performance.now() - lastFrameTime > frameInterval) {
                            await hands.send({image: videoElement});
                            lastFrameTime = performance.now();
                        }
                    }
                } catch (error) {
                    console.error('Frame processing error:', error);
                    // Prevent error spam
                    if (!errorDebounce) {
                        errorDebounce = true;
                        showError(`Frame processing error: ${error.message}`);
                        setTimeout(() => errorDebounce = false, 1000);
                    }
                }
            },
            width: 640,
            height: 480,
            facingMode: 'user'
        });
        await startCamera();
    } catch (error) {
        console.error('Error switching camera:', error);
        showError(`Failed to switch camera: ${error.message}`);
    }
}

function toggleTroubleshooting() {
    const content = document.getElementById('troubleshootingContent');
    const icon = document.querySelector('.troubleshooting h3::before');
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

function toggleDetection() {
    isDetectionEnabled = !isDetectionEnabled;
    const btn = document.getElementById('toggleDetectionBtn');
    btn.textContent = isDetectionEnabled ? '停止监测' : '开始监测';
    if (isDetectionEnabled) {
    } else {
        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
}

function toggleMonitor() {
    monitorVisible = !monitorVisible;
    const videoContainer = document.getElementById('videoContainer');
    const btn = document.getElementById('toggleMonitorBtn');
    if (monitorVisible) {
        videoContainer.style.display = 'block';
        btn.textContent = '关闭监视器';
    } else {
        videoContainer.style.display = 'none';
        btn.textContent = '打开监视器';
    }
}

function updateSettings() {
    const maxNumHands = document.getElementById('maxNumHands').value;
    const modelComplexity = document.getElementById('modelComplexity').value;
    const minDetectionConfidence = document.getElementById('minDetectionConfidence').value;
    const minTrackingConfidence = document.getElementById('minTrackingConfidence').value;

    hands.setOptions({
        maxNumHands: parseInt(maxNumHands),
        modelComplexity: parseInt(modelComplexity),
        minDetectionConfidence: parseFloat(minDetectionConfidence),
        minTrackingConfidence: parseFloat(minTrackingConfidence)
    });
}

function resetSettings() {
    document.getElementById('maxNumHands').value = 2;
    document.getElementById('modelComplexity').value = 1;
    document.getElementById('minDetectionConfidence').value = 0.5;
    document.getElementById('minTrackingConfidence').value = 0.5;

    updateSettings();
}

function toggleDebug() {
    const debugPanel = document.getElementById('debug');
    debugEnabled = !debugEnabled;
    debugPanel.style.display = debugEnabled ? 'block' : 'none';
}

function logDebug(message) {
    if (debugEnabled) {
        const debugLog = document.getElementById('debugLog');
        debugLog.textContent += message + '\n';
        console.log(message);
    }
}

// Add to scripts.js
async function checkMediaPipeFiles() {
    const files = [
        'hands.js',
        'hands_solution_packed_assets.js',
        'hands_solution_simd_wasm_bin.js'
    ];
    
    for (const file of files) {
        try {
            const response = await fetch(`mediapipe/hands/${file}`);
            logDebug(`MediaPipe file ${file}: ${response.ok ? 'OK' : 'Failed'}`);
        } catch (error) {
            logDebug(`MediaPipe file ${file} error: ${error.message}`);
        }
    }
}

// Initialize when page loads
window.addEventListener('load', initializeHandDetection);