from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from enum import Enum
import pandas as pd
import uuid
import json
import io
import os
import jwt
import hashlib
import logging
import urllib.request
import re
import unicodedata

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# App and router
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# DB
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT
SECRET_KEY = os.environ.get('JWT_SECRET', 'gdvg-secret-key-2025')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Enums
class ContentType(str, Enum):
    DRAMA = "drama"
    MOVIE = "movie"
    SERIES = "series"
    ANIME = "anime"

class ContentGenre(str, Enum):
    ROMANCE = "romance"
    COMEDY = "comedy"
    ACTION = "action"
    THRILLER = "thriller"
    HORROR = "horror"
    FANTASY = "fantasy"
    DRAMA = "drama"
    MYSTERY = "mystery"
    SLICE_OF_LIFE = "slice_of_life"
    HISTORICAL = "historical"
    CRIME = "crime"
    ADVENTURE = "adventure"

# Models
class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    is_admin: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    password_hash: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    joined_date: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    preferences: dict = Field(default_factory=dict)

class Token(BaseModel):
    access_token: str
    token_type: str

class CastMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    character: str
    profile_image: Optional[str] = None

class CrewMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    profile_image: Optional[str] = None

class Content(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: Optional[str] = None
    title: str
    original_title: Optional[str] = None
    poster_url: str
    banner_url: Optional[str] = None
    synopsis: str
    year: Optional[int] = None
    country: str
    content_type: ContentType
    genres: List[ContentGenre] = []
    rating: float = Field(ge=0, le=10, default=0)
    episodes: Optional[int] = None
    duration: Optional[int] = None
    cast: List[CastMember] = []
    crew: List[CrewMember] = []
    streaming_platforms: List[str] = []
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ContentCreate(BaseModel):
    slug: Optional[str] = None
    title: str
    original_title: Optional[str] = None
    poster_url: str
    banner_url: Optional[str] = None
    synopsis: str
    year: Optional[int] = None
    country: str
    content_type: ContentType
    genres: List[ContentGenre] = []
    rating: float = Field(ge=0, le=10, default=0)
    episodes: Optional[int] = None
    duration: Optional[int] = None
    cast: List[CastMember] = []
    crew: List[CrewMember] = []
    streaming_platforms: List[str] = []
    tags: List[str] = []

class ContentUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    original_title: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    synopsis: Optional[str] = None
    year: Optional[int] = None
    country: Optional[str] = None
    content_type: Optional[ContentType] = None
    genres: Optional[List[ContentGenre]] = None
    rating: Optional[float] = None
    episodes: Optional[int] = None
    duration: Optional[int] = None
    cast: Optional[List[CrewMember]] = None
    crew: Optional[List[CrewMember]] = None
    streaming_platforms: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class ContentResponse(BaseModel):
    contents: List[Content]
    total: int
    page: int
    limit: int

class BulkImportResult(BaseModel):
    success: bool
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[str]
    imported_content: List[str]

# Helpers

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def slugify(text: str) -> str:
    # Normalize unicode and strip accents, then keep alnum and hyphens
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text).strip('-')
    return text.lower() or 'untitled'

async def generate_unique_slug(base_slug: str) -> str:
    slug = base_slug
    i = 2
    while True:
        existing = await db.content.find_one({"slug": {"$regex": f"^{re.escape(slug)}$", "$options": "i"}})
        if not existing:
            return slug
        slug = f"{base_slug}-{i}"
        i += 1


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AdminUser:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        if user_type != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    admin = await db.admins.find_one({"username": username})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return AdminUser(**{k: v for k, v in admin.items() if k != '_id'})


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get('sub')
        t: str = payload.get('type', 'user')
        if t != 'user' or not sub:
            raise HTTPException(status_code=401, detail='User access required')
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    doc = await db.users.find_one({"id": sub})
    if not doc:
        raise HTTPException(status_code=401, detail='User not found')
    doc.pop('_id', None)
    return User(**doc)

# Parsing helpers stay same (parse_excel_csv_file, validate_and_convert_row)
# ... existing definitions remain below ...