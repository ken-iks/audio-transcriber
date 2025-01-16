import express from "express";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

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

        res.send(stdout);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});