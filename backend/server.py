from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum
import jwt
import hashlib
import base64
import pandas as pd
import io
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'gdvg-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums for content types and genres
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

# Admin Models
class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    is_admin: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# User Models
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

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    joined_date: datetime
    is_verified: bool

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None

class UserSettings(BaseModel):
    theme: str = "dark"
    language: str = "en"
    notifications: dict = Field(default_factory=lambda: {
        "email": True,
        "push": True,
    })

class Token(BaseModel):
    access_token: str
    token_type: str

class AdminStats(BaseModel):
    total_content: int
    total_movies: int
    total_series: int
    total_dramas: int
    total_anime: int
    countries: int
    recent_additions: int

class BulkImportResult(BaseModel):
    success: bool
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[str]
    imported_content: List[str]  # List of imported content titles

# Content Models
class CastMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    character: str
    profile_image: Optional[str] = None

class CrewMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str  # director, writer, producer, etc.
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
    genres: List[ContentGenre]
    rating: float = Field(ge=0, le=10)
    episodes: Optional[int] = None
    duration: Optional[int] = None  # in minutes
    cast: List[CastMember] = []
    crew: List[CrewMember] = []
    streaming_platforms: List[str] = []
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ContentCreate(BaseModel):
    title: str
    original_title: Optional[str] = None
    poster_url: str  # base64 image data
    banner_url: Optional[str] = None  # base64 image data
    synopsis: str
    year: Optional[int] = None
    country: str
    content_type: ContentType
    genres: List[ContentGenre]
    rating: float = Field(ge=0, le=10)
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
    cast: Optional[List[CrewMember]] = None
    crew: Optional[List[CrewMember]] = None
    streaming_platforms: Optional[List[str]] = None
    tags: Optional[List[str]] = None

# ... rest of the file remains unchanged below ...

# Authentication helpers and dependencies

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current admin from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        
        if user_type != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
            
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    admin = await db.admins.find_one({"username": username})
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin not found")
    
    return AdminUser(**admin)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        
        if user_type != "user":
            raise HTTPException(status_code=401, detail="User access required")
            
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if '_id' in user:
        del user['_id']
    
    return User(**user)


def validate_email(email: str) -> bool:
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern) is not None


def validate_password(password: str) -> bool:
    """Validate password strength (min 6 characters)"""
    return len(password) >= 6


def parse_excel_csv_file(file_content: bytes, filename: str) -> pd.DataFrame:
    """Parse Excel or CSV file content"""
    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(file_content))
        elif filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format. Use .xlsx, .xls, or .csv")
        
        return df
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


def validate_and_convert_row(row: pd.Series) -> Optional[dict]:
    """Validate and convert a single row to content format (flexible). If a column is missing/empty, set a sensible default and mark display as N.A on UI.
    Only title is required; other fields are optional.
    """
    try:
        # Title is the only hard requirement
        if pd.isna(row.get('title')) or str(row.get('title')).strip() == '':
            return None

        # Parse genres (comma-separated string to list)
        genres = []
        if not pd.isna(row.get('genres')) and str(row.get('genres')).strip() != '':
            genre_list = str(row['genres']).split(',')
            for genre in genre_list:
                clean_genre = genre.strip().lower().replace(' ', '_')
                if clean_genre in [g.value for g in ContentGenre]:
                    genres.append(clean_genre)
        
        # Parse streaming platforms
        streaming_platforms = []
        if not pd.isna(row.get('streaming_platforms')) and str(row.get('streaming_platforms')).strip() != '':
            streaming_platforms = [p.strip() for p in str(row['streaming_platforms']).split(',') if p.strip()]
        
        # Parse cast (JSON string or comma-separated names)
        cast = []
        if not pd.isna(row.get('cast')) and str(row.get('cast')).strip() != '':
            cast_str = str(row['cast'])
            try:
                # Try to parse as JSON first
                cast_data = json.loads(cast_str)
                if isinstance(cast_data, list):
                    cast = [{"id": str(uuid.uuid4()), "name": member.get("name", ""), 
                            "character": member.get("character", ""), "profile_image": None} 
                           for member in cast_data if isinstance(member, dict) and member.get("name")]
            except Exception:
                # Fallback to comma-separated names
                cast_names = [name.strip() for name in cast_str.split(',') if name.strip()]
                cast = [{"id": str(uuid.uuid4()), "name": name, "character": "", "profile_image": None} 
                       for name in cast_names]
        
        # Parse crew
        crew = []
        if not pd.isna(row.get('crew')) and str(row.get('crew')).strip() != '':
            crew_str = str(row['crew'])
            try:
                crew_data = json.loads(crew_str)
                if isinstance(crew_data, list):
                    crew = [{"id": str(uuid.uuid4()), "name": member.get("name", ""), 
                            "role": member.get("role", ""), "profile_image": None} 
                           for member in crew_data if isinstance(member, dict) and member.get("name")]
            except Exception:
                # Simple fallback - assume director
                crew = [{"id": str(uuid.uuid4()), "name": crew_str.strip(), "role": "director", "profile_image": None}]
        
        # Parse tags
        tags = []
        if not pd.isna(row.get('tags')) and str(row.get('tags')).strip() != '':
            tags = [tag.strip() for tag in str(row['tags']).split(',') if tag.strip()]
        
        # Safe parsing helpers
        def parse_int(val):
            try:
                if pd.isna(val) or str(val).strip() == '':
                    return None
                return int(float(val))
            except Exception:
                return None
        
        def parse_float(val, default=None):
            try:
                if pd.isna(val) or str(val).strip() == '':
                    return default
                return float(val)
            except Exception:
                return default
        
        # Build content object with flexible defaults
        content_type_raw = str(row.get('content_type', '')).lower().strip()
        content_type = content_type_raw if content_type_raw in [ct.value for ct in ContentType] else 'drama'
        rating_val = parse_float(row.get('rating'), default=0.0)
        synopsis_val = str(row.get('synopsis', '')).strip() or 'N.A'
        country_val = str(row.get('country', '')).strip() or 'N.A'
        banner_val = str(row.get('banner_url', '')).strip() or None
        poster_val = str(row.get('poster_url', '')).strip() or "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        year_val = parse_int(row.get('year'))
        episodes_val = parse_int(row.get('episodes'))
        duration_val = parse_int(row.get('duration'))
        
        content_data = {
            "id": str(uuid.uuid4()),
            "title": str(row['title']).strip(),
            "original_title": str(row.get('original_title', '')).strip() or None,
            "poster_url": poster_val,
            "banner_url": banner_val,
            "synopsis": synopsis_val,
            "year": year_val,
            "country": country_val,
            "content_type": content_type,
            "genres": genres if genres else [],
            "rating": rating_val if rating_val is not None else 0.0,
            "episodes": episodes_val,
            "duration": duration_val,
            "cast": cast,
            "crew": crew,
            "streaming_platforms": streaming_platforms,
            "tags": tags,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return content_data
        
    except Exception as e:
        logger.error(f"Error validating row: {str(e)}")
        return None

# ... the rest of the file continues with routes and helpers ...

# Include the router in the main app
# (The router and middleware setup and startup events remain unchanged below)