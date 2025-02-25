import express from "express";
import { execFile, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { stdout } from "process";
import fs from "fs";
import os from "os";
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';



export interface Data_Input {
    audio: string
}

async function isAudioFile(buffer: Buffer<ArrayBufferLike>): Promise<boolean> {
    const type = await fileTypeFromBuffer(buffer);
    return type ? type.mime.startsWith('audio/') : false;
  };

  async function runTranscribe(filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'transcribe.py'); // Ensure correct path
        const command = `/Users/bigkenz/anaconda3/bin/python3 ${scriptPath} "${filepath}"`;

        execFile(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing script: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Script error: ${stderr}`);
                return;
            }

            console.log("Transcription:", stdout.trim());
            resolve();
        });
    });
}

async function AssemblyTranscribe(filepath: string) : Promise<void> {
    const audioData = await fs.readFileSync(filepath);
    isAudioFile(audioData).then(isAudio =>
        runTranscribe(filepath)
    )
}

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename);       // Get the directory name

const app = express();
app.use(cors({
    origin: "http://localhost:3001" // Replace with your frontend's URL
}));
const PORT = 3000;

// Endpoint to run the audio control logic
app.get("/run-audio-control", (req, res) => {
    const device = req.query.device || "macbook";
    const executablePath = path.resolve(__dirname, "../build/audio_control");

    execFile(executablePath, [device as string], (error, stdout, stderr) => {
        if (error) {
            console.error("Error executing audio_control:", error);
            return res.status(500).send(`Error: ${error.message}`);
        }

        if (stderr) {
            console.warn("Warning from audio_control:", stderr);
        }

        res.status(200).send(stdout || "Execution completed with no output");
    });
});


// Endpoint to run audio transcription logic
app.post("/receive-audio", express.raw({ type: "audio/ogg", limit: "10mb" }), (req, res) => {
    try {
        console.log("Audio transcription endpoint running");
        console.log("Received audio buffer:", req.body);
        console.log("Buffer length:", req.body.length);
 
        // Write the audio blob to a temporary file
        const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempFilePath, req.body);

        const oggFilePath = tempFilePath.replace(".ogg", "_converted.ogg");
        execSync(`ffmpeg -i ${tempFilePath} -acodec libopus ${oggFilePath}`);
        console.log(`Audio file saved to ${oggFilePath}`);

        AssemblyTranscribe(oggFilePath);

    } catch (error) {
        console.error("Error in /receive-audio endpoint:", error);
        res.status(500).send("Internal Server Error");
    }    
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});