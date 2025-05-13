const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_FILES = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
];

// Updated URL to use the correct path
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const MODELS_DIR = path.join(__dirname, 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR);
} else {
    // Clean existing files
    fs.readdirSync(MODELS_DIR).forEach(file => {
        fs.unlinkSync(path.join(MODELS_DIR, file));
    });
}

console.log('Downloading model files...');

// Download each model file
MODEL_FILES.forEach(file => {
    const filePath = path.join(MODELS_DIR, file);
    const fileUrl = MODEL_URL + file;
    
    console.log(`Downloading ${file} from ${fileUrl}`);
    
    https.get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${file}: ${response.statusCode}`);
            return;
        }
        
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Successfully downloaded: ${file}`);
        });
    }).on('error', (err) => {
        console.error(`Error downloading ${file}:`, err.message);
    });
}); 