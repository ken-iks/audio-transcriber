# Free Transcription Service

## Overview
This project is a **free transcription service** that allows users to record audio, process it via a backend server, and display the transcribed text in an intuitive web interface. The application leverages **Web Audio API**, **Express.js**, and **Python (via a subprocess call)** to handle audio recording, processing, and transcription.

## Features
- **Audio Recording**: Users can start and stop recording through a clean UI.
- **Real-time Processing**: The backend processes audio using `ffmpeg` and a Python transcription script.
- **Device Selection**: Identifies available audio input/output devices.
- **Live Transcription**: Converts audio input into text dynamically.

## Tech Stack
### Frontend
- **HTML, CSS, JavaScript (TypeScript)**
- **Web Audio API**
- **Modern UI with CSS styling**

### Backend
- **Node.js & Express.js**
- **FFmpeg** for audio conversion
- **Python** for transcription processing
- **CORS** for frontend-backend communication

## Installation
### Prerequisites
Ensure you have the following installed:
- **Node.js** (v18+ recommended)
- **FFmpeg** (for audio conversion)
- **Python3** (with required transcription dependencies)

## Usage
1. Open `http://localhost:3001` in your browser.
2. Click **Start Recording** to begin capturing audio.
3. Click **Stop Recording** to process the audio.
4. View the transcription in the dynamically expanding text box.

## API Endpoints
### `GET /run-audio-control?device={device}`
Switches the active audio device.

### `POST /receive-audio`
Accepts recorded audio and returns a transcription.

## Future Improvements
- **Improved UI/UX** (Add better animations and visual feedback)
- **Support for More Audio Formats**
- **Backend Scalability** (Cloud storage for processed audio)
- **Enhanced Speech-to-Text Models**

## Contributing
Feel free to submit pull requests or issues!
