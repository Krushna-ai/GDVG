from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, UploadFile, File
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

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# FastAPI app and router
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Database (Mongo via Motor)
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
    cast: Optional[List[CastMember]] = None
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
        # Only title is required
        if pd.isna(row.get('title')) or str(row.get('title')).strip() == '':
            return None

        # Genres
        genres: List[str] = []
        if not pd.isna(row.get('genres')) and str(row.get('genres')).strip() != '':
            for g in str(row['genres']).split(','):
                v = g.strip().lower().replace(' ', '_')
                if v in [ge.value for ge in ContentGenre]:
                    genres.append(v)

        # Streaming platforms
        streaming_platforms: List[str] = []
        if not pd.isna(row.get('streaming_platforms')) and str(row.get('streaming_platforms')).strip() != '':
            streaming_platforms = [p.strip() for p in str(row['streaming_platforms']).split(',') if p.strip()]

        # Cast
        cast: List[dict] = []
        if not pd.isna(row.get('cast')) and str(row.get('cast')).strip() != '':
            s = str(row['cast'])
            try:
                data = json.loads(s)
                if isinstance(data, list):
                    cast = [{
                        'id': str(uuid.uuid4()),
                        'name': m.get('name', ''),
                        'character': m.get('character', ''),
                        'profile_image': None
                    } for m in data if isinstance(m, dict) and m.get('name')]
            except Exception:
                names = [n.strip() for n in s.split(',') if n.strip()]
                cast = [{'id': str(uuid.uuid4()), 'name': n, 'character': '', 'profile_image': None} for n in names]

        # Crew
        crew: List[dict] = []
        if not pd.isna(row.get('crew')) and str(row.get('crew')).strip() != '':
            s = str(row['crew'])
            try:
                data = json.loads(s)
                if isinstance(data, list):
                    crew = [{
                        'id': str(uuid.uuid4()),
                        'name': m.get('name', ''),
                        'role': m.get('role', ''),
                        'profile_image': None
                    } for m in data if isinstance(m, dict) and m.get('name')]
            except Exception:
                crew = [{'id': str(uuid.uuid4()), 'name': s.strip(), 'role': 'director', 'profile_image': None}]

        # Safe parse helpers
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


# Auth endpoints
@api_router.post('/admin/login', response_model=Token)
async def admin_login(admin_data: AdminLogin):
    admin = await db.admins.find_one({"username": admin_data.username})
    if not admin or not verify_password(admin_data.password, admin.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": admin_data.username, "type": "admin"})
    return {"access_token": token, "token_type": "bearer"}


# Content endpoints
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
        items.append(Content(**d))
    return ContentResponse(contents=items, total=total, page=page, limit=limit)


@api_router.get('/content/featured')
async def content_featured(category: Optional[str] = 'trending', country: Optional[str] = None, limit: int = Query(10, ge=1, le=50)):
    if category == 'trending':
        three_months_ago = datetime.utcnow() - timedelta(days=90)
        cursor = db.content.find({"created_at": {"$gte": three_months_ago}}).sort([("rating", -1), ("created_at", -1)]).limit(limit)
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
        items.append(Content(**d))
    return items


@api_router.get('/content/{content_id}', response_model=Content)
async def get_content_by_id(content_id: str):
    doc = await db.content.find_one({"id": content_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    doc.pop('_id', None)
    return Content(**doc)


@api_router.post('/content', response_model=Content)
async def create_content(content_data: ContentCreate):
    content = Content(**content_data.dict())
    await db.content.insert_one(content.dict())
    return content


# Filters
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


# Admin bulk import preview (dry-run)
@api_router.post('/admin/bulk-import/preview')
async def admin_bulk_import_preview(file: UploadFile = File(...), current_admin: AdminUser = Depends(get_current_admin)):
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx, .xls, or .csv files only.")
    try:
        raw = await file.read()
        df = parse_excel_csv_file(raw, file.filename)
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty or has no valid data")
        preview_rows = []
        will_import = 0
        will_skip = 0
        errors: List[str] = []
        for idx, row in df.iterrows():
            row_num = idx + 2  # header at row 1
            content = validate_and_convert_row(row)
            if content is None:
                will_skip += 1
                preview_rows.append({
                    'row': row_num,
                    'title': str(row.get('title', '')).strip() or 'N.A',
                    'year': row.get('year'),
                    'country': str(row.get('country', '')).strip() or 'N.A',
                    'content_type': str(row.get('content_type', '')).lower().strip() or 'drama',
                    'rating': row.get('rating') if not pd.isna(row.get('rating')) else 0,
                    'genres': str(row.get('genres', '')).strip(),
                    'episodes': row.get('episodes'),
                    'valid': False,
                    'issues': ['Missing title or invalid row']
                })
                continue
            # Dedup check
            title = content['title']
            year = content.get('year')
            ctype = content.get('content_type')
            query = {"title": {"$regex": f"^{title}$", "$options": "i"}}
            if year is not None and ctype:
                query.update({"year": year, "content_type": ctype})
            existing = await db.content.find_one(query)
            if existing:
                will_skip += 1
                preview_rows.append({
                    'row': row_num,
                    'title': title,
                    'year': year,
                    'country': content.get('country') or 'N.A',
                    'content_type': ctype,
                    'rating': content.get('rating', 0),
                    'genres': ','.join(content.get('genres', [])),
                    'episodes': content.get('episodes'),
                    'valid': False,
                    'issues': ["Duplicate: already exists"]
                })
                continue
            will_import += 1
            preview_rows.append({
                'row': row_num,
                'title': title,
                'year': year,
                'country': content.get('country') or 'N.A',
                'content_type': ctype,
                'rating': content.get('rating', 0),
                'genres': ','.join(content.get('genres', [])),
                'episodes': content.get('episodes'),
                'valid': True,
                'issues': []
            })
        detected_columns = list(df.columns)
        return {
            'total_rows': int(len(df)),
            'will_import': int(will_import),
            'will_skip': int(will_skip),
            'detected_columns': detected_columns,
            'preview': preview_rows[:50],
            'errors': errors[:20]
        }
    except Exception as e:
        logger.exception('Bulk import preview error')
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# Admin bulk import
@api_router.post('/admin/bulk-import', response_model=BulkImportResult)
async def admin_bulk_import(file: UploadFile = File(...), current_admin: AdminUser = Depends(get_current_admin)):
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx, .xls, or .csv files only.")

    try:
        raw = await file.read()
        df = parse_excel_csv_file(raw, file.filename)
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty or has no valid data")

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

                # Dedup: title (+ year + type when available)
                title = content_data['title']
                year = content_data.get('year')
                ctype = content_data.get('content_type')
                query = {"title": {"$regex": f"^{title}$", "$options": "i"}}
                if year is not None and ctype:
                    query.update({"year": year, "content_type": ctype})
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
                continue

        return BulkImportResult(
            success=successful > 0,
            total_rows=len(df),
            successful_imports=successful,
            failed_imports=failed,
            errors=errors[:20],
            imported_content=imported[:20]
        )
    except Exception as e:
        logger.exception("Bulk import error")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@api_router.get('/admin/bulk-import/template')
async def bulk_template(current_admin: AdminUser = Depends(get_current_admin)):
    template_data = {
        'title': ['Squid Game', 'Parasite'],
        'original_title': ['오징어 게임', '기생충'],
        'year': [2021, 2019],
        'country': ['South Korea', 'South Korea'],
        'content_type': ['series', 'movie'],
        'synopsis': [
            "A desperate group of people compete in children's games for a massive cash prize.",
            'A poor family schemes to become employed by a wealthy family.'
        ],
        'rating': [8.7, 8.5],
        'genres': ['thriller,drama,mystery', 'thriller,drama,comedy'],
        'episodes': [9, None],
        'duration': [None, 132],
        'cast': [
            '[{"name": "Lee Jung-jae", "character": "Seong Gi-hun"}]',
            '[{"name": "Song Kang-ho", "character": "Ki-taek"}]'
        ],
        'crew': [
            '[{"name": "Hwang Dong-hyuk", "role": "director"}]',
            '[{"name": "Bong Joon-ho", "role": "director"}]'
        ],
        'streaming_platforms': ['Netflix', 'Hulu,Amazon Prime'],
        'tags': ['survival,korean,psychological', 'oscar winner,social commentary'],
        'poster_url': ['', ''],
        'banner_url': ['', '']
    }
    return {
        'message': 'Template structure',
        'columns': list(template_data.keys()),
        'required_columns': ['title'],
        'optional_columns': ['original_title', 'synopsis', 'year', 'country', 'content_type', 'rating', 'genres', 'episodes', 'duration', 'cast', 'crew', 'streaming_platforms', 'tags', 'poster_url', 'banner_url'],
        'sample_data': template_data
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


# Startup tasks
@app.on_event('startup')
async def on_startup():
    # Ensure default admin
    admin = await db.admins.find_one({"username": "admin"})
    if not admin:
        await db.admins.insert_one(AdminUser(username='admin', password_hash=hash_password('admin123')).dict())
        logger.info("Created default admin (admin/admin123)")

    # Seed sample content if empty
    if await db.content.count_documents({}) == 0:
        logger.info("Seeding sample content")
        samples = [
            {
                'id': str(uuid.uuid4()),
                'title': 'Squid Game',
                'original_title': '오징어 게임',
                'poster_url': 'https://images.unsplash.com/photo-1633882595230-0969f5af2780?q=85',
                'banner_url': None,
                'synopsis': "A deadly competition with children's games.",
                'year': 2021,
                'country': 'South Korea',
                'content_type': 'series',
                'genres': ['thriller', 'drama', 'mystery'],
                'rating': 8.7,
                'episodes': 9,
                'duration': None,
                'cast': [],
                'crew': [],
                'streaming_platforms': ['Netflix'],
                'tags': ['survival'],
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'Your Name',
                'original_title': '君の名は。',
                'poster_url': 'https://images.unsplash.com/photo-1539481915544-f5cd50562d66?q=85',
                'banner_url': None,
                'synopsis': 'Two teenagers share a profound, magical connection.',
                'year': 2016,
                'country': 'Japan',
                'content_type': 'anime',
                'genres': ['romance', 'fantasy', 'drama'],
                'rating': 8.4,
                'episodes': None,
                'duration': 106,
                'cast': [],
                'crew': [],
                'streaming_platforms': ['Crunchyroll'],
                'tags': ['anime'],
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            },
        ]
        await db.content.insert_many(samples)
        logger.info(f"Inserted {len(samples)} sample items")


@app.on_event('shutdown')
async def on_shutdown():
    client.close()