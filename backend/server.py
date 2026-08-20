from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
from lib.db import client, db

from routers import auth, content, courses, dashboard, dives, staff, training


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.dive_logs.create_index([("user_id", 1), ("date", -1)])
    await db.personal_bests.create_index([("user_id", 1), ("discipline", 1)])
    await db.training_entries.create_index([("user_id", 1), ("date", -1)])
    await db.courses.create_index("slug", unique=True)
    yield
    client.close()


app = FastAPI(lifespan=lifespan, title="Freediving School & Diver Logbook")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Freediving School API"}


api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(dives.router)
api_router.include_router(training.router)
api_router.include_router(content.router)
api_router.include_router(staff.router)
api_router.include_router(dashboard.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include the router in the main app — must remain the last statement.
app.include_router(api_router)
