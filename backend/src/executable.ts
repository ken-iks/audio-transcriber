import express from "express";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { stdout } from "process";
import fs from "fs";
import os from "os";

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

    });
    res.status(200).send(stdout);
});


// Endpoint to run audio transcription logic
app.post("/receive-audio", express.raw({ type: "audio/webm", limit: "10mb" }), (req, res) => {
    try {
        console.log("Audio transcription endpoint running");
        const executablePath = path.resolve(__dirname, "../py/app.py");
 
        // Write the audio blob to a temporary file
        const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, req.body);
        console.log(`Audio file saved to ${tempFilePath}`);

        execFile("python", [executablePath, tempFilePath], (error: any, stdout: any, stderr: any) => {
            // Clean up the temporary file after processing
            fs.unlinkSync(tempFilePath);

            if (error) {
                console.error(`Error running Python script: ${error.message}`);
                return res.status(500).send("Error processing audio.");
            }
            if (stderr) {
                console.error(`Python script error: ${stderr}`);
                return res.status(500).send("Python script error.");
            }
            console.log("Python script output:", stdout);
            res.status(200).send({ transcription: stdout.trim() }); // Send transcription or other output
        });
    } catch (error) {
        console.error("Error in /receive-audio endpoint:", error);
        res.status(500).send("Internal Server Error");
    }    
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});