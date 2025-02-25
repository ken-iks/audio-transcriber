var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 *
 * Goal: Build a free real time transcription service that just runs as continous partial transcription (which I can get for free)
 *       This will be the full scope of the project so that I can move on to something more interesting
 */
console.log("Script loaded");
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
// Will use to eventually output edited streams 
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
function switch_output_device(device) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`http://localhost:3000/run-audio-control?device=${device}`);
            //const output = await response.text();
            //console.log("Output from server:", output);
        }
        catch (error) {
            console.error("Error communicating with backend:", error);
        }
    });
}
;
/**
 *
 * Testing the input stream by generating audio visulization
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
        try {
            const response = fetch("http://localhost:3000/receive-audio", {
                method: "POST",
                body: event_data,
                headers: {
                    "Content-Type": "audio/ogg",
                },
            });
            const result = yield (yield response).json();
            console.log("Transcription result:", result.transcription);
        }
        catch (error) {
            console.error("Error communicating with backend:", error);
        }
    });
}
function send_blobs(stream) {
    let media_recorder = null;
    let audio_chunks = [];
    let is_recording = false;
    return {
        start: () => {
            play(stream);
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
 * TODO: Fix MediaRecorder
 * Audio plays from blackhole but it is not being recorded properly from blackhole input
 * When I try recording in quicktime player, it works fine, but when I play the file
 * produced from the audio blobs created with the MediaRecorder - static plays
 */
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
            console.error("Couldn't resolve blackhole input:", error);
            return null;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let recorder = null;
        try {
            //console.log("Attempting switch audio output to Blackhole");
            //switch_output_device("macbook");
            let blackholeInputStream = null;
            document.getElementById("recordButton-1").addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                if (recorder) {
                    console.warn("A recording session is already in progress.");
                    return;
                }
                console.log("Attempting to listen to blackhole audio input");
                blackholeInputStream = yield record_from_speaker();
                if (blackholeInputStream) {
                    console.log("Blackhole stream obtained");
                    recorder = send_blobs(blackholeInputStream);
                    recorder.start();
                    console.log("Recording started...");
                }
                else {
                    console.error("Failed to obtain blackhole audio stream.");
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
                    transcribe(finalBlob); // Run transcription after recording ends
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
export {};
//# sourceMappingURL=app.js.map