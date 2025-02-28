"use strict";
/**
 *
 * Goal: Build a free transcription service.
 *
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log("Script loaded");
/**
 *
 * Helper functions for interacting with device I/O functions
 * Utilizes some scripts written in C++ to interact with the hardware
 *
 */
// List all I/O media devices associated with Computer
function get_media() {
    return __awaiter(this, void 0, void 0, function* () {
        let media_arr = [];
        yield navigator.mediaDevices.getUserMedia({ audio: true });
        const stream = yield navigator.mediaDevices.enumerateDevices();
        stream.forEach((x) => {
            if (x.kind == "audioinput") {
                media_arr.push(x);
            }
        });
        return media_arr;
    });
}
// Get the device ID of the physical speaker input
function get_physical_input() {
    return __awaiter(this, void 0, void 0, function* () {
        const media_arr = yield get_media();
        console.log(media_arr);
        for (let i = 0; i < media_arr.length; i++) {
            let device = media_arr[i];
            console.log("DEVICE ", i, " is called: ", device.label);
            if (device.label.includes("MacBook")) {
                console.log("Virtual input ID recieved");
                return device.deviceId;
            }
        }
        console.log("Virtual Input ID not available");
        return "";
    });
}
// Get the device ID of the physical speaker output
function get_physical_output() {
    return __awaiter(this, void 0, void 0, function* () {
        let media_arr = [];
        yield navigator.mediaDevices.getUserMedia({ audio: true });
        const stream = yield navigator.mediaDevices.enumerateDevices();
        stream.forEach((x) => {
            if (x.kind == "audiooutput" && x.label.includes("MacBook")) {
                console.log(x);
                return x.deviceId;
            }
        });
        return "";
    });
}
// Function for switching output device
function switch_output_device(device) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`http://localhost:3000/run-audio-control?device=${device}`);
            const output = yield response.text();
            console.log("Output from server:", output);
        }
        catch (error) {
            console.error("Error communicating with backend:", error);
        }
    });
}
;
// Function for switching input device
function record_from_speaker() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let virtual_input_id = yield get_physical_input();
            const stream = yield navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: virtual_input_id,
                    channelCount: 2, // Stereo sound
                    sampleRate: 44100, // CD Quality
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            console.log("MEDIA LOG GOTTEN");
            console.log(stream);
            return stream;
        }
        catch (error) {
            console.error("Couldn't resolve speaker input:", error);
            return null;
        }
    });
}
/**
 *
 * Helper function for testing levels on input stream
 */
function play(stream) {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyzer = context.createAnalyser();
    analyzer.fftSize = 256;
    const data_array = new Uint8Array(analyzer.frequencyBinCount);
    source.connect(analyzer);
    function log_audio_stream() {
        analyzer.getByteFrequencyData(data_array);
        const average_volume = data_array.reduce((sum, value) => sum + value, 0) / data_array.length;
        console.log("Average volume: ", average_volume);
        requestAnimationFrame(log_audio_stream); // logs data at 60 frames per second
    }
    ;
    log_audio_stream();
}
/**
 * Send audio chunks to backend for transcription
 */
function transcribe(event_data) {
    return __awaiter(this, void 0, void 0, function* () {
        const transciptionElement = document.getElementById("transcription");
        if (!transciptionElement) {
            return "";
        }
        transciptionElement.textContent = "";
        const mySpinnerElement = document.getElementById('spinner');
        if (!mySpinnerElement) {
            return "";
        }
        mySpinnerElement.classList.remove('hidden');
        mySpinnerElement.removeAttribute('aria-hidden');
        try {
            const response = fetch("http://localhost:3000/receive-audio", {
                method: "POST",
                body: event_data,
                headers: {
                    "Content-Type": "audio/ogg",
                },
            });
            const result = yield (yield response).text();
            console.log("Transcription result:", result);
            mySpinnerElement.classList.add('hidden');
            mySpinnerElement.setAttribute('aria-hidden', 'true');
            return result;
        }
        catch (error) {
            console.error("Error communicating with backend:", error);
            mySpinnerElement.classList.add('hidden');
            mySpinnerElement.setAttribute('aria-hidden', 'true');
            return "";
        }
    });
}
function send_blobs(stream) {
    let media_recorder = null;
    let audio_chunks = [];
    let is_recording = false;
    return {
        start: () => {
            if (is_recording) {
                console.warn("Recording is already in progress.");
                return;
            }
            media_recorder = new MediaRecorder(stream);
            media_recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audio_chunks.push(event.data);
                    console.log("Audio chunk created:", event.data);
                }
            };
            media_recorder.start(100); // Start recording
            is_recording = true;
            console.log("Recording started...");
        },
        stop: () => {
            if (!is_recording || !media_recorder) {
                console.warn("No recording is in progress to stop.");
                return Promise.resolve(null);
            }
            return new Promise((resolve) => {
                media_recorder.onstop = () => {
                    const final_blob = new Blob(audio_chunks, { type: "audio/ogg; codecs=opus" });
                    console.log("Final Blob:", final_blob);
                    // Reset for the next recording session
                    audio_chunks = [];
                    resolve(final_blob);
                };
                media_recorder.stop();
                is_recording = false;
                console.log("Recording stopped...");
            });
        }
    };
}
/**
 *
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let recorder = null;
        try {
            let inputStream = null;
            document.getElementById("recordButton-1").addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                if (recorder) {
                    console.warn("A recording session is already in progress.");
                    return;
                }
                console.log("Attempting to listen to audio input");
                inputStream = yield record_from_speaker();
                if (inputStream) {
                    console.log("Stream obtained");
                    recorder = send_blobs(inputStream);
                    recorder.start();
                    console.log("Recording started...");
                }
                else {
                    console.error("Failed to obtain audio stream.");
                }
            }));
            document.getElementById("recordButton-2").addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                if (!recorder) {
                    console.warn("No recording session to stop.");
                    return;
                }
                console.log("Stopping recording...");
                const finalBlob = yield recorder.stop();
                if (finalBlob) {
                    console.log("Final recorded audio blob:", finalBlob);
                    const transcriptionResults = yield transcribe(finalBlob); // Run transcription after recording ends
                    const transcriptionDiv = document.getElementById("transcription");
                    if (transcriptionDiv) {
                        transcriptionDiv.textContent = transcriptionResults;
                    }
                    // display transcription on screen
                }
                // Reset recorder
                recorder = null;
            }));
            return 0;
        }
        catch (error) {
            console.error("Error in main function:", error);
            return -1;
        }
    });
}
main();
//# sourceMappingURL=app.js.map