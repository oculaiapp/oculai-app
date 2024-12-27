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

    // Initialize the camera
    async function initCamera(constraints = { video: { facingMode: currentFacingMode } }) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }

    // Stop the camera
    function stopCamera() {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            stream = null;
        }
    }

    // Populate camera options dropdown
    async function populateCameraOptions() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        const cameraOptions = document.createElement('select');
        cameraOptions.id = "camera-options";

        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            cameraOptions.appendChild(option);
        });

        document.querySelector('.camera-controls').appendChild(cameraOptions);

        cameraOptions.addEventListener('change', () => {
            currentFacingMode = cameraOptions.value;
            if (isCameraOn) {
                stopCamera();
                initCamera({ video: { deviceId: { exact: currentFacingMode } } });
            }
        });
    }

    // Add AR overlay canvas
    function addOverlayCanvas() {
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.id = "overlay";
        
        overlayCanvas.width = video.videoWidth || 350; // Default width if video not initialized yet
        overlayCanvas.height = video.videoHeight || 350;

        const overlayCtx = overlayCanvas.getContext('2d');
        
        // Draw a circular guide for alignment
        overlayCtx.strokeStyle = 'lime';
        overlayCtx.lineWidth = 5;
        
        overlayCtx.beginPath();
        overlayCtx.arc(overlayCanvas.width / 2, overlayCanvas.height / 2, overlayCanvas.height / 3, 0, Math.PI * 2);
        overlayCtx.stroke();

        document.querySelector('.scanner-box').appendChild(overlayCanvas);
    }

    // Evaluate image quality (brightness and sharpness)
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

    // Enhance image using AI preprocessing
    async function enhanceImage(imageDataURL) {
        let image = await IJS.Image.load(imageDataURL);
        
        // Convert to grayscale and enhance contrast
        let enhancedImage = image.grey().enhance({ algorithm: 'contrast' });
        
        return enhancedImage.toDataURL(); // Return enhanced image as Base64
    }

    // Send image to backend API for analysis
    async function sendImageToModel(imageData) {
        const formData = new FormData();
        
        // Convert base64 image data to a Blob object and append it as a file in formData.
        const blob = await (await fetch(imageData)).blob();
        formData.append('file', blob, 'image.jpg');

        const response = await fetch('https://api-backend-5biy.onrender.com/predict', {
            method: 'POST',
            body: formData,
            headers: {}
        });

        if (!response.ok) {
            throw new Error('Failed to send image to backend');
        }

        return await response.json();
    }

    // Display analysis results
    function displayResult(message, result) {
        resultContent.innerHTML = `
            <div class="result-message">
                <h3>${message}</h3>
                <p>${result.has_dr ? 
                    'Diabetic Retinopathy detected (Confidence: ' + (result.dr_confidence * 100).toFixed(2) + '%)' : 
                    'No Diabetic Retinopathy detected.'}
                </p>
                <p>${result.has_glaucoma ? 
                    'Glaucoma detected (Confidence: ' + (result.glaucoma_confidence * 100).toFixed(2) + '%)' : 
                    'No Glaucoma detected.'}
                </p>
            </div>
        `;
    }

    // Upload offline images when online
    function uploadOfflineImages() {
        for (let key in localStorage) {
            if (key.startsWith('image-')) {
                const imageData = localStorage.getItem(key);
                sendImageToModel(imageData).then(response => {
                    console.log("Uploaded:", response);
                    localStorage.removeItem(key); // Remove after successful upload
                }).catch(error => console.error("Upload failed:", error));
            }
        }
    }

    // Event listeners for buttons
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

        // Capture and enhance the image
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        let enhancedImageDataURL = await enhanceImage(canvas.toDataURL());
        
        // Evaluate image quality
        const quality = evaluateImageQuality(canvas);
        
        alert(`Brightness: ${quality.brightness}, Sharpness: ${quality.sharpness}`);

        // Show loading state
        loadingSpinner.classList.remove('hidden');
        
        try {
            const result = await sendImageToModel(enhancedImageDataURL);
            
            loadingSpinner.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            
            displayResult("Analysis Complete!", result);
            
            localStorage.setItem(`image-${Date.now()}`, enhancedImageDataURL); // Save offline

         } catch (error) {
             loadingSpinner.classList.add('hidden');
             displayResult("Error during analysis", { error: "Failed to process image" });
         }
     });

     window.addEventListener('online', uploadOfflineImages);

     // Initialize everything
     initCamera().then(() => addOverlayCanvas());
     populateCameraOptions();
});
