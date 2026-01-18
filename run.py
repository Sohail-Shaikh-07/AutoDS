import subprocess
import threading
import time
import os
import sys


def run_backend():
    print("🚀 Starting Backend...")
    # Using 'shell=True' to ensure path resolution, but 'cwd' sets the context
    subprocess.run(["uvicorn", "main:app", "--reload"], cwd="backend", shell=True)


def run_frontend():
    print("🚀 Starting Frontend...")
    # 'npm run dev' usually launches interactive vite server
    subprocess.run(["npm", "run", "dev"], cwd="frontend", shell=True)


if __name__ == "__main__":
    print("🤖 AutoDS System Startup")
    print("========================")

    # Check if backend dependencies are installed?
    # For now assume environment is set up as per USER request "one script file"

    # Start Backend in a separate thread
    backend_thread = threading.Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()

    # Give backend a moment to initialize
    time.sleep(2)

    # Start Frontend
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down AutoDS...")
        sys.exit(0)
