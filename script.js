document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const toggleCameraBtn = document.getElementById('toggle-camera-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');
    const loadingSpinner = document.querySelector('.loading-spinner');

    let stream = null;
    let isCameraOn = true;
    let currentFacingMode = 'environment';

    async function initCamera(constraints = { video: { facingMode: currentFacingMode } }) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }

    function stopCamera() {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            stream = null;
        }
    }

    // File upload handling
    const fileUpload = document.getElementById('file-upload');
    const uploadBtn = document.getElementById('upload-btn');

    function addOverlayCanvas() {
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.id = "overlay";
        overlayCanvas.width = video.videoWidth || 350;
        overlayCanvas.height = video.videoHeight || 350;
        
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.strokeStyle = 'lime';
        overlayCtx.lineWidth = 5;
        overlayCtx.beginPath();
        overlayCtx.arc(overlayCanvas.width / 2, overlayCanvas.height / 2, overlayCanvas.height / 3, 0, Math.PI * 2);
        overlayCtx.stroke();
        
        document.querySelector('.scanner-box').appendChild(overlayCanvas);
    }

    function evaluateImageQuality(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let brightness = 0, sharpness = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            brightness += avg;
            if (i > 4) {
                sharpness += Math.abs(avg - pixels[i - 4]);
            }
        }
        
        brightness /= (canvas.width * canvas.height);
        sharpness /= (canvas.width * canvas.height);
        
        return { brightness: brightness.toFixed(2), sharpness: sharpness.toFixed(2) };
    }

    async function enhanceImage(imageDataURL) {
        try {
            const img = new Image();
            img.src = imageDataURL;
            await new Promise(resolve => img.onload = resolve);
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 512;
            tempCanvas.height = 512;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 512, 512);
            
            return tempCanvas.toDataURL('image/jpeg', 0.9);
        } catch (error) {
            throw new Error('Image enhancement failed');
        }
    }

    async function sendImageToModel(imageData) {
        const TIMEOUT_DURATION = 10000; // 10 seconds in milliseconds
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Analysis timeout after 10 seconds')), TIMEOUT_DURATION);
        });
        
        const analysisPromise = new Promise(async (resolve, reject) => {
            try {
                const blob = await (await fetch(imageData)).blob();
                
                const response = await fetch('https://api-inference.huggingface.co/models/oculotest/smart-scanner-model', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer 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'
                    },
                    body: blob
                });
                
                if (!response.ok) {
                    throw new Error('Failed to process image');
                }
                
                const result = await response.json();
                resolve({
                    predicted_label: result[0].label,
                    confidence: result[0].score * 100
                });
            } catch (error) {
                reject(error);
            }
        });
    
        try {
            return await Promise.race([analysisPromise, timeoutPromise]);
        } catch (error) {
            if (error.message.includes('timeout')) {
                throw new Error('Analysis timed out. Please try again.');
            }
            throw error;
        }
    }

    function displayResult(message, result) {
        const classLabels = {
            0: 'Normal',
            1: 'Mild',
            2: 'Moderate',
            3: 'Severe',
            4: 'Proliferative'
        };

        resultContent.innerHTML = `
            <div class="result-message">
                <h3>${message}</h3>
                <p>${result.predicted_label} (Confidence: ${result.confidence ? result.confidence.toFixed(2) : 0}%)</p>
            </div>
        `;
    }

    toggleCameraBtn.addEventListener('click', () => {
        if (isCameraOn) {
            stopCamera();
            toggleCameraBtn.textContent = 'Turn On Camera';
        } else {
            initCamera();
            toggleCameraBtn.textContent = 'Turn Off Camera';
        }
        isCameraOn = !isCameraOn;
    });

    switchCameraBtn.addEventListener('click', () => {
        currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        if (isCameraOn) {
            stopCamera();
            initCamera();
        }
    });

    captureBtn.addEventListener('click', async () => {
        if (!isCameraOn) {
            alert('Please turn on the camera to capture an image.');
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        let enhancedImageDataURL = await enhanceImage(canvas.toDataURL('image/jpeg', 0.9));
        
        loadingSpinner.classList.remove('hidden');
        
        try {
            const result = await sendImageToModel(enhancedImageDataURL);
            loadingSpinner.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            displayResult("Analysis Complete!", result);
        } catch (error) {
            loadingSpinner.classList.add('hidden');
            displayResult("Error during analysis", { predicted_label: "Failed to process image", confidence: 0 });
        }
    });

    uploadBtn.addEventListener('click', () => {
        fileUpload.click();
    });
    
    fileUpload.addEventListener('change', async (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            
            // Show loading state
            loadingSpinner.classList.remove('hidden');
            
            try {
                // Convert file to base64
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const imageData = e.target.result;
                    
                    // Create temporary image for resizing
                    const img = new Image();
                    img.onload = async () => {
                        // Create canvas for resizing
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = 512;
                        tempCanvas.height = 512;
                        const ctx = tempCanvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, 512, 512);
                        
                        // Get resized image data
                        const resizedImageData = tempCanvas.toDataURL('image/jpeg', 0.9);
                        
                        try {
                            const result = await sendImageToModel(resizedImageData);
                            loadingSpinner.classList.add('hidden');
                            resultContainer.classList.remove('hidden');
                            displayResult("Analysis Complete!", result);
                        } catch (error) {
                            loadingSpinner.classList.add('hidden');
                            displayResult("Error during analysis", { error: "Failed to process image" });
                        }
                    };
                    img.src = imageData;
                };
                reader.readAsDataURL(file);
                
            } catch (error) {
                loadingSpinner.classList.add('hidden');
                displayResult("Error during analysis", { error: "Failed to process image" });
            }
        }
    });

    initCamera().then(() => addOverlayCanvas());
});
