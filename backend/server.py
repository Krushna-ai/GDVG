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

class WatchlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: str
    status: str  # want_to_watch, watching, completed, dropped
    total_episodes: Optional[int] = None
    progress: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text).strip('-')
    return text.lower() or 'untitled'


async def unique_slug_for_title(title: str) -> str:
    base = slugify(title)
    slug = base
    i = 2
    while True:
        existing = await db.content.find_one({"slug": {"$regex": f"^{re.escape(slug)}$", "$options": "i"}})
        if not existing:
            return slug
        slug = f"{base}-{i}"
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

# Parsing helpers remain

def parse_excel_csv_file(file_content: bytes, filename: str) -> pd.DataFrame:
    try:
        if filename.lower().endswith(('.xlsx', '.xls')):
            return pd.read_excel(io.BytesIO(file_content))
        if filename.lower().endswith('.csv'):
            return pd.read_csv(io.BytesIO(file_content))
        raise ValueError("Unsupported file format. Use .xlsx, .xls, or .csv")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


def validate_and_convert_row(row: pd.Series) -> Optional[dict]:
    try:
        if pd.isna(row.get('title')) or str(row.get('title')).strip() == '':
            return None
        genres: List[str] = []
        if not pd.isna(row.get('genres')) and str(row.get('genres')).strip() != '':
            for g in str(row['genres']).split(','):
                v = g.strip().lower().replace(' ', '_')
                if v in [ge.value for ge in ContentGenre]:
                    genres.append(v)
        streaming_platforms: List[str] = []
        if not pd.isna(row.get('streaming_platforms')) and str(row.get('streaming_platforms')).strip() != '':
            streaming_platforms = [p.strip() for p in str(row['streaming_platforms']).split(',') if p.strip()]
        cast: List[dict] = []
        if not pd.isna(row.get('cast')) and str(row.get('cast')).strip() != '':
            s = str(row['cast'])
            try:
                data = json.loads(s)
                if isinstance(data, list):
                    cast = [{
                        'id': str(uuid.uuid4()), 'name': m.get('name', ''), 'character': m.get('character', ''), 'profile_image': None
                    } for m in data if isinstance(m, dict) and m.get('name')]
            except Exception:
                names = [n.strip() for n in s.split(',') if n.strip()]
                cast = [{'id': str(uuid.uuid4()), 'name': n, 'character': '', 'profile_image': None} for n in names]
        crew: List[dict] = []
        if not pd.isna(row.get('crew')) and str(row.get('crew')).strip() != '':
            s = str(row['crew'])
            try:
                data = json.loads(s)
                if isinstance(data, list):
                    crew = [{
                        'id': str(uuid.uuid4()), 'name': m.get('name', ''), 'role': m.get('role', ''), 'profile_image': None
                    } for m in data if isinstance(m, dict) and m.get('name')]
            except Exception:
                crew = [{'id': str(uuid.uuid4()), 'name': s.strip(), 'role': 'director', 'profile_image': None}]
        def p_int(val):
            try:
                if pd.isna(val) or str(val).strip() == '':
                    return None
                return int(float(val))
            except Exception:
                return None
        def p_float(val, default=None):
            try:
                if pd.isna(val) or str(val).strip() == '':
                    return default
                return float(val)
            except Exception:
                return default
        ctype_raw = str(row.get('content_type', '')).lower().strip()
        ctype = ctype_raw if ctype_raw in [ct.value for ct in ContentType] else 'drama'
        rating_val = p_float(row.get('rating'), default=0.0)
        content = {
            'id': str(uuid.uuid4()),
            'title': str(row['title']).strip(),
            'original_title': (str(row.get('original_title', '')).strip() or None),
            'poster_url': (str(row.get('poster_url', '')).strip() or "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="),
            'banner_url': (str(row.get('banner_url', '')).strip() or None),
            'synopsis': (str(row.get('synopsis', '')).strip() or 'N.A'),
            'year': p_int(row.get('year')),
            'country': (str(row.get('country', '')).strip() or 'N.A'),
            'content_type': ctype,
            'genres': genres,
            'rating': rating_val if rating_val is not None else 0.0,
            'episodes': p_int(row.get('episodes')),
            'duration': p_int(row.get('duration')),
            'cast': cast,
            'crew': crew,
            'streaming_platforms': streaming_platforms,
            'tags': [t.strip() for t in str(row.get('tags', '')).split(',') if t.strip()] if not pd.isna(row.get('tags')) else [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        return content
    except Exception as e:
        logger.error(f"Error validating row: {str(e)}")
        return None

# ============== AUTH ROUTES (unchanged) ==============
# ... existing auth and content routes are below ...

# ============== WATCHLIST ROUTES ==============
@api_router.get('/watchlist')
async def get_watchlist(current_user: User = Depends(get_current_user)):
    docs = await db.watchlist.find({"user_id": current_user.id}).sort("updated_at", -1).to_list(None)
    for d in docs:
        d.pop('_id', None)
    return {"items": docs}

class WatchlistCreate(BaseModel):
    content_id: str
    status: str
    total_episodes: Optional[int] = None

@api_router.post('/watchlist')
async def add_watchlist(item: WatchlistCreate, current_user: User = Depends(get_current_user)):
    # Check duplicate
    existing = await db.watchlist.find_one({"user_id": current_user.id, "content_id": item.content_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    wl = WatchlistItem(user_id=current_user.id, content_id=item.content_id, status=item.status, total_episodes=item.total_episodes)
    await db.watchlist.insert_one(wl.dict())
    return {"id": wl.id}

class WatchlistUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None

@api_router.put('/watchlist/{item_id}')
async def update_watchlist(item_id: str, body: WatchlistUpdate, current_user: User = Depends(get_current_user)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update['updated_at'] = datetime.utcnow()
    res = await db.watchlist.update_one({"id": item_id, "user_id": current_user.id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"updated": True}

@api_router.delete('/watchlist/{item_id}')
async def delete_watchlist(item_id: str, current_user: User = Depends(get_current_user)):
    res = await db.watchlist.delete_one({"id": item_id, "user_id": current_user.id})
    return {"deleted": res.deleted_count > 0}

# Health and router include remain at bottom
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)