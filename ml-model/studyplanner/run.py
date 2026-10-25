import os
import sys
from pathlib import Path

import uvicorn


APP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(APP_DIR))

PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1")

if __name__ == "__main__":
    print("=" * 50)
    print("Starting GyaanMitra Study Planner ML API")
    print(f"App directory: {APP_DIR}")
    print(f"Server: http://{HOST}:{PORT}")
    print(f"Docs: http://127.0.0.1:{PORT}/docs")
    print("=" * 50)
    uvicorn.run("app:app", host=HOST, port=PORT, log_level="info", reload=False)
