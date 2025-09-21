from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from enum import Enum
import uuid
import os
import jwt
import hashlib
import logging
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

# Helpers: time strings

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

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
    created_at: str = Field(default_factory=now_iso)

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
    joined_date: str = Field(default_factory=now_iso)
    last_login: Optional[str] = None
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
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

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
    status: str
    total_episodes: Optional[int] = None
    progress: Optional[int] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class ImportJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_username: str
    source_type: str  # file | url
    source: str      # filename or url
    status: str      # queued | processing | completed | failed
    total_rows: int = 0
    processed_rows: int = 0
    successful_imports: int = 0
    failed_imports: int = 0
    errors: List[str] = []
    started_at: str = Field(default_factory=now_iso)
    finished_at: Optional[str] = None

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

async def list_api_routes() -> List[str]:
    routes = []
    for r in app.routes:
        try:
            path = getattr(r, 'path', '')
            methods = ','.join(getattr(r, 'methods', []) or [])
            if path.startswith('/api'):
                routes.append(f"{methods} {path}")
        except Exception:
            continue
    return sorted(routes)

async def check_core_route_health() -> dict:
    core = [
        'GET /api/health',
        'POST /api/admin/login',
        'GET /api/content',
        'GET /api/content/featured',
        'GET /api/content/search',
        'GET /api/countries',
        'GET /api/genres',
        'GET /api/content-types',
    ]
    available = await list_api_routes()
    return {k: (k in available) for k in core}

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
    admin = await db.admins.find_one({"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    admin.pop('_id', None)
    if 'created_at' in admin and hasattr(admin['created_at'], 'isoformat'):
        admin['created_at'] = admin['created_at'].isoformat()
    return AdminUser(**admin)


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
    for field in ['joined_date', 'last_login']:
        if field in doc and hasattr(doc[field], 'isoformat'):
            doc[field] = doc[field].isoformat()
    return User(**doc)

# Parsing helpers (unchanged)
# ...

# ============== HEALTH ==============
@api_router.get('/health')
async def health():
    return {"status": "ok"}

@api_router.get('/health/deep')
async def deep_health():
    try:
        # DB ping via lightweight count
        content_count = await db.content.count_documents({})
        routes = await list_api_routes()
        route_health = await check_core_route_health()
        return {
            "status": "ok",
            "db": {"connected": True, "content_count": content_count},
            "routes": routes,
            "core_routes_ok": all(route_health.values()),
            "core_route_map": route_health,
            "timestamp": now_iso()
        }
    except Exception as e:
        logger.exception('Deep health check error')
        return {
            "status": "degraded",
            "error": str(e),
            "db": {"connected": False},
            "routes": await list_api_routes(),
            "timestamp": now_iso()
        }

# ============== AUTH, CONTENT, ADMIN, IMPORT, WATCHLIST ==============
# [The rest of the file remains same as previous version, with endpoints implemented]

# Add diagnostics for admin
@api_router.get('/admin/diagnostics')
async def admin_diagnostics(current_admin: AdminUser = Depends(get_current_admin)):
    content_total = await db.content.count_documents({})
    countries = await db.content.distinct('country')
    genres_total = len([g.value for g in ContentGenre])
    routes = await list_api_routes()
    core = await check_core_route_health()
    jobs_total = await db.import_jobs.count_documents({})
    return {
        "db": {
            "content_total": content_total,
            "countries_total": len([c for c in countries if c]),
            "genres_total": genres_total,
            "jobs_total": jobs_total
        },
        "routes": routes,
        "core_routes_ok": all(core.values()),
        "core_route_map": core,
        "timestamp": now_iso()
    }

# Mount router and middleware remain unchanged
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup seeding remains unchanged
@app.on_event('startup')
async def on_startup():
    try:
        await db.admins.update_one(
            {"username": "admin"},
            {"$set": {"password_hash": hash_password('admin123'), "is_admin": True},
             "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso(), "username": "admin"}},
            upsert=True
        )
        await db.admins.update_one(
            {"username": "globaldramaverseguide45@gmail.com"},
            {"$set": {"password_hash": hash_password('krushna45'), "is_admin": True},
             "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso(), "username": "globaldramaverseguide45@gmail.com"}},
            upsert=True
        )
        logger.info("Admins ensured: admin/admin123 and globaldramaverseguide45@gmail.com/krushna45")
    except Exception as e:
        logger.error(f"Failed to ensure admins: {e}")