import whisper
import sys
import warnings
warnings.filterwarnings("ignore")


print("Python script executing")

def main(filepath: str):
    model = whisper.load_model("tiny.en")
    result = model.transcribe(filepath)
    print(result["text"])
    return result["text"]

if __name__ == "__main__":
    if len(sys.argv) > 1:  # Check if a filepath argument is provided
        main(sys.argv[1])
    else:
        print("Error: No filepath provided.")

