# Face Filter Web Application

A web application that uses your webcam to detect faces and apply fun filters, similar to Snapchat.

## Features

- Real-time face detection
- Multiple filters (glasses, hat, mustache)
- Easy to use interface
- Responsive design

## Setup

1. Make sure you have Node.js installed on your computer
2. Clone this repository
3. Run the setup script to download the required face detection models:
   ```bash
   node setup.js
   ```
4. Start a local web server. You can use any of these methods:
   - Using Python:
     ```bash
     # Python 3
     python -m http.server 8000
     # Python 2
     python -m SimpleHTTPServer 8000
     ```
   - Using Node.js (install `http-server` first):
     ```bash
     npx http-server
     ```
5. Open your web browser and navigate to:
   - If using Python: `http://localhost:8000`
   - If using http-server: `http://localhost:8080`

## Usage

1. Click the "Start Camera" button to begin
2. Allow camera access when prompted
3. Select a filter from the dropdown menu
4. Have fun with the filters!

## Requirements

- Modern web browser with WebRTC support
- Webcam
- Internet connection (for initial model download)

## Note

The face detection models are downloaded locally during setup, so you don't need an internet connection after the initial setup. 