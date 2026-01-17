from app.api import chat, upload, export

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# ... (CORS middleware)

app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["chat"])
app.include_router(upload.router, prefix=settings.API_V1_STR, tags=["upload"])
app.include_router(export.router, prefix=settings.API_V1_STR, tags=["export"])

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
