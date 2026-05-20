from fastapi import FastAPI
from dotenv import load_dotenv
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from contextlib import asynccontextmanager  # ← ADD THIS

# ── ADD THIS BLOCK ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Loading local NL model — please wait...")
    import app.services.nl_services  # triggers model load at startup
    print("[Startup] Model ready ✓")
    yield
# ─────────────────────────────────────────────────────────────────

app = FastAPI(lifespan=lifespan)  # ← ADD lifespan=lifespan here

app.add_middleware(
    CORSMiddleware,
allow_origins=["http://localhost:5173", "http://localhost:3000", "http://192.168.75.166:5173"],    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)