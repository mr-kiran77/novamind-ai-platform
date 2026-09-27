import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import uvicorn
from app.config import settings

def main():
    print(f"==================================================")
    print(f"🚀 Launching {settings.APP_NAME} - {settings.APP_TAGLINE}")
    print(f"📍 Local Server: http://{settings.HOST}:{settings.PORT}")
    print(f"🎯 Default Demo Login: +19876543210 (Code: 123456)")
    print(f"==================================================")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

if __name__ == "__main__":
    main()
