import subprocess
import threading
import time
import os
import sys


def run_backend():
    print("🚀 Starting Backend (Port 8000)...")
    # Use sys.executable to ensure the current Python environment is used
    # --reload is crucial for auto-reloading on code changes
    cmd = (
        f'"{sys.executable}" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000'
    )
    subprocess.run(cmd, cwd="backend", shell=True)


def run_frontend():
    print("🚀 Starting Frontend (Port 5173)...")
    # Using string command with shell=True for reliable execution on Windows
    subprocess.run("npm run dev", cwd="frontend", shell=True)


if __name__ == "__main__":
    print("🤖 AutoDS System Startup")
    print("========================")
    print("ℹ️  Both Backend and Frontend are running in RELOAD mode.")
    print("ℹ️  Edits to files will automatically update the app.")

    # Start Backend in a separate thread
    backend_thread = threading.Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()

    # Give backend a moment to initialize
    time.sleep(2)

    # Start Frontend in main thread
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down AutoDS...")
        sys.exit(0)
