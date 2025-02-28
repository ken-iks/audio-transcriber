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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
    origin: "http://localhost:3001" 
}));
const PORT = 3000;

async function isAudioFile(buffer: Buffer<ArrayBufferLike>): Promise<boolean> {
    const type = await fileTypeFromBuffer(buffer);
    return type ? type.mime.startsWith('audio/') : false;
  };

  async function runTranscribe(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const pythonPath = "/Users/bigkenz/anaconda3/bin/python3"; 
        const scriptPath = path.resolve(__dirname, "transcribe.py"); 

        execFile(pythonPath, [scriptPath, filepath], (error, stdout, stderr) =>  {
            if (error) {
                reject(`Error executing script: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Script error: ${stderr}`);
                return;
            }

            const transcription = stdout.trim(); // Capture transcription output
            console.log("Transcription:", transcription);
            resolve(transcription);
        });
    });
}

async function AssemblyTranscribe(filepath: string) : Promise<string|null> {
    const audioData = await fs.readFileSync(filepath);
    let audioTest: boolean = await isAudioFile(audioData);
    if (audioTest){
        return runTranscribe(filepath);
    }
    return null
}

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

        async function getTranscription(): Promise<void> {
            const responseString = await AssemblyTranscribe(oggFilePath);
            if (responseString) {
                res.send(responseString)
            } else {
                console.error("Error in /receive-audio endpoint:");
                res.status(500).send("Internal Server Error");
            }   
        }

        getTranscription();

    } catch (error) {
        console.error("Error in /receive-audio endpoint:", error);
        res.status(500).send("Internal Server Error");
    }    
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});