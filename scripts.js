let camera, hands, videoElement, canvasElement, canvasCtx;
let lastTime = 0, frameCount = 0, fps = 0;
let detectionRunning = false, monitorVisible = false;
let alarmSound = document.getElementById('alarmSound');

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
        document.getElementById('loading').style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Check for camera availability first
        await checkCameraAvailability();
        
        videoElement = document.getElementById('video');
        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');
        
        hands = new Hands({
            locateFile: (file) => {
                return `./mediapipe/hands/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        hands.onResults(onResults);
        
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 640,
            height: 480,
            facingMode: 'user'
        });
        
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

function onResults(results) {
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

async function initializeHandDetection() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Check for camera availability first
        await checkCameraAvailability();
        
        videoElement = document.getElementById('video');
        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');
        
        hands = new Hands({
            locateFile: (file) => {
                return `./mediapipe/hands/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        hands.onResults(onResults);
        
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 640,
            height: 480,
            facingMode: 'user'
        });
        
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

function onResults(results) {
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
                await hands.send({image: videoElement});
            },
            width: 640,
            height: 480,
            facingMode: currentCamera
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
    detectionRunning = !detectionRunning;
    const btn = document.getElementById('toggleDetectionBtn');
    if (detectionRunning) {
        startCamera();
        btn.textContent = '停止监测';
    } else {
        stopCamera();
        btn.textContent = '开始监测';
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

// Initialize when page loads
window.addEventListener('load', initializeHandDetection);