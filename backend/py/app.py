import sys
import whisper

# Load Whisper model
model = whisper.load_model("tiny.en")

def main():
    if len(sys.argv) < 2:
        print("Error: No audio file path provided.", file=sys.stderr)
        sys.exit(1)
    
    print("python script running")

    # Get the audio file path from the command-line argument
    audio_file_path = sys.argv[1]

    # Transcribe the audio file
    result = model.transcribe(audio_file_path, fp16=False)  # Adjust fp16 based on your hardware
    transcription = result["text"]

    # Output the transcription to stdout
    print(transcription)

if __name__ == "__main__":
    main()

