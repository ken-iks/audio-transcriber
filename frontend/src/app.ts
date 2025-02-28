/**
 * 
 * Goal: Build a free transcription service. 
 *
 */

console.log("Script loaded");

/**
 * 
 * Helper functions for interacting with device I/O functions
 * Utilizes some scripts written in C++ to interact with the hardware
 * 
 */

// List all I/O media devices associated with Computer
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

// Get the device ID of the physical speaker input
async function get_physical_input(): Promise<string> {
    const media_arr = await get_media();
    console.log(media_arr);
    for (let i=0; i<media_arr.length; i++) {
        let device = media_arr[i];
        console.log("DEVICE ", i, " is called: ", device.label);
        if (device.label.includes("MacBook")) {
            console.log("Virtual input ID recieved");
            return device.deviceId;
        } 
    }
    console.log("Virtual Input ID not available");
    return "";
}

// Get the device ID of the physical speaker output
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

// Function for switching output device
async function switch_output_device(device: string): Promise<void> {
    try {
        const response = await fetch(`http://localhost:3000/run-audio-control?device=${device}`);
        const output = await response.text();
        console.log("Output from server:", output);

    } catch (error) {
        console.error("Error communicating with backend:", error);

    }
};

// Function for switching input device
async function record_from_speaker(): Promise<MediaStream | null> {
    try {
        let virtual_input_id: string = await get_physical_input()
            
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: virtual_input_id,
                channelCount: 2, // Stereo sound
                sampleRate: 44100, // CD Quality
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        console.log("MEDIA LOG GOTTEN")
        console.log(stream)
        return stream
    }  
    catch (error) {
        console.error("Couldn't resolve speaker input:", error);
        return null;
    } 
}

/**
 * 
 * Helper function for testing levels on input stream
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

async function transcribe(event_data: Blob): Promise<string> {
    const transciptionElement = document.getElementById("transcription")
    if (!transciptionElement) {
        return ""
    }
    transciptionElement.textContent = ""
    const mySpinnerElement = document.getElementById('spinner');
    if (!mySpinnerElement) {
        return ""
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
        const result = await (await response).text()
        console.log("Transcription result:", result);
        mySpinnerElement.classList.add('hidden');
        mySpinnerElement.setAttribute('aria-hidden', 'true');
        return result;
    } catch (error) {
        console.error("Error communicating with backend:", error);
        mySpinnerElement.classList.add('hidden');
        mySpinnerElement.setAttribute('aria-hidden', 'true');
        return  "";
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
 *
 */



async function main(): Promise<number> {
    let recorder: Recorder | null = null;

    try {
        let inputStream: MediaStream | null = null;

        document.getElementById("recordButton-1")!.addEventListener("click", async () => {
            if (recorder) {
                console.warn("A recording session is already in progress.");
                return;
            }

            console.log("Attempting to listen to audio input");

            inputStream = await record_from_speaker();

            if (inputStream) {
                console.log("Stream obtained");
                recorder = send_blobs(inputStream);
                recorder.start();
                console.log("Recording started...");
            } else {
                console.error("Failed to obtain audio stream.");
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
                const transcriptionResults = await transcribe(finalBlob); // Run transcription after recording ends

                // display transcription on screen
                const transcriptionDiv = document.getElementById("transcription");
                if (transcriptionDiv) {
                    transcriptionDiv.textContent = transcriptionResults;
                }
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
