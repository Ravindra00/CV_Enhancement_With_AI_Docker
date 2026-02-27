"""
Run the FastAPI application.

Usage:
    python run.py                    # Run on default host:port (127.0.0.1:8000)
    python run.py --host 0.0.0.0   # Run on all interfaces
    python run.py --port 8080      # Run on custom port
"""

import uvicorn
import argparse
import os

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run CV Enhancer API")
    parser.add_argument("--host", default="127.0.0.1", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload on file changes")
    
    args = parser.parse_args()
    
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload or os.getenv("ENV") == "development"
    )
