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

    async function initCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode }
            });
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

    captureBtn.addEventListener('click', () => {
        if (!isCameraOn) {
            alert('Please turn on the camera to capture an image.');
            return;
        }
    
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
    
        const quality = evaluateImageQuality(canvas);
        alert(`Brightness: ${quality.brightness}, Sharpness: ${quality.sharpness}`);

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg');

        // Show loading state
        loadingSpinner.classList.remove('hidden');
        resultContainer.classList.remove('hidden');

        try {
            const result = await sendImageToModel(imageData);
            loadingSpinner.classList.add('hidden');
            displayResult('Analysis Complete!', result);
        } catch (error) {
            loadingSpinner.classList.add('hidden');
            displayResult('Error during analysis', { error: 'Failed to process image' });
        }
    });

    async function sendImageToModel(imageData) {
        const formData = new FormData();
        
        // Convert base64 image data to a Blob object and append it as a file in formData.
        const blob = await (await fetch(imageData)).blob();
        formData.append('file', blob, 'image.jpg');
    
        const response = await fetch('https://api-backend-5biy.onrender.com/predict', {
            method: 'POST',
            body: formData,
            headers: {
                // No need for additional headers since FormData sets them automatically.
            }
        });
    
        if (!response.ok) {
            throw new Error('Failed to send image to backend');
        }
    
        return await response.json();
    }

    function displayResult(message, result) {
        resultContent.innerHTML = `
            <div class="result-message">
                <h3>${message}</h3>
                <p>${result.has_dr ? 
                    'Diabetic Retinopathy detected (Confidence: ' + (result.prediction * 100).toFixed(2) + '%)' : 
                    'No Diabetic Retinopathy detected (Confidence: ' + ((1 - result.prediction) * 100).toFixed(2) + '%)'}
                </p>
            </div>
        `;
    }

    initCamera();
});
