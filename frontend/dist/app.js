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
function get_virtual_input() {
    return __awaiter(this, void 0, void 0, function* () {
        const media_arr = yield get_media();
        console.log(media_arr);
        for (let i = 0; i < media_arr.length; i++) {
            let device = media_arr[i];
            console.log("DEVICE ", i, " is called: ", device.label);
            if (device.label.includes("BlackHole")) {
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
            const output = yield response.text();
            console.log("Output from server:", output);
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
function transcibe(event_data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = fetch("http://localhost:3000/receive-audio", {
                method: "POST",
                body: event_data,
                headers: {
                    "Content-Type": "audio/webm",
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
            if (is_recording) {
                console.warn("Recording is already in progress.");
                return;
            }
            media_recorder = new MediaRecorder(stream);
            media_recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audio_chunks.push(event.data);
                    console.log("Audio chunk created:", event.data);
                    console.log("Attempting Transcription");
                    // SENDING MOST RECENT BLOB TO BACKEND
                    transcibe(audio_chunks[audio_chunks.length - 1]);
                    // TEST
                }
            };
            media_recorder.start(3000); // Trigger `ondataavailable` every 3 seconds
            is_recording = true;
            console.log("Recording started...");
        },
        stop: () => {
            if (!is_recording || !media_recorder) {
                console.warn("No recording is in progress to stop.");
                return null;
            }
            media_recorder.stop();
            is_recording = false;
            console.log("Recording stopped.");
            const final_blob = new Blob(audio_chunks, { type: "audio/webm" });
            console.log("Final Blob:", final_blob);
            // Reset audio_chunks for the next recording session
            audio_chunks = [];
            // Return the final blob for further processing
            return final_blob;
        }
    };
}
function record_from_blackhole() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let virtual_input_id;
            virtual_input_id = yield get_virtual_input();
            console.log("BLACKHOLE INPUT ID: ", virtual_input_id);
            const media_stream = yield navigator.mediaDevices.getUserMedia({
                audio: { deviceId: virtual_input_id }
            });
            console.log("MEDIA LOG GOTTEN");
            console.log(media_stream);
            return send_blobs(media_stream);
        }
        catch (error) {
            console.error("Couldn't resolve blackhole input:", error);
            return null;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //console.log("Attempting switch audio output to Blackhole");
            //switch_output_device("blackhole");
            console.log("Attempting to listen to blackhole audio input");
            const rec = record_from_blackhole();
            console.log("Attempting to create 10 seconds worth of audioblobs");
            (rec).then((x) => {
                if (x) {
                    x.start();
                    setTimeout(() => {
                        const finalBlob = x.stop();
                        if (finalBlob) {
                            console.log("Final Blob:", finalBlob);
                        }
                    }, 10000);
                }
            });
            return 0;
        }
        catch (_a) {
            return -1;
        }
    });
}
main();
export {};
//# sourceMappingURL=app.js.map