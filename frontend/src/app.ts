import { start } from './visualizer.js';

/**
 * 
 * Goal: Build a free real time transcription service that just runs as continous partial transcription (which I can get for free)
 *       This will be the full scope of the project so that I can move on to something more interesting
 */

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
        //const output = await response.text();
        //console.log("Output from server:", output);

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
    stop: () => Promise<Blob | null>;
}

/**
 * Send audio chunks to backend for transcription
 */

async function transcribe(event_data: Blob): Promise<void> {
    try {
        const response = fetch("http://localhost:3000/receive-audio", {
            method: "POST",
            body: event_data,
            headers: {
                "Content-Type": "audio/ogg",
            },
        });
        const result = await (await response).json();
        console.log("Transcription result:", result.transcription);
    } catch (error) {
        console.error("Error communicating with backend:", error);
    }
}

function send_blobs(stream: MediaStream): Recorder {
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
                }
            };

            media_recorder.start(100); // Start recording
            is_recording = true;
            console.log("Recording started...");
        },

        stop: (): Promise<Blob | null> => {
            if (!is_recording || !media_recorder) {
                console.warn("No recording is in progress to stop.");
                return Promise.resolve(null);
            }

            return new Promise<Blob | null>((resolve) => {
                media_recorder!.onstop = () => {
                    const final_blob = new Blob(audio_chunks, { type: "audio/ogg; codecs=opus" });
                    console.log("Final Blob:", final_blob);

                    // Reset for the next recording session
                    audio_chunks = [];

                    resolve(final_blob);
                };

                media_recorder!.stop();
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

async function record_from_blackhole(): Promise<MediaStream | null> {
    try {
        let virtual_input_id: string;
        virtual_input_id = await get_virtual_input();
        console.log("BLACKHOLE INPUT ID: ", virtual_input_id);
        const media_stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { deviceId: virtual_input_id } 
        });
        console.log("MEDIA LOG GOTTEN");
        console.log(media_stream);
        return media_stream

    } catch (error) {
        console.error("Couldn't resolve blackhole input:", error);
        return null;
    } 
}

async function main(): Promise<number> {
    let recorder: Recorder | null = null;

    try {
        console.log("Attempting switch audio output to Blackhole");
        switch_output_device("blackhole");

        let blackholeInputStream: MediaStream | null = null;

        document.getElementById("recordButton-1")!.addEventListener("click", async () => {
            if (recorder) {
                console.warn("A recording session is already in progress.");
                return;
            }

            console.log("Attempting to listen to blackhole audio input");

            blackholeInputStream = await record_from_blackhole();

            if (blackholeInputStream) {
                console.log("Blackhole stream obtained");
                recorder = send_blobs(blackholeInputStream);
                recorder.start();
                console.log("Recording started...");
            } else {
                console.error("Failed to obtain blackhole audio stream.");
            }
        });

        document.getElementById("recordButton-2")!.addEventListener("click", async () => {
            if (!recorder) {
                console.warn("No recording session to stop.");
                return;
            }

            console.log("Stopping recording...");
            const finalBlob = await recorder.stop();

            if (finalBlob) {
                console.log("Final recorded audio blob:", finalBlob);
                transcribe(finalBlob); // Run transcription after recording ends
            }

            // Reset recorder
            recorder = null;
        });

        return 0;
    } catch (error) {
        console.error("Error in main function:", error);
        return -1;
    }
}


main();
