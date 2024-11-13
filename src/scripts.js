const localMediaPipePath = './mediapipe';

let camera = null, hands, videoElement, canvasElement, canvasCtx;
let lastTime = 0, frameCount = 0, fps = 0;
let detectionRunning = false, monitorVisible = false;
let alarmSound = document.getElementById('alarmSound');
let debugEnabled = false;
let isDetectionEnabled = false;
let lastFrameTime = 0;
let errorDebounce = false;
const frameInterval = 1000 / 30; // 30 FPS max

let availableCameras = [];
let idxCurrentCamera = 0;

async function initializeCamera() {
    videoElement = document.getElementById('video');

    if (!videoElement) {
        showError('Video element not found');
        return;
    }

    availableCameras = await getAvailableCameras();

    if (availableCameras.length === 0) {
        showError('No camera devices found');
        return;
    }
    console.log('Cameras:', availableCameras.map(camera => camera.label));

    idxCurrentCamera = 0;
    console.log('Using camera:', availableCameras[idxCurrentCamera].label);
}

async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
            .filter(device => device.kind === 'videoinput')
            .filter(device => !device.label.toUpperCase().includes('NVIDIA'))
            ;
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
        showMessage('AI 模型加载 ...');

        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');

        if (!canvasElement || !canvasCtx) {
            showError('Canvas element not found');
            return;
        }

        console.log('Creating Hands instance...');
        hands = new Hands({
            locateFile: (file) => {
                console.log('Loading AI models', file);
                return `mediapipe/hands/${file}`;
            }
        });

        await hands.initialize();
        
        showMessage("加载识别配置项 ...");
        console.log('Setting hands options...');
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        console.log('Setting up results handler...');
        hands.onResults(onResults);
        
        showMessage("初始化摄像头 ...");
        console.log('Initializing camera...');
        await setupCameraSystem();
        
        console.log('Initialization complete');
        hideMessage();
        
        toggleMonitor();
        
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
        // console.log('Results received:', results);
        
        if (results.multiHandLandmarks) {
            // console.log('Hands detected:', results.multiHandLandmarks.length);
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
                // Draw connections with a softer blue color
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: 'rgba(61, 153, 245, 0.7)', // Transparent light blue
                    lineWidth: 3
                });
                
                // Draw landmarks with a gentle teal color
                drawLandmarks(canvasCtx, landmarks, {
                    color: 'rgba(48, 184, 178, 0.8)', // Transparent teal
                    lineWidth: 1,
                    radius: 3 // Smaller points
                });
            }
        }
        canvasCtx.restore();
    } catch (error) {
        console.error('Error in onResults:', error);
    }
}

const isElectron = window.electronAPI !== undefined;

async function getCameraPermissions() {
    if (isElectron) {
        return await window.electronAPI.getCameraPermissions();
    } else {
        return await navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => true)
            .catch(() => false);
    }
}

async function startCamera() {
    showMessage('启动摄像头 ... ' + (mode == 'environment' ? '前置' : '后置'));
    // wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));
    hideMessage();

    try {
        // Request permission first
        const permission = await getCameraPermissions();
        if (!permission) {
            throw new Error('Camera permission denied');
        }

        // Stop camera if already running
        if (camera) {
            await stopCamera();
        }

        // const constraints = {
        //     video: {
        //         deviceId: { exact: availableCameras[idxCurrentCamera].deviceId },
        //         width: { ideal: 640 },
        //         height: { ideal: 480 }
        //     }
        // };

        // const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // videoElement.srcObject = stream;

        // Create Camera instance with frame processing
        camera = new Camera(videoElement, {
            onFrame: async () => {
                try {
                    if (isDetectionEnabled) {
                        // Add frame throttling
                        if (!lastFrameTime || performance.now() - lastFrameTime > frameInterval) {
                            await hands.send({ image: videoElement });
                            lastFrameTime = performance.now();
                        }
                    }
                } catch (error) {
                    console.error('Frame processing error:', error);
                    if (!errorDebounce) {
                        errorDebounce = true;
                        showError(`Frame processing error: ${error.message}`);
                        setTimeout(() => errorDebounce = false, 1000);
                    }
                }
            },
            width: 640,
            height: 480,
            // cameraId: availableCameras[idxCurrentCamera].deviceId
            facingMode: cameraId2FacingMode(idxCurrentCamera)
        });

        await camera.start();

        // return new Promise((resolve) => {
        //     videoElement.onloadedmetadata = () => {
        //         videoElement.play();
        //         resolve(videoElement);
        //     };
        // });
    } catch (error) {
        console.error('Camera start error:', error);
        throw new Error(`Camera start failed: ${error.message}`);
    }
}

let mode = 'default';
function cameraId2FacingMode(idx) {
    mode = ((mode == 'environment') ? 'user' : 'environment');
    return mode;
}

function stopCamera() {
    // if (videoElement && videoElement.srcObject) {
    //     const tracks = videoElement.srcObject.getTracks();
    //     tracks.forEach(track => track.stop());
    //     videoElement.srcObject = null;
    // }
    if (camera) {
        camera.stop();
        camera = null;
    }
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('message-toast').style.display = 'none';
}

async function switchCamera() {
    try {
        idxCurrentCamera = (idxCurrentCamera + 1) % availableCameras.length;

        await stopCamera();
        await startCamera();

        console.log('Switched camera:', availableCameras[idxCurrentCamera].label);
    }
    catch (error) {
        console.error('Error switching camera:', error);
        showError(`Failed to switch camera: ${error.message}`);
    }
}

async function setupCameraSystem() {
    try {
        await initializeCamera();
        await startCamera();
    } catch (error) {
        console.error('Error setting up camera system:', error);
        showError(`Camera setup failed: ${error.message}`);
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
        console.log('Detection started');
    } else {
        canvasElement = document.getElementById('output');
        canvasCtx = canvasElement.getContext('2d');
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        console.log('Detection stopped');
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

function cleanupResources() {
    if (camera) {
        camera.stop();
        camera = null;
    }
    if (hands) {
        hands.close();
    }
    if (alarmSound) {
        alarmSound.pause();
    }
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
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

function showMessage(message = '工作中 ...') {
    const elm = document.getElementById('message-toast');
    elm.textContent = message;
    elm.style.display = 'block';
}

function hideMessage() {
    const elm = document.getElementById('message-toast');
    elm.style.display = 'none';
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
window.addEventListener('beforeunload', cleanupResources);