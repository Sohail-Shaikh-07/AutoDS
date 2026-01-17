from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import chat

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["chat"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to AutoDS API",
        "status": "active",
        "version": "0.1.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}
