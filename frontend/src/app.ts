import { start } from './visualizer.js';

console.log("Script loaded");

async function get_media(): Promise<Array<MediaDeviceInfo>> {
    let media_arr: Array<MediaDeviceInfo> = [];
    await navigator.mediaDevices.getUserMedia({audio: true});
    const stream = await navigator.mediaDevices.enumerateDevices();
    stream.forEach(
        (x) => {
            if (x.kind == "audioinput") {
                media_arr.push(x)
            }
         } 
    )
    return media_arr;
}

async function get_virtual_input(): Promise<string> {
    const media_arr = await get_media();
    console.log(media_arr);
    for (let i=0; i<media_arr.length; i++) {
        let device = media_arr[i];
        console.log("DEVICE ", i, " is called: ", device.label);
        if (device.label.includes("BlackHole")) {
            console.log("Virtual input ID recieved");
            return device.deviceId;
        } 
    }
    console.log("Virtual Input ID not available");
    return "";
}

// Will use to eventually output edited streams 
async function get_physical_output(): Promise<string> {
    let media_arr: Array<MediaDeviceInfo> = [];
    await navigator.mediaDevices.getUserMedia({audio: true});
    const stream = await navigator.mediaDevices.enumerateDevices();
    stream.forEach(
        (x) => {if 
            (x.kind == "audiooutput" && x.label.includes("MacBook")) {
                console.log(x);
                return x.deviceId;
            }
        }
    );
    return "";
}

async function switch_output_device(device: string): Promise<void> {
    try {
        const response = await fetch(`http://localhost:3000/run-audio-control?device=${device}`);
        const output = await response.text();
        console.log("Output from server:", output);

    } catch (error) {
        console.error("Error communicating with backend:", error);

    }
};

/**
 * 
 * Testing the input stream by generating audio visulization
 */

function play(stream: MediaStream): void {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyzer = context.createAnalyser();
    analyzer.fftSize = 256;
    const data_array = new Uint8Array(analyzer.frequencyBinCount);
    source.connect(analyzer);

    function log_audio_stream(): void {
        analyzer.getByteFrequencyData(data_array);
        const average_volume = data_array.reduce((sum, value) => sum + value, 0) / data_array.length;
        console.log("Average volume: ", average_volume); 
        requestAnimationFrame(log_audio_stream); // logs data at 60 frames per second
    };

    log_audio_stream();
}

/*
    Recording section for getting blobs from stream and sending them to backend
*/

interface Recorder {
    start: () => void;
    stop: () => Blob | null;
}

/**
 * Send audio chunks to backend for transcription
 */

async function transcibe(event_data: Blob): Promise<void> {
    try {
        const response = fetch("http://localhost:3000/receive-audio", {
            method: "POST",
            body: event_data,
            headers: {
                "Content-Type": "audio/webm",
            },
        });
        const result = await (await response).json();
        console.log("Transcription result:", result.transcription);
    } catch (error) {
        console.error("Error communicating with backend:", error);
    }
}

function send_blobs(stream: MediaStream) : Recorder {
    let media_recorder: MediaRecorder | null = null;
    let audio_chunks: Blob[] = [];
    let is_recording: boolean = false;

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

async function record_from_blackhole(): Promise<Recorder | null >  {
    try {
        let virtual_input_id: string;
        virtual_input_id = await get_virtual_input();
        console.log("BLACKHOLE INPUT ID: ", virtual_input_id);
        const media_stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { deviceId: virtual_input_id } 
        });
        console.log("MEDIA LOG GOTTEN");
        console.log(media_stream);
        return send_blobs(media_stream);

    } catch (error) {
        console.error("Couldn't resolve blackhole input:", error);
        return null;
    } 
}

async function main(): Promise<number> {
    try {
        //console.log("Attempting switch audio output to Blackhole");
        //switch_output_device("blackhole");
        console.log("Attempting to listen to blackhole audio input");
        const rec = record_from_blackhole();
        console.log("Attempting to create 10 seconds worth of audioblobs");
        
        (rec).then(
            (x) => {
                if (x) {
                    x.start();
                    setTimeout(() => {
                        const finalBlob = x.stop();
                        if (finalBlob) {
                            console.log("Final Blob:", finalBlob);
                        }
                    }, 10000);
                }      
                }
        );
    
        return 0;
    } catch {
        return -1;
    }
}

main();
