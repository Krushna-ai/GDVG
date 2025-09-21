from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, UploadFile, File as FastFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone
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

# Parsing helpers

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
            'created_at': now_iso(),
            'updated_at': now_iso(),
        }
        return content
    except Exception as e:
        logger.error(f"Error validating row: {str(e)}")
        return None

# ============== HEALTH ==============
@api_router.get('/health')
async def health():
    return {"status": "ok"}

@api_router.get('/health/deep')
async def deep_health():
    try:
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

# ============== AUTH ==============
class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    login: str
    password: str

class ResetPasswordRequest(BaseModel):
    username: str
    email: str
    new_password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    joined_date: str
    is_verified: bool = False

@api_router.post('/auth/register')
async def register_user(user: UserCreate):
    if await db.users.find_one({"email": {"$regex": f"^{user.email}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail='Email already registered')
    if await db.users.find_one({"username": {"$regex": f"^{user.username}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail='Username already taken')
    new_user = User(
        email=user.email,
        username=user.username,
        password_hash=hash_password(user.password),
        first_name=user.first_name,
        last_name=user.last_name,
        is_verified=False,
        is_active=True,
        joined_date=now_iso()
    )
    await db.users.insert_one(new_user.dict())
    token = create_access_token({"sub": new_user.id, "type": "user"})
    return {"access_token": token, "token_type": "bearer"}

@api_router.post('/auth/login')
async def login_user(body: UserLogin):
    identifier = body.login.strip()
    q = {"$or": [
        {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
        {"username": {"$regex": f"^{identifier}$", "$options": "i"}}
    ]}
    user = await db.users.find_one(q)
    if not user or not verify_password(body.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_access_token({"sub": user['id'], "type": "user"})
    return {"access_token": token, "token_type": "bearer"}

@api_router.get('/auth/me', response_model=UserProfile)
async def auth_me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        location=current_user.location,
        joined_date=current_user.joined_date,
        is_verified=current_user.is_verified
    )

@api_router.post('/auth/reset-password')
async def reset_password(req: ResetPasswordRequest):
    user = await db.users.find_one({
        "$and": [
            {"username": {"$regex": f"^{req.username}$", "$options": "i"}},
            {"email": {"$regex": f"^{req.email}$", "$options": "i"}}
        ]
    })
    if not user:
        raise HTTPException(status_code=404, detail='No matching user for given username and email')
    await db.users.update_one({"id": user['id']}, {"$set": {"password_hash": hash_password(req.new_password), "updated_at": now_iso()}})
    return {"success": True}

# Admin auth
@api_router.post('/admin/login', response_model=Token)
async def admin_login(admin_data: AdminLogin):
    admin = await db.admins.find_one({"username": {"$regex": f"^{re.escape(admin_data.username)}$", "$options": "i"}})
    if not admin or not verify_password(admin_data.password, admin.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": admin['username'], "type": "admin"})
    return {"access_token": token, "token_type": "bearer"}

# ============== PUBLIC CONTENT ROUTES ==============
@api_router.get('/content', response_model=ContentResponse)
async def get_content(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: Optional[str] = None,
                     country: Optional[str] = None, content_type: Optional[ContentType] = None,
                     genre: Optional[ContentGenre] = None, year: Optional[int] = None):
    skip = (page - 1) * limit
    q: dict = {}
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"original_title": {"$regex": search, "$options": "i"}},
            {"synopsis": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    if country:
        q["country"] = {"$regex": country, "$options": "i"}
    if content_type:
        q["content_type"] = content_type
    if genre:
        q["genres"] = genre
    if year is not None:
        q["year"] = year

    total = await db.content.count_documents(q)
    cursor = db.content.find(q).skip(skip).limit(limit).sort("created_at", -1)
    docs = await cursor.to_list(length=limit)
    items: List[Content] = []
    for d in docs:
        d.pop('_id', None)
        # Convert datetime objects to ISO strings
        for field in ['created_at', 'updated_at']:
            if field in d and hasattr(d[field], 'isoformat'):
                d[field] = d[field].isoformat()
        items.append(Content(**d))
    return ContentResponse(contents=items, total=total, page=page, limit=limit)

@api_router.get('/content/search', response_model=ContentResponse)
async def advanced_search(query: Optional[str] = None, country: Optional[str] = None,
                          content_type: Optional[ContentType] = None, genre: Optional[ContentGenre] = None,
                          year_from: Optional[int] = None, year_to: Optional[int] = None,
                          rating_min: Optional[float] = None, rating_max: Optional[float] = None,
                          sort_by: Optional[str] = 'created_at', sort_order: Optional[str] = 'desc',
                          page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    skip = (page - 1) * limit
    q: dict = {}
    if query:
        q["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"original_title": {"$regex": query, "$options": "i"}},
            {"synopsis": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}},
            {"cast.name": {"$regex": query, "$options": "i"}},
            {"crew.name": {"$regex": query, "$options": "i"}},
        ]
    if country:
        q["country"] = {"$regex": country, "$options": "i"}
    if content_type:
        q["content_type"] = content_type
    if genre:
        q["genres"] = genre
    if year_from is not None or year_to is not None:
        yr = {}
        if year_from is not None:
            yr["$gte"] = year_from
        if year_to is not None:
            yr["$lte"] = year_to
        q["year"] = yr
    if rating_min is not None or rating_max is not None:
        rf = {}
        if rating_min is not None:
            rf["$gte"] = rating_min
        if rating_max is not None:
            rf["$lte"] = rating_max
        q["rating"] = rf

    sort_dir = 1 if sort_order == 'asc' else -1
    sort_criteria = [(sort_by, sort_dir)]

    total = await db.content.count_documents(q)
    cursor = db.content.find(q).sort(sort_criteria).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    items: List[Content] = []
    for d in docs:
        d.pop('_id', None)
        # Convert datetime objects to ISO strings
        for field in ['created_at', 'updated_at']:
            if field in d and hasattr(d[field], 'isoformat'):
                d[field] = d[field].isoformat()
        items.append(Content(**d))
    return ContentResponse(contents=items, total=total, page=page, limit=limit)

@api_router.get('/content/featured')
async def content_featured(category: Optional[str] = 'trending', country: Optional[str] = None, limit: int = Query(10, ge=1, le=50)):
    if category == 'trending':
        # Get trending content based on rating and recent activity (last 6 months to be more inclusive)
        six_months_ago = (datetime.utcnow() - timedelta(days=180)).isoformat()
        cursor = db.content.find().sort([("rating", -1), ("created_at", -1)]).limit(limit)
    elif category == 'new_releases':
        cursor = db.content.find().sort("created_at", -1).limit(limit)
    elif category == 'top_rated':
        cursor = db.content.find().sort("rating", -1).limit(limit)
    elif category == 'by_country' and country:
        cursor = db.content.find({"country": {"$regex": country, "$options": "i"}}).sort([("rating", -1), ("created_at", -1)]).limit(limit)
    else:
        cursor = db.content.find().sort([("rating", -1), ("created_at", -1)]).limit(limit)
    docs = await cursor.to_list(length=limit)
    items = []
    for d in docs:
        d.pop('_id', None)
        # Convert datetime objects to ISO strings
        for field in ['created_at', 'updated_at']:
            if field in d and hasattr(d[field], 'isoformat'):
                d[field] = d[field].isoformat()
        items.append(Content(**d))
    return items

@api_router.get('/content/{content_id}', response_model=Content)
async def get_content_by_id(content_id: str):
    doc = await db.content.find_one({"id": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    doc.pop('_id', None)
    # Convert datetime objects to ISO strings
    for field in ['created_at', 'updated_at']:
        if field in doc and hasattr(doc[field], 'isoformat'):
            doc[field] = doc[field].isoformat()
    return Content(**doc)

@api_router.get('/countries')
async def get_countries():
    countries = await db.content.distinct('country')
    countries = [c for c in countries if c]
    return {"countries": sorted(countries)}

@api_router.get('/genres')
async def get_genres():
    return {"genres": [g.value for g in ContentGenre]}

@api_router.get('/content-types')
async def get_content_types():
    return {"content_types": [ct.value for ct in ContentType]}

# ============== ADMIN CONTENT MGMT (minimal) ==============
@api_router.get('/admin/content')
async def admin_list_content(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: Optional[str] = None,
                             current_admin: AdminUser = Depends(get_current_admin)):
    skip = (page - 1) * limit
    q: dict = {}
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"original_title": {"$regex": search, "$options": "i"}},
        ]
    total = await db.content.count_documents(q)
    docs = await db.content.find(q).skip(skip).limit(limit).sort("updated_at", -1).to_list(length=limit)
    for d in docs:
        d.pop('_id', None)
    return {"contents": docs, "total": total}

@api_router.get('/admin/stats')
async def admin_stats(current_admin: AdminUser = Depends(get_current_admin)):
    total_content = await db.content.count_documents({})
    total_movies = await db.content.count_documents({"content_type": "movie"})
    total_series = await db.content.count_documents({"content_type": "series"})
    total_dramas = await db.content.count_documents({"content_type": "drama"})
    countries = await db.content.distinct('country')
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_additions = await db.content.count_documents({"created_at": {"$gte": seven_days_ago}})
    return {
        "total_content": total_content,
        "total_movies": total_movies,
        "total_series": total_series,
        "total_dramas": total_dramas,
        "countries": len([c for c in countries if c]),
        "recent_additions": recent_additions,
    }

# ============== BULK IMPORT (Preview, File, URL, Jobs) ==============
class ImportURL(BaseModel):
    csv_url: str

@api_router.post('/admin/bulk-import/preview', tags=["admin"])
async def preview_bulk_import_file(file: UploadFile = FastFile(...), current_admin: AdminUser = Depends(get_current_admin)):
    content = await file.read()
    df = parse_excel_csv_file(content, file.filename)
    detected = list(df.columns)
    total_rows = len(df)
    will_import = 0
    will_skip = 0
    preview_rows = []
    for idx, row in df.head(50).iterrows():
        issues = []
        valid = True
        title = str(row.get('title') or '').strip()
        if not title:
            valid = False
            issues.append('Missing title')
        content_data = validate_and_convert_row(row) if valid else None
        duplicate = False
        year = None
        ctype = None
        rating = None
        genres = ''
        episodes = None
        if content_data:
            year = content_data.get('year')
            ctype = content_data.get('content_type')
            rating = content_data.get('rating')
            genres = ','.join(content_data.get('genres') or [])
            episodes = content_data.get('episodes')
            query = {"title": {"$regex": f"^{re.escape(content_data['title'])}$", "$options": "i"}}
            if year is not None:
                query.update({"year": year})
            existing = await db.content.find_one(query)
            if existing:
                duplicate = True
                issues.append('Duplicate')
        if valid and not duplicate:
            will_import += 1
        else:
            will_skip += 1
        preview_rows.append({
            'row': idx + 2,
            'title': title or 'N.A',
            'year': year,
            'country': str(row.get('country') or 'N.A'),
            'content_type': ctype or (str(row.get('content_type') or 'drama')),
            'rating': rating if isinstance(rating, (int, float)) else (row.get('rating') or 0.0),
            'genres': genres,
            'episodes': episodes,
            'valid': valid and not duplicate,
            'issues': issues,
        })
    return {
        'total_rows': total_rows,
        'will_import': will_import,
        'will_skip': will_skip,
        'detected_columns': detected,
        'preview': preview_rows,
    }

@api_router.post('/admin/bulk-import/preview-url', tags=["admin"])
async def preview_bulk_import_url(body: ImportURL, current_admin: AdminUser = Depends(get_current_admin)):
    req = urllib.request.Request(body.csv_url, headers={'User-Agent': 'GDVG Importer'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch CSV: HTTP {resp.status}")
        data = resp.read()
    df = pd.read_csv(io.BytesIO(data))
    detected = list(df.columns)
    total_rows = len(df)
    will_import = 0
    will_skip = 0
    preview_rows = []
    for idx, row in df.head(50).iterrows():
        issues = []
        valid = True
        title = str(row.get('title') or '').strip()
        if not title:
            valid = False
            issues.append('Missing title')
        content_data = validate_and_convert_row(row) if valid else None
        duplicate = False
        year = None
        ctype = None
        rating = None
        genres = ''
        episodes = None
        if content_data:
            year = content_data.get('year')
            ctype = content_data.get('content_type')
            rating = content_data.get('rating')
            genres = ','.join(content_data.get('genres') or [])
            episodes = content_data.get('episodes')
            query = {"title": {"$regex": f"^{re.escape(content_data['title'])}$", "$options": "i"}}
            if year is not None:
                query.update({"year": year})
            existing = await db.content.find_one(query)
            if existing:
                duplicate = True
                issues.append('Duplicate')
        if valid and not duplicate:
            will_import += 1
        else:
            will_skip += 1
        preview_rows.append({
            'row': idx + 2,
            'title': title or 'N.A',
            'year': year,
            'country': str(row.get('country') or 'N.A'),
            'content_type': ctype or (str(row.get('content_type') or 'drama')),
            'rating': rating if isinstance(rating, (int, float)) else (row.get('rating') or 0.0),
            'genres': genres,
            'episodes': episodes,
            'valid': valid and not duplicate,
            'issues': issues,
        })
    return {
        'total_rows': total_rows,
        'will_import': will_import,
        'will_skip': will_skip,
        'detected_columns': detected,
        'preview': preview_rows,
    }

@api_router.post('/admin/bulk-import', response_model=BulkImportResult)
async def admin_bulk_import_file(file: UploadFile = FastFile(...), current_admin: AdminUser = Depends(get_current_admin)):
    content = await file.read()
    df = parse_excel_csv_file(content, file.filename)
    job = ImportJob(
        admin_username=current_admin.username,
        source_type='file',
        source=file.filename,
        status='processing',
        total_rows=len(df),
        processed_rows=0,
    )
    await db.import_jobs.insert_one(job.dict())

    successful = 0
    failed = 0
    errors: List[str] = []
    imported: List[str] = []

    for idx, row in df.iterrows():
        try:
            content_data = validate_and_convert_row(row)
            if content_data is None:
                failed += 1
                errors.append(f"Row {idx + 2}: Missing title or invalid data")
            else:
                content_data['slug'] = await unique_slug_for_title(content_data['title'])
                title = content_data['title']
                year = content_data.get('year')
                query = {"title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}}
                if year is not None:
                    query.update({"year": year})
                existing = await db.content.find_one(query)
                if existing:
                    failed += 1
                    errors.append(f"Row {idx + 2}: Content '{title}' already exists")
                else:
                    await db.content.insert_one(content_data)
                    successful += 1
                    imported.append(title)
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx + 2}: {str(e)}")
        finally:
            job.processed_rows += 1
            job.successful_imports = successful
            job.failed_imports = failed
            if job.processed_rows % 25 == 0:
                await db.import_jobs.update_one({"id": job.id}, {"$set": job.dict()})

    job.status = 'completed'
    job.finished_at = now_iso()
    await db.import_jobs.update_one({"id": job.id}, {"$set": job.dict()})

    return BulkImportResult(success=successful > 0, total_rows=len(df), successful_imports=successful, failed_imports=failed, errors=errors[:200], imported_content=imported[:200])

@api_router.post('/admin/bulk-import/from-url', response_model=BulkImportResult)
async def admin_bulk_import_from_url(body: ImportURL, current_admin: AdminUser = Depends(get_current_admin)):
    try:
        req = urllib.request.Request(body.csv_url, headers={'User-Agent': 'GDVG Importer'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch CSV: HTTP {resp.status}")
            data = resp.read()
        df = pd.read_csv(io.BytesIO(data))
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV appears empty")
        job = ImportJob(
            admin_username=current_admin.username,
            source_type='url',
            source=body.csv_url,
            status='processing',
            total_rows=len(df),
            processed_rows=0,
        )
        await db.import_jobs.insert_one(job.dict())

        successful = 0
        failed = 0
        errors: List[str] = []
        imported: List[str] = []
        for idx, row in df.iterrows():
            try:
                content_data = validate_and_convert_row(row)
                if content_data is None:
                    failed += 1
                    errors.append(f"Row {idx + 2}: Missing title or invalid data")
                    continue
                content_data['slug'] = await unique_slug_for_title(content_data['title'])
                title = content_data['title']
                year = content_data.get('year')
                query = {"title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}}
                if year is not None:
                    query.update({"year": year})
                existing = await db.content.find_one(query)
                if existing:
                    failed += 1
                    errors.append(f"Row {idx + 2}: Content '{title}' already exists")
                    continue
                await db.content.insert_one(content_data)
                successful += 1
                imported.append(title)
            except Exception as e:
                failed += 1
                errors.append(f"Row {idx + 2}: {str(e)}")
            finally:
                job.processed_rows += 1
                job.successful_imports = successful
                job.failed_imports = failed
                if job.processed_rows % 25 == 0:
                    await db.import_jobs.update_one({"id": job.id}, {"$set": job.dict()})
        job.status = 'completed'
        job.finished_at = now_iso()
        await db.import_jobs.update_one({"id": job.id}, {"$set": job.dict()})
        return BulkImportResult(success=successful > 0, total_rows=len(df), successful_imports=successful, failed_imports=failed, errors=errors[:50], imported_content=imported[:50])
    except Exception as e:
        logger.exception('Import from URL error')
        raise HTTPException(status_code=400, detail=f"Import from URL failed: {str(e)}")

@api_router.get('/admin/bulk-import/jobs')
async def list_import_jobs(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), current_admin: AdminUser = Depends(get_current_admin)):
    skip = (page - 1) * limit
    q = {}
    total = await db.import_jobs.count_documents(q)
    docs = await db.import_jobs.find(q).sort("started_at", -1).skip(skip).limit(limit).to_list(length=limit)
    for d in docs:
        d.pop('_id', None)
    return {"jobs": docs, "total": total, "page": page, "limit": limit}

@api_router.get('/admin/bulk-import/jobs/{job_id}')
async def get_import_job(job_id: str, current_admin: AdminUser = Depends(get_current_admin)):
    job = await db.import_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.pop('_id', None)
    return job

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
    update['updated_at'] = now_iso()
    res = await db.watchlist.update_one({"id": item_id, "user_id": current_user.id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"updated": True}

@api_router.delete('/watchlist/{item_id}')
async def delete_watchlist(item_id: str, current_user: User = Depends(get_current_user)):
    res = await db.watchlist.delete_one({"id": item_id, "user_id": current_user.id})
    return {"deleted": res.deleted_count > 0}

# ============== DIAGNOSTICS ==============
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

# Mount router and middleware
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup seed and default admin ensure
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