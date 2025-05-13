const API_URL = 'http://localhost:3000/api';
let currentFilter = 'none';
let isModelLoaded = false;
let isVideoStarted = false;
let capturedImage = null;

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('captureButton');
const downloadButton = document.getElementById('downloadButton');
const filterSelect = document.getElementById('filterSelect');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// Photo Gallery functionality
const galleryContainer = document.getElementById('gallery-container');

// Load hat image
const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/hat.png';

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Load face-api models
async function loadModel() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        ]);
        isModelLoaded = true;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('startButton').disabled = false;
        loadFilterHistory();
    } catch (error) {
        console.error('Error loading face detection model:', error);
        showError('Failed to load face detection model. Please refresh the page.');
    }
}

// Start video stream
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 720,
                height: 560,
                facingMode: 'user'
            }
        });
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });
        
        isVideoStarted = true;
        startButton.textContent = 'Camera Started';
        startButton.disabled = true;
        captureButton.disabled = false;
        console.log('Video started successfully');
    } catch (error) {
        console.error('Camera error:', error);
        showError('Failed to access camera. Please make sure you have granted camera permissions.');
    }
}

// Load saved photos when the page loads
function loadSavedPhotos() {
    const savedPhotos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
    savedPhotos.forEach(photo => {
        addPhotoToGallery(photo.imageData, photo.filterName);
    });
}

// Save photo to localStorage
function savePhotoToStorage(imageData, filterName) {
    const savedPhotos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
    savedPhotos.push({
        imageData,
        filterName,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('capturedPhotos', JSON.stringify(savedPhotos));
}

// Add photo to gallery
function addPhotoToGallery(imageData, filterName) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.src = imageData;
    
    const filterLabel = document.createElement('div');
    filterLabel.className = 'filter-label';
    filterLabel.textContent = `Filter: ${filterName}`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        // Remove from gallery
        galleryItem.remove();
        // Remove from localStorage
        const savedPhotos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');
        const updatedPhotos = savedPhotos.filter(photo => photo.imageData !== imageData);
        localStorage.setItem('capturedPhotos', JSON.stringify(updatedPhotos));
    };
    
    galleryItem.appendChild(img);
    galleryItem.appendChild(filterLabel);
    galleryItem.appendChild(deleteBtn);
    galleryContainer.insertBefore(galleryItem, galleryContainer.firstChild);
}

// Capture photo
async function capturePhoto() {
    if (!video.srcObject) {
        showError('Please start the camera first');
        return;
    }

    try {
        const canvas = document.getElementById('canvas');
        const video = document.getElementById('video');
        const filterName = document.getElementById('filterSelect').value;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply the selected filter
        applyFilter(ctx, canvas.width, canvas.height, filterName);

        // Store the captured image
        capturedImage = canvas.toDataURL('image/png');
        
        // Add the photo to the gallery
        addPhotoToGallery(capturedImage, filterName);
        
        // Save to localStorage
        savePhotoToStorage(capturedImage, filterName);

        // Enable download button
        document.getElementById('downloadButton').disabled = false;

        // Show success message
        showError('Photo captured successfully!');

        // Keep showing the canvas with the captured photo
        canvas.style.display = 'block';
        video.style.display = 'none';

        // After 2 seconds, switch back to video
        setTimeout(() => {
            canvas.style.display = 'block';
            video.style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('Error capturing photo:', error);
        showError('Failed to capture photo');
    }
}

// Download photo
function downloadPhoto() {
    if (!capturedImage) return;
    
    const link = document.createElement('a');
    link.download = `face-filter-${new Date().toISOString()}.png`;
    link.href = capturedImage;
    link.click();
    
    console.log('Photo downloaded successfully');
}

// Filter selection
filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    console.log('Filter selected:', currentFilter);
    saveFilterToHistory(currentFilter);
});

// Save filter to history
async function saveFilterToHistory(filterName) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found in localStorage');
            return;
        }

        console.log('Saving filter to history:', filterName);
        const response = await fetch(`${API_URL}/filters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filterName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Filter saved successfully:', data);
        
        // Reload filter history after saving
        loadFilterHistory();
    } catch (error) {
        console.error('Error saving filter:', error);
    }
}

// Load filter history
async function loadFilterHistory() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found in localStorage');
            return;
        }

        console.log('Loading filter history...');
        const response = await fetch(`${API_URL}/filters`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const filterHistory = await response.json();
        console.log('Filter history loaded:', filterHistory);
        
        if (filterHistory && filterHistory.length > 0) {
            displayFilterHistory(filterHistory);
        } else {
            console.log('No filter history found');
        }
    } catch (error) {
        console.error('Error loading filter history:', error);
    }
}

// Display filter history
function displayFilterHistory(history) {
    console.log('Displaying filter history:', history);
    
    // Remove existing history container if it exists
    const existingHistory = document.querySelector('.filter-history');
    if (existingHistory) {
        existingHistory.remove();
    }

    const historyContainer = document.createElement('div');
    historyContainer.className = 'filter-history';
    
    const recentFilters = history.slice(-5).reverse();
    console.log('Recent filters to display:', recentFilters);

    historyContainer.innerHTML = `
        <h3>Recently Used Filters</h3>
        <ul>
            ${recentFilters.map(filter => `
                <li>
                    <span>${filter.filterName}</span>
                    <small>${new Date(filter.timestamp).toLocaleString()}</small>
                </li>
            `).join('')}
        </ul>
    `;

    const controls = document.querySelector('.controls');
    if (controls) {
        controls.appendChild(historyContainer);
    } else {
        console.error('Controls container not found');
    }
}

// Filter application
function applyFilter(ctx, width, height, filterName) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (filterName) {
        case 'sepia':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
            break;

        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }
            break;

        case 'vintage':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.2);
                data[i + 1] = Math.min(255, data[i + 1] * 0.9);
                data[i + 2] = Math.min(255, data[i + 2] * 0.8);
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
            break;

        case 'noir':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const value = avg > 128 ? 255 : 0;
                data[i] = value;
                data[i + 1] = value;
                data[i + 2] = value;
            }
            break;

        case 'blur':
            // Apply Gaussian blur
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.putImageData(imageData, 0, 0);
            
            ctx.filter = 'blur(5px)';
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.filter = 'none';
            return; // Skip the putImageData since we already drew to the canvas
    }

    ctx.putImageData(imageData, 0, 0);

    // Apply hat overlay if needed
    if (filterName === 'hat' || filterName === 'hat-blur') {
        const detections = faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        if (detections && detections.length > 0) {
            const face = detections[0];
            const landmarks = face.landmarks;
            
            // Calculate hat position based on face landmarks
            const nose = landmarks.getNose()[0];
            const leftEye = landmarks.getLeftEye()[0];
            const rightEye = landmarks.getRightEye()[0];
            
            const hatWidth = (rightEye.x - leftEye.x) * 2;
            const hatHeight = hatWidth * 0.5;
            
            // Draw hat
            ctx.drawImage(
                hatImage,
                nose.x - hatWidth/2,
                nose.y - hatHeight * 1.5,
                hatWidth,
                hatHeight
            );
        }
    }
}

// Face detection and filter application
video.addEventListener('play', () => {
    canvas.width = video.width;
    canvas.height = video.height;
    
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (!isModelLoaded) return;

        const detections = await faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply selected filter in real-time
        if (currentFilter !== 'none') {
            applyFilter(ctx, canvas.width, canvas.height, currentFilter);
        }

        // Show canvas with filter while video is playing
        canvas.style.display = 'block';
        video.style.display = 'none';
    }, 100);
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    loadModel();
    loadSavedPhotos(); // Load saved photos when page loads
});

startButton.addEventListener('click', async () => {
    console.log('Start button clicked');
    await startVideo();
    startDetection();
});

captureButton.addEventListener('click', () => {
    console.log('Capture button clicked');
    capturePhoto();
});

downloadButton.addEventListener('click', () => {
    console.log('Download button clicked');
    downloadPhoto();
});

filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    console.log('Filter changed to:', currentFilter);
}); 