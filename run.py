import subprocess
import sys
import os
import time
import signal

def run_app():
    root_dir = os.getcwd()
    
    print("🚀 Starting AutoDS Integrated Environment...")

    # 1. Start Backend
    print("📂 Starting Backend (FastAPI)...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=os.path.join(root_dir, "backend"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    # 2. Start Frontend
    print("🎨 Starting Frontend (Vite)...")
    frontend_process = subprocess.Popen(
        ["npm.cmd" if os.name == 'nt' else "npm", "run", "dev"],
        cwd=os.path.join(root_dir, "frontend"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    def signal_handler(sig, frame):
        print("\n🛑 Shutting down AutoDS...")
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    print("\n✅ AutoDS is running!")
    print("🔗 Frontend: http://localhost:5173")
    print("🔗 Backend API: http://localhost:8000")
    print("💡 Press Ctrl+C to stop both servers.\n")

    # Monitor output
    try:
        while True:
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend process stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend process stopped unexpectedly.")
                break
            
            # Read a line from backend (non-blocking logic simplified for CLI view)
            line = backend_process.stdout.readline()
            if line:
                print(f"[Backend] {line.strip()}")
            
            time.sleep(0.1)
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    run_app()
