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

async function record_from_blackhole(): Promise<void>  {
    try {
        let virtual_input_id: string;
        virtual_input_id = await get_virtual_input();
        console.log("BLACKHOLE INPUT ID: ", virtual_input_id);
        const media_stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { deviceId: virtual_input_id } 
        });
        console.log("MEDIA LOG GOTTEN");
        console.log(media_stream);
        //start(media_stream);
        play(media_stream);
    } catch (error) {
        console.error("Couldn't resolve blackhole input:", error);
    } 
}

async function main(): Promise<number> {
    try {
        console.log("Attempting switch audio output to Blackhole");
        switch_output_device("blackhole");
        console.log("Attempting to listen to blackhole audio input");
        record_from_blackhole();
        return 0;
    } catch {
        return -1;
    }
}

main();
