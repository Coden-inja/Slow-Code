import os
import subprocess
import shutil
import sys

def setup():
    print("Setting up Plant Disease Detection System...")
    
    # Install requirements
    print("Installing required packages...")
    
    # Try to install TensorFlow separately first (with a fallback option)
    try:
        print("Installing TensorFlow...")
        # On Windows, TensorFlow 2.10.0 is more stable
        if sys.platform == 'win32':
            subprocess.run(["pip", "install", "tensorflow==2.10.0"])
        else:
            subprocess.run(["pip", "install", "tensorflow"])
        print("TensorFlow installed successfully!")
    except Exception as e:
        print(f"Warning: Failed to install TensorFlow: {e}")
        print("The system will continue setup but online image detection may not work.")
        print("You will still be able to use the symptom-based detection and offline mode.")
    
    # Install other requirements
    try:
        subprocess.run(["pip", "install", "-r", "requirements.txt"])
    except Exception as e:
        print(f"Warning: Failed to install some requirements: {e}")
    
    # Create necessary directories
    print("Creating necessary directories...")
    os.makedirs("input_folder", exist_ok=True)
    os.makedirs("static/model", exist_ok=True)
    
    # Try to convert model for offline use
    print("Converting model to TensorFlow.js format...")
    try:
        result = subprocess.run(["python", "convert_model.py"], capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Errors during conversion:")
            print(result.stderr)
    except Exception as e:
        print(f"Error during model conversion: {e}")
        print("You can try running 'python convert_model.py' manually.")
    
    # Create a simplified README with setup instructions
    print("Creating basic setup instructions...")
    try:
        with open("SETUP_GUIDE.md", "w") as f:
            f.write("""# Plant Disease Detection Setup Guide

## Quick Start
1. Run the Flask app: `flask run`
2. Open your browser at http://localhost:5000
3. If online mode doesn't work, switch to offline mode in the app

## Troubleshooting
- If image detection fails in online mode, use the offline mode
- If you encounter any TensorFlow errors, the symptom-based detection should still work

## Dependencies
- Flask
- TensorFlow (optional, for online mode)
- Google Gemini API (for symptom-based detection)
            """)
    except Exception as e:
        print(f"Error creating setup guide: {e}")
    
    print("\nSetup completed!")
    print("\nTo run the application:")
    print("1. Execute: flask run")
    print("2. Open your browser and navigate to: http://localhost:5000")
    print("\nImportant Notes:")
    print("- If online mode doesn't work, use the offline mode in the application")
    print("- The symptom-based detection should work regardless of TensorFlow status")

if __name__ == "__main__":
    setup() 