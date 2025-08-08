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
        "social": True,
        "recommendations": True
    })
    privacy: dict = Field(default_factory=lambda: {
        "profile_public": True,
        "activity_public": True,
        "lists_public": True
    })

# Rating & Review Models
class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: str
    rating: float = Field(ge=0.0, le=10.0)  # 0-10 rating scale
    title: Optional[str] = None  # Review title
    review_text: Optional[str] = None  # Review content
    contains_spoilers: bool = False
    helpful_votes: int = 0
    total_votes: int = 0
    is_featured: bool = False  # Admin can feature reviews
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(BaseModel):
    content_id: str
    rating: float = Field(ge=0.0, le=10.0)
    title: Optional[str] = None
    review_text: Optional[str] = None
    contains_spoilers: bool = False

class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=0.0, le=10.0)
    title: Optional[str] = None
    review_text: Optional[str] = None
    contains_spoilers: Optional[bool] = None

class AdminReviewUpdate(BaseModel):
    review_text: Optional[str] = None
    is_featured: Optional[bool] = None
    contains_spoilers: Optional[bool] = None

class ReviewResponse(BaseModel):
    review: Review
    user: dict  # User info (username, avatar)
    content: dict  # Content info (title, poster)

class ReviewsListResponse(BaseModel):
    reviews: List[dict]
    total: int
    page: int
    limit: int
    avg_rating: Optional[float] = None

# User Analytics Models
class ViewingHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: str
    viewed_at: datetime = Field(default_factory=datetime.utcnow)
    viewing_duration: Optional[int] = None  # in minutes
    completion_percentage: Optional[float] = None  # 0-100%
    device_type: Optional[str] = None  # web, mobile, tablet
    
class UserAnalytics(BaseModel):
    total_content_watched: int
    total_viewing_time: int  # in minutes
    completion_rate: float  # percentage
    favorite_genres: List[dict]  # [{genre: str, count: int}]
    favorite_countries: List[dict]  # [{country: str, count: int}]
    viewing_streak: int  # days
    achievements: List[str]
    monthly_stats: dict  # viewing stats by month
    top_rated_content: List[dict]  # user's highest rated content

# Content Models - Add rating info
class ContentRating(BaseModel):
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # {1: count, 2: count, ...}
class WatchlistStatus(str, Enum):
    WANT_TO_WATCH = "want_to_watch"
    WATCHING = "watching" 
    COMPLETED = "completed"
    DROPPED = "dropped"

class WatchlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content_id: str
    status: WatchlistStatus
    progress: Optional[int] = None  # For episodes/duration progress
    total_episodes: Optional[int] = None  # Total episodes if series
    rating: Optional[float] = None  # User's personal rating
    notes: Optional[str] = None
    started_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    created_date: datetime = Field(default_factory=datetime.utcnow)

class WatchlistItemCreate(BaseModel):
    content_id: str
    status: WatchlistStatus
    progress: Optional[int] = None
    total_episodes: Optional[int] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

class WatchlistItemUpdate(BaseModel):
    status: Optional[WatchlistStatus] = None
    progress: Optional[int] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

class WatchlistResponse(BaseModel):
    items: List[dict]  # Will include content details
    total: int
    status_counts: dict

class AdminLogin(BaseModel):
    username: str
    password: str

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
    year: int
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
    year: int
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
    cast: Optional[List[CastMember]] = None
    crew: Optional[List[CrewMember]] = None
    streaming_platforms: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class ContentResponse(BaseModel):
    contents: List[Content]
    total: int
    page: int
    limit: int

# Authentication Functions
def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed_password

def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current admin user from JWT token"""
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
    return re.match(pattern, email) is not None

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
    """Validate and convert a single row to content format"""
    try:
        # Required fields validation
        required_fields = ['title', 'year', 'country', 'content_type', 'synopsis', 'rating']
        for field in required_fields:
            if pd.isna(row.get(field)) or str(row.get(field)).strip() == '':
                return None
        
        # Parse genres (comma-separated string to list)
        genres = []
        if not pd.isna(row.get('genres')):
            genre_list = str(row['genres']).split(',')
            for genre in genre_list:
                clean_genre = genre.strip().lower().replace(' ', '_')
                if clean_genre in [g.value for g in ContentGenre]:
                    genres.append(clean_genre)
        
        # Parse streaming platforms
        streaming_platforms = []
        if not pd.isna(row.get('streaming_platforms')):
            streaming_platforms = [p.strip() for p in str(row['streaming_platforms']).split(',') if p.strip()]
        
        # Parse cast (JSON string or comma-separated names)
        cast = []
        if not pd.isna(row.get('cast')):
            cast_str = str(row['cast'])
            try:
                # Try to parse as JSON first
                cast_data = json.loads(cast_str)
                if isinstance(cast_data, list):
                    cast = [{"id": str(uuid.uuid4()), "name": member.get("name", ""), 
                            "character": member.get("character", ""), "profile_image": None} 
                           for member in cast_data if isinstance(member, dict) and member.get("name")]
            except:
                # Fallback to comma-separated names
                cast_names = [name.strip() for name in cast_str.split(',') if name.strip()]
                cast = [{"id": str(uuid.uuid4()), "name": name, "character": "", "profile_image": None} 
                       for name in cast_names]
        
        # Parse crew
        crew = []
        if not pd.isna(row.get('crew')):
            crew_str = str(row['crew'])
            try:
                crew_data = json.loads(crew_str)
                if isinstance(crew_data, list):
                    crew = [{"id": str(uuid.uuid4()), "name": member.get("name", ""), 
                            "role": member.get("role", ""), "profile_image": None} 
                           for member in crew_data if isinstance(member, dict) and member.get("name")]
            except:
                # Simple fallback - assume director
                crew = [{"id": str(uuid.uuid4()), "name": crew_str.strip(), "role": "director", "profile_image": None}]
        
        # Parse tags
        tags = []
        if not pd.isna(row.get('tags')):
            tags = [tag.strip() for tag in str(row['tags']).split(',') if tag.strip()]
        
        # Build content object
        content_data = {
            "id": str(uuid.uuid4()),
            "title": str(row['title']).strip(),
            "original_title": str(row.get('original_title', '')).strip() or None,
            "poster_url": str(row.get('poster_url', '')).strip() or "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",  # Default 1x1 transparent image
            "banner_url": str(row.get('banner_url', '')).strip() or None,
            "synopsis": str(row['synopsis']).strip(),
            "year": int(row['year']),
            "country": str(row['country']).strip(),
            "content_type": str(row['content_type']).lower().strip(),
            "genres": genres,
            "rating": float(row['rating']),
            "episodes": int(row['episodes']) if not pd.isna(row.get('episodes')) and str(row['episodes']).isdigit() else None,
            "duration": int(row['duration']) if not pd.isna(row.get('duration')) and str(row['duration']).isdigit() else None,
            "cast": cast,
            "crew": crew,
            "streaming_platforms": streaming_platforms,
            "tags": tags,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Validate content type
        if content_data['content_type'] not in [ct.value for ct in ContentType]:
            return None
        
        # Validate rating range
        if not (0 <= content_data['rating'] <= 10):
            return None
            
        return content_data
        
    except Exception as e:
        logger.error(f"Error validating row: {str(e)}")
        return None

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Global Drama Verse Guide API"}

# User Authentication Routes
@api_router.post("/auth/register", response_model=UserProfile)
async def register_user(user_data: UserCreate):
    """User registration"""
    
    # Validate email format
    if not validate_email(user_data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password strength
    if not validate_password(user_data.password):
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        preferences={
            "theme": "dark",
            "language": "en",
            "notifications": {
                "email": True,
                "push": True,
                "social": True
            }
        }
    )
    
    # Insert into database
    await db.users.insert_one(user.dict())
    
    # Return user profile (without password)
    return UserProfile(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        joined_date=user.joined_date,
        is_verified=user.is_verified
    )

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """User login"""
    
    # Find user by email
    user = await db.users.find_one({"email": user_data.email})
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"], "type": "user"})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
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

@api_router.get("/users/{username}", response_model=UserProfile)
async def get_user_profile(username: str):
    """Get public user profile"""
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if '_id' in user:
        del user['_id']
    
    user_obj = User(**user)
    return UserProfile(
        id=user_obj.id,
        email=user_obj.email,
        username=user_obj.username,
        first_name=user_obj.first_name,
        last_name=user_obj.last_name,
        avatar_url=user_obj.avatar_url,
        bio=user_obj.bio,
        location=user_obj.location,
        joined_date=user_obj.joined_date,
        is_verified=user_obj.is_verified
    )

@api_router.put("/auth/profile", response_model=UserProfile)
async def update_user_profile(
    profile_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    
    # Build update data
    update_data = {}
    if profile_data.first_name is not None:
        update_data["first_name"] = profile_data.first_name.strip()
    if profile_data.last_name is not None:
        update_data["last_name"] = profile_data.last_name.strip()
    if profile_data.bio is not None:
        update_data["bio"] = profile_data.bio.strip()
    if profile_data.location is not None:
        update_data["location"] = profile_data.location.strip()
    if profile_data.avatar_url is not None:
        update_data["avatar_url"] = profile_data.avatar_url
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update in database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    if '_id' in updated_user:
        del updated_user['_id']
    
    user_obj = User(**updated_user)
    return UserProfile(
        id=user_obj.id,
        email=user_obj.email,
        username=user_obj.username,
        first_name=user_obj.first_name,
        last_name=user_obj.last_name,
        avatar_url=user_obj.avatar_url,
        bio=user_obj.bio,
        location=user_obj.location,
        joined_date=user_obj.joined_date,
        is_verified=user_obj.is_verified
    )

@api_router.post("/auth/avatar", response_model=UserProfile)
async def upload_avatar(
    avatar_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar"""
    
    # Validate file type
    if not avatar_file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and convert to base64
    file_content = await avatar_file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Convert to base64
    import base64
    avatar_base64 = f"data:{avatar_file.content_type};base64,{base64.b64encode(file_content).decode('utf-8')}"
    
    # Update user avatar
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"avatar_url": avatar_base64, "updated_at": datetime.utcnow()}}
    )
    
    # Return updated profile
    updated_user = await db.users.find_one({"id": current_user.id})
    if '_id' in updated_user:
        del updated_user['_id']
    
    user_obj = User(**updated_user)
    return UserProfile(
        id=user_obj.id,
        email=user_obj.email,
        username=user_obj.username,
        first_name=user_obj.first_name,
        last_name=user_obj.last_name,
        avatar_url=user_obj.avatar_url,
        bio=user_obj.bio,
        location=user_obj.location,
        joined_date=user_obj.joined_date,
        is_verified=user_obj.is_verified
    )

@api_router.get("/auth/settings", response_model=UserSettings)
async def get_user_settings(current_user: User = Depends(get_current_user)):
    """Get user settings"""
    settings = current_user.preferences
    
    return UserSettings(
        theme=settings.get("theme", "dark"),
        language=settings.get("language", "en"),
        notifications=settings.get("notifications", {
            "email": True,
            "push": True,
            "social": True,
            "recommendations": True
        }),
        privacy=settings.get("privacy", {
            "profile_public": True,
            "activity_public": True,
            "lists_public": True
        })
    )

@api_router.put("/auth/settings", response_model=UserSettings)
async def update_user_settings(
    settings_data: UserSettings,
    current_user: User = Depends(get_current_user)
):
    """Update user settings"""
    
    # Update user preferences
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "preferences": settings_data.dict(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    return settings_data

# Watchlist API Endpoints
@api_router.get("/watchlist", response_model=WatchlistResponse)
async def get_user_watchlist(
    status: Optional[WatchlistStatus] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get user's watchlist with optional status filter"""
    skip = (page - 1) * limit
    
    # Build filter query
    filter_query = {"user_id": current_user.id}
    if status:
        filter_query["status"] = status
    
    # Get watchlist items
    cursor = db.watchlist.find(filter_query).sort("updated_date", -1).skip(skip).limit(limit)
    watchlist_items = await cursor.to_list(length=limit)
    
    # Get content details for each item
    items_with_content = []
    for item in watchlist_items:
        if '_id' in item:
            del item['_id']
        
        # Fetch content details
        content = await db.content.find_one({"id": item["content_id"]})
        if content:
            if '_id' in content:
                del content['_id']
            
            item_with_content = {
                **item,
                "content": content
            }
            items_with_content.append(item_with_content)
    
    # Get total count
    total = await db.watchlist.count_documents({"user_id": current_user.id})
    
    # Get status counts
    status_counts = {}
    for status_value in WatchlistStatus:
        count = await db.watchlist.count_documents({
            "user_id": current_user.id,
            "status": status_value.value
        })
        status_counts[status_value.value] = count
    
    return WatchlistResponse(
        items=items_with_content,
        total=total,
        status_counts=status_counts
    )

@api_router.post("/watchlist", response_model=dict)
async def add_to_watchlist(
    item_data: WatchlistItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Add content to user's watchlist"""
    
    # Check if content exists
    content = await db.content.find_one({"id": item_data.content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if item already exists in watchlist
    existing_item = await db.watchlist.find_one({
        "user_id": current_user.id,
        "content_id": item_data.content_id
    })
    
    if existing_item:
        raise HTTPException(status_code=400, detail="Content already in watchlist")
    
    # Create watchlist item
    watchlist_item = WatchlistItem(
        user_id=current_user.id,
        **item_data.dict()
    )
    
    # Set dates based on status
    if item_data.status == WatchlistStatus.WATCHING:
        watchlist_item.started_date = datetime.utcnow()
    elif item_data.status == WatchlistStatus.COMPLETED:
        watchlist_item.started_date = datetime.utcnow()
        watchlist_item.completed_date = datetime.utcnow()
    
    # Insert into database
    await db.watchlist.insert_one(watchlist_item.dict())
    
    return {"message": "Content added to watchlist successfully", "id": watchlist_item.id}

@api_router.put("/watchlist/{item_id}", response_model=dict)
async def update_watchlist_item(
    item_id: str,
    item_data: WatchlistItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update watchlist item"""
    
    # Find existing item
    existing_item = await db.watchlist.find_one({
        "id": item_id,
        "user_id": current_user.id
    })
    
    if not existing_item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    # Build update data
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    
    # Update dates based on status changes
    if item_data.status:
        if item_data.status == WatchlistStatus.WATCHING and not existing_item.get("started_date"):
            update_data["started_date"] = datetime.utcnow()
        elif item_data.status == WatchlistStatus.COMPLETED:
            if not existing_item.get("started_date"):
                update_data["started_date"] = datetime.utcnow()
            update_data["completed_date"] = datetime.utcnow()
        elif item_data.status == WatchlistStatus.DROPPED and not existing_item.get("started_date"):
            update_data["started_date"] = datetime.utcnow()
    
    update_data["updated_date"] = datetime.utcnow()
    
    # Update in database
    await db.watchlist.update_one(
        {"id": item_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    return {"message": "Watchlist item updated successfully"}

@api_router.delete("/watchlist/{item_id}")
async def remove_from_watchlist(
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove content from user's watchlist"""
    
    # Check if item exists
    existing_item = await db.watchlist.find_one({
        "id": item_id,
        "user_id": current_user.id
    })
    
    if not existing_item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    # Delete item
    await db.watchlist.delete_one({
        "id": item_id,
        "user_id": current_user.id
    })
    
    return {"message": "Content removed from watchlist successfully"}

@api_router.get("/watchlist/stats", response_model=dict)
async def get_watchlist_stats(current_user: User = Depends(get_current_user)):
    """Get user's watchlist statistics"""
    
    # Get status counts
    status_counts = {}
    for status_value in WatchlistStatus:
        count = await db.watchlist.count_documents({
            "user_id": current_user.id,
            "status": status_value.value
        })
        status_counts[status_value.value] = count
    
    # Get total content count
    total_content = await db.watchlist.count_documents({"user_id": current_user.id})
    
    # Get recent activity (last 10 items)
    recent_cursor = db.watchlist.find({
        "user_id": current_user.id
    }).sort("updated_date", -1).limit(10)
    recent_items = await recent_cursor.to_list(length=10)
    
    # Get content details for recent items
    recent_with_content = []
    for item in recent_items:
        if '_id' in item:
            del item['_id']
        
        content = await db.content.find_one({"id": item["content_id"]})
        if content:
            if '_id' in content:
                del content['_id']
            
            recent_with_content.append({
                **item,
                "content": content
            })
    
    return {
        "status_counts": status_counts,
        "total_content": total_content,
        "recent_activity": recent_with_content
    }

# Rating & Review API Endpoints
@api_router.post("/reviews", response_model=dict)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new review for content"""
    
    # Check if content exists
    content = await db.content.find_one({"id": review_data.content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if user already reviewed this content
    existing_review = await db.reviews.find_one({
        "user_id": current_user.id,
        "content_id": review_data.content_id
    })
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this content")
    
    # Create review
    review = Review(
        user_id=current_user.id,
        **review_data.dict()
    )
    
    # Insert into database
    await db.reviews.insert_one(review.dict())
    
    # Update content's average rating
    await update_content_rating(review_data.content_id)
    
    return {"message": "Review created successfully", "id": review.id}

@api_router.get("/reviews", response_model=ReviewsListResponse)
async def get_reviews(
    content_id: Optional[str] = None,
    user_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_date", regex="^(created_date|rating|helpful_votes)$")
):
    """Get reviews with optional filters"""
    skip = (page - 1) * limit
    
    # Build filter query
    filter_query = {}
    if content_id:
        filter_query["content_id"] = content_id
    if user_id:
        filter_query["user_id"] = user_id
    
    # Get total count
    total = await db.reviews.count_documents(filter_query)
    
    # Get reviews with sorting
    sort_direction = -1  # Newest first
    cursor = db.reviews.find(filter_query).sort(sort_by, sort_direction).skip(skip).limit(limit)
    reviews = await cursor.to_list(length=limit)
    
    # Enrich reviews with user and content data
    enriched_reviews = []
    for review in reviews:
        if '_id' in review:
            del review['_id']
        
        # Get user info
        user = await db.users.find_one({"id": review["user_id"]})
        user_info = {
            "username": user["username"],
            "avatar_url": user.get("avatar_url"),
            "is_verified": user.get("is_verified", False)
        } if user else {}
        
        # Get content info
        content = await db.content.find_one({"id": review["content_id"]})
        content_info = {
            "title": content["title"],
            "poster_url": content["poster_url"],
            "year": content["year"]
        } if content else {}
        
        enriched_reviews.append({
            **review,
            "user": user_info,
            "content": content_info
        })
    
    # Calculate average rating if filtering by content
    avg_rating = None
    if content_id:
        rating_pipeline = [
            {"$match": {"content_id": content_id}},
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
        ]
        avg_result = await db.reviews.aggregate(rating_pipeline).to_list(1)
        if avg_result:
            avg_rating = round(avg_result[0]["avg_rating"], 1)
    
    return ReviewsListResponse(
        reviews=enriched_reviews,
        total=total,
        page=page,
        limit=limit,
        avg_rating=avg_rating
    )

@api_router.get("/reviews/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: str):
    """Get a specific review by ID"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if '_id' in review:
        del review['_id']
    
    # Get user and content info
    user = await db.users.find_one({"id": review["user_id"]})
    content = await db.content.find_one({"id": review["content_id"]})
    
    user_info = {
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
        "is_verified": user.get("is_verified", False)
    } if user else {}
    
    content_info = {
        "title": content["title"],
        "poster_url": content["poster_url"],
        "year": content["year"]
    } if content else {}
    
    return ReviewResponse(
        review=Review(**review),
        user=user_info,
        content=content_info
    )

@api_router.put("/reviews/{review_id}", response_model=dict)
async def update_review(
    review_id: str,
    review_data: ReviewUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user's own review"""
    
    # Find existing review
    existing_review = await db.reviews.find_one({
        "id": review_id,
        "user_id": current_user.id
    })
    
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found or not owned by user")
    
    # Build update data
    update_data = {k: v for k, v in review_data.dict().items() if v is not None}
    update_data["updated_date"] = datetime.utcnow()
    
    # Update in database
    await db.reviews.update_one(
        {"id": review_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    # Update content's average rating if rating changed
    if review_data.rating is not None:
        await update_content_rating(existing_review["content_id"])
    
    return {"message": "Review updated successfully"}

@api_router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete user's own review"""
    
    # Find existing review
    existing_review = await db.reviews.find_one({
        "id": review_id,
        "user_id": current_user.id
    })
    
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found or not owned by user")
    
    # Delete review
    await db.reviews.delete_one({
        "id": review_id,
        "user_id": current_user.id
    })
    
    # Update content's average rating
    await update_content_rating(existing_review["content_id"])
    
    return {"message": "Review deleted successfully"}

@api_router.post("/reviews/{review_id}/vote")
async def vote_review(
    review_id: str,
    helpful: bool,
    current_user: User = Depends(get_current_user)
):
    """Vote on review helpfulness"""
    
    # Find review
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if user already voted
    existing_vote = await db.review_votes.find_one({
        "review_id": review_id,
        "user_id": current_user.id
    })
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted on this review")
    
    # Record vote
    vote_record = {
        "id": str(uuid.uuid4()),
        "review_id": review_id,
        "user_id": current_user.id,
        "helpful": helpful,
        "created_date": datetime.utcnow()
    }
    await db.review_votes.insert_one(vote_record)
    
    # Update review vote counts
    if helpful:
        await db.reviews.update_one(
            {"id": review_id},
            {"$inc": {"helpful_votes": 1, "total_votes": 1}}
        )
    else:
        await db.reviews.update_one(
            {"id": review_id},
            {"$inc": {"total_votes": 1}}
        )
    
    return {"message": "Vote recorded successfully"}

@api_router.get("/content/{content_id}/ratings", response_model=ContentRating)
async def get_content_ratings(content_id: str):
    """Get content rating statistics"""
    
    # Check if content exists
    content = await db.content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Get rating statistics
    rating_pipeline = [
        {"$match": {"content_id": content_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1},
            "ratings": {"$push": "$rating"}
        }}
    ]
    
    result = await db.reviews.aggregate(rating_pipeline).to_list(1)
    
    if not result:
        return ContentRating(
            average_rating=0.0,
            total_reviews=0,
            rating_distribution={}
        )
    
    data = result[0]
    avg_rating = round(data["avg_rating"], 1)
    total_reviews = data["total_reviews"]
    ratings = data["ratings"]
    
    # Calculate rating distribution (1-10 scale, grouped by whole numbers)
    rating_distribution = {}
    for i in range(1, 11):
        rating_distribution[str(i)] = sum(1 for r in ratings if i <= r < i + 1)
    
    # Handle ratings of exactly 10
    rating_distribution["10"] = sum(1 for r in ratings if r == 10.0)
    
    return ContentRating(
        average_rating=avg_rating,
        total_reviews=total_reviews,
        rating_distribution=rating_distribution
    )

# Helper function to update content rating
async def update_content_rating(content_id: str):
    """Update content's average rating and review count"""
    
    # Calculate new average rating
    rating_pipeline = [
        {"$match": {"content_id": content_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1}
        }}
    ]
    
    result = await db.reviews.aggregate(rating_pipeline).to_list(1)
    
    if result:
        data = result[0]
        avg_rating = round(data["avg_rating"], 1)
        total_reviews = data["total_reviews"]
    else:
        avg_rating = 0.0
        total_reviews = 0
    
    # Update content document
    await db.content.update_one(
        {"id": content_id},
        {"$set": {
            "rating": avg_rating,
            "review_count": total_reviews,
            "updated_at": datetime.utcnow()
        }}
    )

# Personal Analytics API Endpoints
@api_router.post("/analytics/view")
async def track_viewing(
    content_id: str,
    viewing_duration: Optional[int] = None,
    completion_percentage: Optional[float] = None,
    device_type: Optional[str] = "web",
    current_user: User = Depends(get_current_user)
):
    """Track user's viewing activity"""
    
    # Check if content exists
    content = await db.content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Create viewing history entry
    viewing_entry = ViewingHistory(
        user_id=current_user.id,
        content_id=content_id,
        viewing_duration=viewing_duration,
        completion_percentage=completion_percentage,
        device_type=device_type
    )
    
    # Insert into database
    await db.viewing_history.insert_one(viewing_entry.dict())
    
    # Update user's last activity
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"last_activity": datetime.utcnow()}}
    )
    
    return {"message": "Viewing activity tracked successfully"}

@api_router.get("/analytics/dashboard", response_model=UserAnalytics)
async def get_user_analytics(current_user: User = Depends(get_current_user)):
    """Get comprehensive user analytics"""
    
    # Total content watched (unique content)
    total_content = await db.viewing_history.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$group": {"_id": "$content_id"}},
        {"$count": "total"}
    ]).to_list(1)
    total_content_watched = total_content[0]["total"] if total_content else 0
    
    # Total viewing time
    total_time = await db.viewing_history.aggregate([
        {"$match": {"user_id": current_user.id, "viewing_duration": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$viewing_duration"}}}
    ]).to_list(1)
    total_viewing_time = total_time[0]["total"] if total_time else 0
    
    # Completion rate from watchlist
    completed_count = await db.watchlist.count_documents({
        "user_id": current_user.id,
        "status": "completed"
    })
    total_watchlist = await db.watchlist.count_documents({"user_id": current_user.id})
    completion_rate = (completed_count / total_watchlist * 100) if total_watchlist > 0 else 0
    
    # Favorite genres from watchlist and reviews
    favorite_genres = await db.watchlist.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$unwind": "$content.genres"},
        {"$group": {"_id": "$content.genres", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"genre": "$_id", "count": 1, "_id": 0}}
    ]).to_list(5)
    
    # Favorite countries
    favorite_countries = await db.watchlist.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$group": {"_id": "$content.country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"country": "$_id", "count": 1, "_id": 0}}
    ]).to_list(5)
    
    # Viewing streak calculation
    viewing_streak = await calculate_viewing_streak(current_user.id)
    
    # Achievements
    achievements = await calculate_achievements(current_user.id, {
        "total_content_watched": total_content_watched,
        "total_viewing_time": total_viewing_time,
        "completion_rate": completion_rate
    })
    
    # Monthly stats (last 6 months)
    monthly_stats = await get_monthly_viewing_stats(current_user.id)
    
    # Top rated content by user
    top_rated_content = await db.reviews.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$sort": {"rating": -1}},
        {"$limit": 10},
        {"$lookup": {
            "from": "content",
            "localField": "content_id", 
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$project": {
            "rating": 1,
            "title": "$content.title",
            "poster_url": "$content.poster_url",
            "year": "$content.year"
        }}
    ]).to_list(10)
    
    return UserAnalytics(
        total_content_watched=total_content_watched,
        total_viewing_time=total_viewing_time,
        completion_rate=round(completion_rate, 1),
        favorite_genres=favorite_genres,
        favorite_countries=favorite_countries,
        viewing_streak=viewing_streak,
        achievements=achievements,
        monthly_stats=monthly_stats,
        top_rated_content=top_rated_content
    )

@api_router.get("/analytics/history")
async def get_viewing_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get user's viewing history"""
    skip = (page - 1) * limit
    
    cursor = db.viewing_history.find({
        "user_id": current_user.id
    }).sort("viewed_at", -1).skip(skip).limit(limit)
    
    history = await cursor.to_list(length=limit)
    
    # Enrich with content data
    enriched_history = []
    for entry in history:
        if '_id' in entry:
            del entry['_id']
        
        content = await db.content.find_one({"id": entry["content_id"]})
        if content:
            if '_id' in content:
                del content['_id']
            
            enriched_history.append({
                **entry,
                "content": {
                    "title": content["title"],
                    "poster_url": content["poster_url"],
                    "year": content["year"],
                    "content_type": content["content_type"]
                }
            })
    
    total = await db.viewing_history.count_documents({"user_id": current_user.id})
    
    return {
        "history": enriched_history,
        "total": total,
        "page": page,
        "limit": limit
    }

# Helper functions for analytics
async def calculate_viewing_streak(user_id: str) -> int:
    """Calculate consecutive days of viewing activity"""
    today = datetime.utcnow().date()
    streak = 0
    current_date = today
    
    for i in range(365):  # Check up to 1 year
        start_of_day = datetime.combine(current_date, datetime.min.time())
        end_of_day = datetime.combine(current_date, datetime.max.time())
        
        activity = await db.viewing_history.find_one({
            "user_id": user_id,
            "viewed_at": {"$gte": start_of_day, "$lte": end_of_day}
        })
        
        if activity:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
    
    return streak

async def calculate_achievements(user_id: str, stats: dict) -> List[str]:
    """Calculate user achievements based on their activity"""
    achievements = []
    
    # Content-based achievements
    if stats["total_content_watched"] >= 1:
        achievements.append("🎬 First Watch")
    if stats["total_content_watched"] >= 10:
        achievements.append("🎯 Explorer")
    if stats["total_content_watched"] >= 50:
        achievements.append("🌟 Enthusiast")
    if stats["total_content_watched"] >= 100:
        achievements.append("🏆 Connoisseur")
    
    # Time-based achievements
    if stats["total_viewing_time"] >= 60:  # 1 hour
        achievements.append("⏰ Getting Started")
    if stats["total_viewing_time"] >= 1440:  # 24 hours
        achievements.append("📺 Binge Watcher")
    if stats["total_viewing_time"] >= 10080:  # 1 week
        achievements.append("🎭 Drama Devotee")
    
    # Completion achievements
    if stats["completion_rate"] >= 50:
        achievements.append("✅ Finisher")
    if stats["completion_rate"] >= 80:
        achievements.append("💯 Completionist")
    
    # Review achievements
    review_count = await db.reviews.count_documents({"user_id": user_id})
    if review_count >= 1:
        achievements.append("✍️ Reviewer")
    if review_count >= 10:
        achievements.append("📝 Critic")
    if review_count >= 50:
        achievements.append("🎤 Voice of the Community")
    
    return achievements

async def get_monthly_viewing_stats(user_id: str) -> dict:
    """Get viewing statistics for the last 6 months"""
    monthly_stats = {}
    current_date = datetime.utcnow()
    
    for i in range(6):
        # Calculate month/year
        month_date = current_date - timedelta(days=30*i)
        month_key = month_date.strftime("%Y-%m")
        
        # Get start and end of month
        start_of_month = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_date.month == 12:
            end_of_month = month_date.replace(year=month_date.year+1, month=1, day=1) - timedelta(seconds=1)
        else:
            end_of_month = month_date.replace(month=month_date.month+1, day=1) - timedelta(seconds=1)
        
        # Count unique content watched
        unique_content = await db.viewing_history.aggregate([
            {"$match": {
                "user_id": user_id,
                "viewed_at": {"$gte": start_of_month, "$lte": end_of_month}
            }},
            {"$group": {"_id": "$content_id"}},
            {"$count": "total"}
        ]).to_list(1)
        
        content_count = unique_content[0]["total"] if unique_content else 0
        
        # Total viewing time
        total_time = await db.viewing_history.aggregate([
            {"$match": {
                "user_id": user_id,
                "viewed_at": {"$gte": start_of_month, "$lte": end_of_month},
                "viewing_duration": {"$ne": None}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$viewing_duration"}}}
        ]).to_list(1)
        
        viewing_time = total_time[0]["total"] if total_time else 0
        
        monthly_stats[month_key] = {
            "content_count": content_count,
            "viewing_time": viewing_time,
            "month_name": month_date.strftime("%B %Y")
        }
    
    return monthly_stats

# Day 7: Social Features Core - Models
class UserFollow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str  # User who follows
    following_id: str  # User being followed
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityFeed(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    activity_type: str  # watched, rated, reviewed, added_to_list
    content_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)  # Additional activity data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True

class SocialStats(BaseModel):
    followers_count: int
    following_count: int
    public_reviews: int
    public_lists: int

# Social Features API Endpoints
@api_router.post("/social/follow/{username}")
async def follow_user(
    username: str,
    current_user: User = Depends(get_current_user)
):
    """Follow another user"""
    
    # Find user to follow
    target_user = await db.users.find_one({"username": username})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if already following
    existing_follow = await db.user_follows.find_one({
        "follower_id": current_user.id,
        "following_id": target_user["id"]
    })
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    follow = UserFollow(
        follower_id=current_user.id,
        following_id=target_user["id"]
    )
    
    await db.user_follows.insert_one(follow.dict())
    
    # Create activity feed entry
    activity = ActivityFeed(
        user_id=current_user.id,
        activity_type="followed_user",
        metadata={"followed_username": target_user["username"]}
    )
    await db.activity_feed.insert_one(activity.dict())
    
    return {"message": f"Now following {username}"}

@api_router.delete("/social/unfollow/{username}")
async def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user)
):
    """Unfollow a user"""
    
    # Find user to unfollow
    target_user = await db.users.find_one({"username": username})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove follow relationship
    result = await db.user_follows.delete_one({
        "follower_id": current_user.id,
        "following_id": target_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not following this user")
    
    return {"message": f"Unfollowed {username}"}

@api_router.get("/social/followers/{username}")
async def get_user_followers(
    username: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's followers"""
    skip = (page - 1) * limit
    
    # Find user
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get followers
    followers = await db.user_follows.aggregate([
        {"$match": {"following_id": user["id"]}},
        {"$lookup": {
            "from": "users",
            "localField": "follower_id",
            "foreignField": "id", 
            "as": "follower"
        }},
        {"$unwind": "$follower"},
        {"$project": {
            "_id": 0,
            "username": "$follower.username",
            "avatar_url": "$follower.avatar_url",
            "is_verified": "$follower.is_verified",
            "followed_at": "$created_at"
        }},
        {"$sort": {"followed_at": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    total = await db.user_follows.count_documents({"following_id": user["id"]})
    
    return {
        "followers": followers,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/social/following/{username}")
async def get_user_following(
    username: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get users that this user follows"""
    skip = (page - 1) * limit
    
    # Find user
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get following
    following = await db.user_follows.aggregate([
        {"$match": {"follower_id": user["id"]}},
        {"$lookup": {
            "from": "users",
            "localField": "following_id",
            "foreignField": "id",
            "as": "following"
        }},
        {"$unwind": "$following"},
        {"$project": {
            "_id": 0,
            "username": "$following.username",
            "avatar_url": "$following.avatar_url", 
            "is_verified": "$following.is_verified",
            "followed_at": "$created_at"
        }},
        {"$sort": {"followed_at": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    total = await db.user_follows.count_documents({"follower_id": user["id"]})
    
    return {
        "following": following,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/social/feed")
async def get_activity_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get activity feed from followed users"""
    skip = (page - 1) * limit
    
    # Get users that current user follows
    following_users = await db.user_follows.find({
        "follower_id": current_user.id
    }).to_list(None)
    
    following_ids = [follow["following_id"] for follow in following_users]
    following_ids.append(current_user.id)  # Include own activities
    
    # Get activities from followed users
    activities = await db.activity_feed.aggregate([
        {"$match": {
            "user_id": {"$in": following_ids},
            "is_public": True
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$project": {
            "_id": 0,
            "activity_type": 1,
            "metadata": 1,
            "created_at": 1,
            "user": {
                "username": "$user.username",
                "avatar_url": "$user.avatar_url",
                "is_verified": "$user.is_verified"
            },
            "content": {
                "$arrayElemAt": [
                    {
                        "$map": {
                            "input": "$content",
                            "as": "c",
                            "in": {
                                "title": "$$c.title",
                                "poster_url": "$$c.poster_url",
                                "year": "$$c.year",
                                "content_type": "$$c.content_type"
                            }
                        }
                    },
                    0
                ]
            }
        }},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    total = await db.activity_feed.count_documents({
        "user_id": {"$in": following_ids},
        "is_public": True
    })
    
    return {
        "activities": activities,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/social/stats/{username}", response_model=SocialStats)
async def get_user_social_stats(username: str):
    """Get user's social statistics"""
    
    # Find user
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get followers count
    followers_count = await db.user_follows.count_documents({"following_id": user["id"]})
    
    # Get following count
    following_count = await db.user_follows.count_documents({"follower_id": user["id"]})
    
    # Get public reviews count
    public_reviews = await db.reviews.count_documents({"user_id": user["id"]})
    
    # Get public lists count (completed watchlist items)
    public_lists = await db.watchlist.count_documents({
        "user_id": user["id"],
        "status": "completed"
    })
    
    return SocialStats(
        followers_count=followers_count,
        following_count=following_count,
        public_reviews=public_reviews,
        public_lists=public_lists
    )

# Helper function to create activity feed entries
async def create_activity(user_id: str, activity_type: str, content_id: str = None, metadata: dict = None):
    """Create an activity feed entry"""
    activity = ActivityFeed(
        user_id=user_id,
        activity_type=activity_type,
        content_id=content_id,
        metadata=metadata or {}
    )
    
    await db.activity_feed.insert_one(activity.dict())

# Day 8-9: Enhanced Social Interactions - Models  
class ReviewLike(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    review_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    review_id: str
    comment_text: str
    parent_comment_id: Optional[str] = None  # For nested comments
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewCommentCreate(BaseModel):
    review_id: str
    comment_text: str
    parent_comment_id: Optional[str] = None

# Enhanced Social Interactions API Endpoints
@api_router.post("/reviews/{review_id}/like")
async def like_review(
    review_id: str,
    current_user: User = Depends(get_current_user)
):
    """Like or unlike a review"""
    
    # Check if review exists
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if already liked
    existing_like = await db.review_likes.find_one({
        "user_id": current_user.id,
        "review_id": review_id
    })
    
    if existing_like:
        # Unlike - remove like
        await db.review_likes.delete_one({
            "user_id": current_user.id,
            "review_id": review_id
        })
        
        # Update review like count
        await db.reviews.update_one(
            {"id": review_id},
            {"$inc": {"like_count": -1}}
        )
        
        return {"message": "Review unliked successfully", "liked": False}
    else:
        # Like - add like
        like = ReviewLike(
            user_id=current_user.id,
            review_id=review_id
        )
        await db.review_likes.insert_one(like.dict())
        
        # Update review like count
        await db.reviews.update_one(
            {"id": review_id},
            {"$inc": {"like_count": 1}}
        )
        
        # Create activity feed entry (if not user's own review)
        if review["user_id"] != current_user.id:
            await create_activity(
                current_user.id,
                "liked_review",
                review.get("content_id"),
                {"review_id": review_id, "review_author": review["user_id"]}
            )
        
        return {"message": "Review liked successfully", "liked": True}

@api_router.get("/reviews/{review_id}/likes")
async def get_review_likes(
    review_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get users who liked a review"""
    skip = (page - 1) * limit
    
    # Check if review exists
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get likes with user info
    likes = await db.review_likes.aggregate([
        {"$match": {"review_id": review_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$project": {
            "_id": 0,
            "user": {
                "username": "$user.username",
                "avatar_url": "$user.avatar_url",
                "is_verified": "$user.is_verified"
            },
            "liked_at": "$created_at"
        }},
        {"$sort": {"liked_at": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    total = await db.review_likes.count_documents({"review_id": review_id})
    
    return {
        "likes": likes,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.post("/reviews/{review_id}/comments", response_model=dict)
async def add_review_comment(
    review_id: str,
    comment_data: ReviewCommentCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a review"""
    
    # Check if review exists
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # If replying to a comment, check if parent exists
    if comment_data.parent_comment_id:
        parent_comment = await db.review_comments.find_one({"id": comment_data.parent_comment_id})
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    # Create comment
    comment = ReviewComment(
        user_id=current_user.id,
        **comment_data.dict()
    )
    
    await db.review_comments.insert_one(comment.dict())
    
    # Update review comment count
    await db.reviews.update_one(
        {"id": review_id},
        {"$inc": {"comment_count": 1}}
    )
    
    # Create activity feed entry (if not user's own review)
    if review["user_id"] != current_user.id:
        await create_activity(
            current_user.id,
            "commented_review",
            review.get("content_id"),
            {"review_id": review_id, "review_author": review["user_id"]}
        )
    
    return {"message": "Comment added successfully", "id": comment.id}

@api_router.get("/reviews/{review_id}/comments")
async def get_review_comments(
    review_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get comments for a review"""
    skip = (page - 1) * limit
    
    # Check if review exists
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get comments with user info, organized by parent/child structure
    comments = await db.review_comments.aggregate([
        {"$match": {"review_id": review_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$project": {
            "_id": 0,
            "id": 1,
            "comment_text": 1,
            "parent_comment_id": 1,
            "created_at": 1,
            "updated_at": 1,
            "user": {
                "username": "$user.username",
                "avatar_url": "$user.avatar_url",
                "is_verified": "$user.is_verified"
            }
        }},
        {"$sort": {"created_at": 1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    total = await db.review_comments.count_documents({"review_id": review_id})
    
    # Organize comments into threads (parent comments with replies)
    comment_threads = []
    parent_comments = [c for c in comments if not c.get("parent_comment_id")]
    
    for parent in parent_comments:
        replies = [c for c in comments if c.get("parent_comment_id") == parent["id"]]
        comment_threads.append({
            "comment": parent,
            "replies": replies
        })
    
    return {
        "comment_threads": comment_threads,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    comment_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user's own comment"""
    
    # Find comment and verify ownership
    comment = await db.review_comments.find_one({
        "id": comment_id,
        "user_id": current_user.id
    })
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not owned by user")
    
    # Validate comment text
    comment_text = comment_data.get("comment_text")
    if not comment_text or not comment_text.strip():
        raise HTTPException(status_code=400, detail="Comment text is required")
    
    # Update comment
    await db.review_comments.update_one(
        {"id": comment_id, "user_id": current_user.id},
        {"$set": {
            "comment_text": comment_text.strip(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Comment updated successfully"}

@api_router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete user's own comment"""
    
    # Find comment and verify ownership
    comment = await db.review_comments.find_one({
        "id": comment_id,
        "user_id": current_user.id
    })
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not owned by user")
    
    # Delete comment and all replies
    await db.review_comments.delete_many({
        "$or": [
            {"id": comment_id},
            {"parent_comment_id": comment_id}
        ]
    })
    
    # Update review comment count
    deleted_count = 1 + await db.review_comments.count_documents({"parent_comment_id": comment_id})
    await db.reviews.update_one(
        {"id": comment["review_id"]},
        {"$inc": {"comment_count": -deleted_count}}
    )
    
    return {"message": "Comment and replies deleted successfully"}

@api_router.get("/social/notifications")
async def get_user_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get user's social notifications (likes, comments, follows, etc.)"""
    skip = (page - 1) * limit
    
    # Get activities where user is mentioned or their content is interacted with
    notifications = []
    
    # 1. New followers
    new_followers = await db.user_follows.aggregate([
        {"$match": {"following_id": current_user.id}},
        {"$lookup": {
            "from": "users",
            "localField": "follower_id",
            "foreignField": "id",
            "as": "follower"
        }},
        {"$unwind": "$follower"},
        {"$project": {
            "_id": 0,
            "type": "new_follower",
            "user": {
                "username": "$follower.username",
                "avatar_url": "$follower.avatar_url",
                "is_verified": "$follower.is_verified"
            },
            "created_at": "$created_at",
            "message": {"$concat": ["$follower.username", " started following you"]}
        }},
        {"$sort": {"created_at": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    notifications.extend(new_followers)
    
    # 2. Review likes
    review_likes = await db.reviews.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "review_likes",
            "localField": "id",
            "foreignField": "review_id",
            "as": "likes"
        }},
        {"$unwind": "$likes"},
        {"$lookup": {
            "from": "users",
            "localField": "likes.user_id",
            "foreignField": "id",
            "as": "liker"
        }},
        {"$unwind": "$liker"},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$project": {
            "_id": 0,
            "type": "review_liked",
            "user": {
                "username": "$liker.username",
                "avatar_url": "$liker.avatar_url",
                "is_verified": "$liker.is_verified"
            },
            "content": {
                "title": "$content.title",
                "poster_url": "$content.poster_url"
            },
            "created_at": "$likes.created_at",
            "message": {"$concat": ["$liker.username", " liked your review of ", "$content.title"]}
        }},
        {"$sort": {"created_at": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    notifications.extend(review_likes)
    
    # 3. Review comments
    review_comments = await db.reviews.aggregate([
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "review_comments",
            "localField": "id",
            "foreignField": "review_id",
            "as": "comments"
        }},
        {"$unwind": "$comments"},
        {"$match": {"comments.user_id": {"$ne": current_user.id}}},  # Exclude self-comments
        {"$lookup": {
            "from": "users",
            "localField": "comments.user_id",
            "foreignField": "id",
            "as": "commenter"
        }},
        {"$unwind": "$commenter"},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$project": {
            "_id": 0,
            "type": "review_commented",
            "user": {
                "username": "$commenter.username",
                "avatar_url": "$commenter.avatar_url",
                "is_verified": "$commenter.is_verified"
            },
            "content": {
                "title": "$content.title",
                "poster_url": "$content.poster_url"
            },
            "created_at": "$comments.created_at",
            "message": {"$concat": ["$commenter.username", " commented on your review of ", "$content.title"]}
        }},
        {"$sort": {"created_at": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    notifications.extend(review_comments)
    
    # Sort all notifications by date and paginate
    all_notifications = sorted(notifications, key=lambda x: x["created_at"], reverse=True)
    paginated = all_notifications[skip:skip+limit]
    
    return {
        "notifications": paginated,
        "total": len(all_notifications),
        "page": page,
        "limit": limit
    }

@api_router.get("/social/trending-users")
async def get_trending_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get trending users based on recent activity and followers"""
    skip = (page - 1) * limit
    
    # Get users with most followers and recent activity
    trending = await db.users.aggregate([
        {"$lookup": {
            "from": "user_follows",
            "localField": "id",
            "foreignField": "following_id",
            "as": "followers"
        }},
        {"$lookup": {
            "from": "reviews",
            "localField": "id",
            "foreignField": "user_id",
            "as": "reviews"
        }},
        {"$lookup": {
            "from": "activity_feed",
            "let": {"userId": "$id"},
            "pipeline": [
                {"$match": {
                    "$expr": {"$eq": ["$user_id", "$$userId"]},
                    "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
                }}
            ],
            "as": "recent_activities"
        }},
        {"$project": {
            "_id": 0,
            "username": 1,
            "avatar_url": 1,
            "is_verified": 1,
            "followers_count": {"$size": "$followers"},
            "reviews_count": {"$size": "$reviews"},
            "recent_activities_count": {"$size": "$recent_activities"},
            "trend_score": {
                "$add": [
                    {"$multiply": [{"$size": "$followers"}, 2]},
                    {"$size": "$reviews"},
                    {"$multiply": [{"$size": "$recent_activities"}, 3]}
                ]
            }
        }},
        {"$sort": {"trend_score": -1, "followers_count": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]).to_list(limit)
    
    # Get total count for pagination
    total = await db.users.count_documents({})
    
    return {
        "users": trending,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/social/user-interactions/{username}")
async def get_user_interactions(
    username: str,
    interaction_type: str = Query("all", regex="^(all|likes|comments|follows)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get user's social interactions (their likes, comments, follows)"""
    skip = (page - 1) * limit
    
    # Find user
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    interactions = []
    
    if interaction_type in ["all", "likes"]:
        # Get review likes by user
        likes = await db.review_likes.aggregate([
            {"$match": {"user_id": user["id"]}},
            {"$lookup": {
                "from": "reviews",
                "localField": "review_id",
                "foreignField": "id",
                "as": "review"
            }},
            {"$unwind": "$review"},
            {"$lookup": {
                "from": "content",
                "localField": "review.content_id",
                "foreignField": "id",
                "as": "content"
            }},
            {"$unwind": "$content"},
            {"$project": {
                "_id": 0,
                "type": "like",
                "created_at": "$created_at",
                "content": {
                    "title": "$content.title",
                    "poster_url": "$content.poster_url"
                },
                "review_rating": "$review.rating"
            }},
            {"$sort": {"created_at": -1}},
            {"$limit": 10}
        ]).to_list(10)
        
        interactions.extend(likes)
    
    if interaction_type in ["all", "follows"]:
        # Get user follows
        follows = await db.user_follows.aggregate([
            {"$match": {"follower_id": user["id"]}},
            {"$lookup": {
                "from": "users",
                "localField": "following_id",
                "foreignField": "id",
                "as": "following"
            }},
            {"$unwind": "$following"},
            {"$project": {
                "_id": 0,
                "type": "follow",
                "created_at": "$created_at",
                "followed_user": {
                    "username": "$following.username",
                    "avatar_url": "$following.avatar_url",
                    "is_verified": "$following.is_verified"
                }
            }},
            {"$sort": {"created_at": -1}},
            {"$limit": 10}
        ]).to_list(10)
        
        interactions.extend(follows)
    
    # Sort and paginate
    all_interactions = sorted(interactions, key=lambda x: x["created_at"], reverse=True)
    paginated = all_interactions[skip:skip+limit]
    
    return {
        "interactions": paginated,
        "total": len(all_interactions),
        "page": page,
        "limit": limit
    }

# Week 5: AI-Powered Discovery & Recommendations
class RecommendationEngine(BaseModel):
    user_id: str
    recommended_content: List[dict]
    recommendation_type: str  # collaborative, content_based, trending, similar_users
    confidence_score: float
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Week 6: Business Model - Premium Features
class UserSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_type: str  # free, premium, pro
    status: str  # active, inactive, cancelled
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    payment_method: Optional[str] = None

# Discovery & Recommendations API Endpoints
@api_router.get("/recommendations/for-you")
async def get_personalized_recommendations(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get personalized content recommendations for user"""
    
    # Get user's viewing history, ratings, and preferences
    user_preferences = await analyze_user_preferences(current_user.id)
    
    # Collaborative filtering - find similar users
    similar_users = await find_similar_users(current_user.id, limit=5)
    
    # Content-based filtering - find similar content to what user liked
    content_based_recs = await get_content_based_recommendations(current_user.id, limit=10)
    
    # Trending content filtered by preferences
    trending_recs = await get_trending_recommendations(user_preferences, limit=10)
    
    # Combine and score recommendations
    all_recommendations = []
    
    # Add collaborative filtering results
    for similar_user in similar_users:
        user_content = await get_user_highly_rated_content(similar_user["user_id"], limit=3)
        for content in user_content:
            content["recommendation_type"] = "collaborative"
            content["confidence_score"] = 0.7 * similar_user["similarity_score"]
            all_recommendations.append(content)
    
    # Add content-based results
    for content in content_based_recs:
        content["recommendation_type"] = "content_based"
        all_recommendations.append(content)
    
    # Add trending results
    for content in trending_recs:
        content["recommendation_type"] = "trending"
        all_recommendations.append(content)
    
    # Remove duplicates and sort by confidence score
    seen_content = set()
    unique_recommendations = []
    
    for rec in sorted(all_recommendations, key=lambda x: x.get("confidence_score", 0.5), reverse=True):
        if rec["id"] not in seen_content:
            seen_content.add(rec["id"])
            unique_recommendations.append(rec)
    
    return {
        "recommendations": unique_recommendations[:limit],
        "user_preferences": user_preferences,
        "algorithm_types": ["collaborative", "content_based", "trending"]
    }

@api_router.get("/recommendations/similar/{content_id}")
async def get_similar_content(
    content_id: str,
    limit: int = Query(10, ge=1, le=50)
):
    """Get content similar to a specific item"""
    
    # Check if content exists
    content = await db.content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Find similar content based on genres, country, rating, and type
    similar_content = await db.content.aggregate([
        {"$match": {
            "id": {"$ne": content_id},
            "$or": [
                {"genres": {"$in": content["genres"]}},
                {"country": content["country"]},
                {"content_type": content["content_type"]}
            ]
        }},
        {"$addFields": {
            "similarity_score": {
                "$add": [
                    {"$multiply": [
                        {"$size": {"$setIntersection": ["$genres", content["genres"]]}},
                        0.4
                    ]},
                    {"$cond": [{"$eq": ["$country", content["country"]]}, 0.3, 0]},
                    {"$cond": [{"$eq": ["$content_type", content["content_type"]]}, 0.2, 0]},
                    {"$multiply": [
                        {"$subtract": [1, {"$abs": {"$subtract": ["$rating", content["rating"]]}}]},
                        0.1
                    ]}
                ]
            }
        }},
        {"$sort": {"similarity_score": -1, "rating": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]).to_list(limit)
    
    return {
        "original_content": {
            "id": content["id"],
            "title": content["title"],
            "genres": content["genres"],
            "country": content["country"]
        },
        "similar_content": similar_content
    }

@api_router.get("/discovery/trending")
async def get_trending_discovery(
    time_period: str = Query("week", regex="^(day|week|month)$"),
    limit: int = Query(20, ge=1, le=50)
):
    """Get trending content for discovery"""
    
    # Calculate time range
    if time_period == "day":
        time_delta = timedelta(days=1)
    elif time_period == "week":
        time_delta = timedelta(days=7)
    else:  # month
        time_delta = timedelta(days=30)
    
    time_cutoff = datetime.utcnow() - time_delta
    
    # Get content with most interactions in time period
    trending = await db.content.aggregate([
        {"$lookup": {
            "from": "reviews",
            "localField": "id",
            "foreignField": "content_id",
            "as": "recent_reviews",
            "pipeline": [
                {"$match": {"created_date": {"$gte": time_cutoff}}}
            ]
        }},
        {"$lookup": {
            "from": "watchlist",
            "localField": "id", 
            "foreignField": "content_id",
            "as": "recent_watchlist",
            "pipeline": [
                {"$match": {"updated_date": {"$gte": time_cutoff}}}
            ]
        }},
        {"$addFields": {
            "trending_score": {
                "$add": [
                    {"$multiply": [{"$size": "$recent_reviews"}, 3]},
                    {"$multiply": [{"$size": "$recent_watchlist"}, 2]},
                    {"$multiply": ["$rating", 0.5]}
                ]
            }
        }},
        {"$match": {"trending_score": {"$gt": 0}}},
        {"$sort": {"trending_score": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "recent_reviews": 0, "recent_watchlist": 0}}
    ]).to_list(limit)
    
    return {
        "trending_content": trending,
        "time_period": time_period,
        "generated_at": datetime.utcnow()
    }

# Business Model - Premium Features API
@api_router.get("/premium/features")
async def get_premium_features():
    """Get available premium features and plans"""
    
    features = {
        "free_plan": {
            "name": "Free",
            "price": 0,
            "features": [
                "Basic content browsing",
                "Create watchlists",
                "Write reviews and ratings",
                "Follow other users",
                "Basic recommendations"
            ],
            "limits": {
                "watchlists": 3,
                "reviews_per_month": 10,
                "following": 50
            }
        },
        "premium_plan": {
            "name": "Premium",
            "price": 9.99,
            "price_yearly": 99.99,
            "features": [
                "All free features",
                "Unlimited watchlists",
                "Advanced recommendations",
                "Priority support",
                "Export watchlists",
                "Advanced statistics",
                "No ads"
            ],
            "limits": {
                "watchlists": "unlimited",
                "reviews_per_month": "unlimited", 
                "following": 500
            }
        },
        "pro_plan": {
            "name": "Pro",
            "price": 19.99,
            "price_yearly": 199.99,
            "features": [
                "All premium features",
                "API access",
                "Bulk import tools",
                "Custom lists",
                "Analytics dashboard",
                "White-label options",
                "Priority recommendations"
            ],
            "limits": {
                "watchlists": "unlimited",
                "reviews_per_month": "unlimited",
                "following": "unlimited"
            }
        }
    }
    
    return features

@api_router.get("/premium/check")
async def check_premium_status(current_user: User = Depends(get_current_user)):
    """Check user's premium status"""
    
    subscription = await db.user_subscriptions.find_one({
        "user_id": current_user.id,
        "status": "active"
    })
    
    if subscription:
        is_premium = subscription["plan_type"] in ["premium", "pro"]
        is_expired = subscription.get("expires_at") and subscription["expires_at"] < datetime.utcnow()
        
        return {
            "is_premium": is_premium and not is_expired,
            "plan_type": subscription["plan_type"],
            "expires_at": subscription.get("expires_at"),
            "status": subscription["status"]
        }
    else:
        return {
            "is_premium": False,
            "plan_type": "free",
            "expires_at": None,
            "status": "free"
        }

# Helper functions for recommendations
async def analyze_user_preferences(user_id: str) -> dict:
    """Analyze user preferences from their activity"""
    
    # Get user's favorite genres from ratings and watchlist
    genre_prefs = await db.reviews.aggregate([
        {"$match": {"user_id": user_id, "rating": {"$gte": 7}}},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$unwind": "$content.genres"},
        {"$group": {"_id": "$content.genres", "count": {"$sum": 1}, "avg_rating": {"$avg": "$rating"}}},
        {"$sort": {"count": -1, "avg_rating": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    # Get favorite countries
    country_prefs = await db.reviews.aggregate([
        {"$match": {"user_id": user_id, "rating": {"$gte": 7}}},
        {"$lookup": {
            "from": "content",
            "localField": "content_id", 
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$group": {"_id": "$content.country", "count": {"$sum": 1}, "avg_rating": {"$avg": "$rating"}}},
        {"$sort": {"count": -1}},
        {"$limit": 3}
    ]).to_list(3)
    
    return {
        "favorite_genres": [{"genre": g["_id"], "score": g["count"] * g["avg_rating"]} for g in genre_prefs],
        "favorite_countries": [{"country": c["_id"], "score": c["count"]} for c in country_prefs],
        "min_rating_threshold": 6.0
    }

async def find_similar_users(user_id: str, limit: int = 5) -> List[dict]:
    """Find users with similar preferences"""
    
    # Get current user's ratings
    user_ratings = await db.reviews.find({"user_id": user_id}).to_list(None)
    user_content_ratings = {r["content_id"]: r["rating"] for r in user_ratings}
    
    if not user_content_ratings:
        return []
    
    # Find other users who rated the same content
    similar_users = []
    content_ids = list(user_content_ratings.keys())
    
    # Get other users' ratings for same content
    other_ratings = await db.reviews.aggregate([
        {"$match": {
            "content_id": {"$in": content_ids},
            "user_id": {"$ne": user_id}
        }},
        {"$group": {
            "_id": "$user_id",
            "ratings": {"$push": {"content_id": "$content_id", "rating": "$rating"}},
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gte": 3}}},  # At least 3 common ratings
        {"$sort": {"count": -1}},
        {"$limit": limit * 2}
    ]).to_list(limit * 2)
    
    # Calculate similarity scores (simple correlation)
    for other_user in other_ratings:
        other_ratings_dict = {r["content_id"]: r["rating"] for r in other_user["ratings"]}
        
        # Calculate Pearson correlation coefficient
        common_content = set(user_content_ratings.keys()) & set(other_ratings_dict.keys())
        
        if len(common_content) >= 3:
            similarity = calculate_similarity_score(
                [user_content_ratings[c] for c in common_content],
                [other_ratings_dict[c] for c in common_content]
            )
            
            similar_users.append({
                "user_id": other_user["_id"],
                "similarity_score": similarity,
                "common_ratings": len(common_content)
            })
    
    return sorted(similar_users, key=lambda x: x["similarity_score"], reverse=True)[:limit]

def calculate_similarity_score(ratings1: List[float], ratings2: List[float]) -> float:
    """Calculate similarity score between two rating lists"""
    if not ratings1 or not ratings2 or len(ratings1) != len(ratings2):
        return 0.0
    
    # Simple correlation coefficient
    n = len(ratings1)
    sum1 = sum(ratings1)
    sum2 = sum(ratings2)
    sum1_sq = sum(r * r for r in ratings1)
    sum2_sq = sum(r * r for r in ratings2)
    sum_products = sum(ratings1[i] * ratings2[i] for i in range(n))
    
    numerator = sum_products - (sum1 * sum2 / n)
    denominator = ((sum1_sq - sum1 * sum1 / n) * (sum2_sq - sum2 * sum2 / n)) ** 0.5
    
    if denominator == 0:
        return 0.0
    
    correlation = numerator / denominator
    return max(0, correlation)  # Only positive correlations

async def get_content_based_recommendations(user_id: str, limit: int = 10) -> List[dict]:
    """Get content recommendations based on user's preferences"""
    
    preferences = await analyze_user_preferences(user_id)
    
    if not preferences["favorite_genres"]:
        return []
    
    # Get user's already rated content to exclude
    rated_content = await db.reviews.find({"user_id": user_id}, {"content_id": 1}).to_list(None)
    rated_content_ids = [r["content_id"] for r in rated_content]
    
    # Find content matching preferences
    favorite_genres = [g["genre"] for g in preferences["favorite_genres"][:3]]
    favorite_countries = [c["country"] for c in preferences["favorite_countries"][:2]]
    
    recommendations = await db.content.find({
        "id": {"$nin": rated_content_ids},
        "$or": [
            {"genres": {"$in": favorite_genres}},
            {"country": {"$in": favorite_countries}}
        ],
        "rating": {"$gte": preferences["min_rating_threshold"]}
    }).sort("rating", -1).limit(limit).to_list(limit)
    
    # Add confidence scores
    for rec in recommendations:
        genre_match = len(set(rec["genres"]) & set(favorite_genres))
        country_match = 1 if rec["country"] in favorite_countries else 0
        
        rec["confidence_score"] = min(1.0, (genre_match * 0.3 + country_match * 0.4 + rec["rating"] * 0.1))
        if "_id" in rec:
            del rec["_id"]
    
    return recommendations

async def get_trending_recommendations(user_preferences: dict, limit: int = 10) -> List[dict]:
    """Get trending content filtered by user preferences"""
    
    favorite_genres = [g["genre"] for g in user_preferences["favorite_genres"][:2]]
    
    trending = await db.content.aggregate([
        {"$match": {
            "genres": {"$in": favorite_genres} if favorite_genres else {},
            "rating": {"$gte": user_preferences.get("min_rating_threshold", 6.0)}
        }},
        {"$lookup": {
            "from": "reviews",
            "localField": "id",
            "foreignField": "content_id", 
            "as": "recent_reviews",
            "pipeline": [
                {"$match": {"created_date": {"$gte": datetime.utcnow() - timedelta(days=7)}}}
            ]
        }},
        {"$addFields": {
            "trending_score": {"$size": "$recent_reviews"},
            "confidence_score": 0.6
        }},
        {"$match": {"trending_score": {"$gt": 0}}},
        {"$sort": {"trending_score": -1, "rating": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "recent_reviews": 0}}
    ]).to_list(limit)
    
    return trending

async def get_user_highly_rated_content(user_id: str, limit: int = 5) -> List[dict]:
    """Get highly rated content by a specific user"""
    
    highly_rated = await db.reviews.aggregate([
        {"$match": {"user_id": user_id, "rating": {"$gte": 8}}},
        {"$lookup": {
            "from": "content",
            "localField": "content_id",
            "foreignField": "id",
            "as": "content"
        }},
        {"$unwind": "$content"},
        {"$sort": {"rating": -1}},
        {"$limit": limit},
        {"$replaceRoot": {"newRoot": "$content"}},
        {"$project": {"_id": 0}},
        {"$addFields": {"confidence_score": 0.8}}
    ]).to_list(limit)
    
    return highly_rated

# Ad Management for Free Users
@api_router.get("/ads/config")
async def get_ad_configuration():
    """Get ad configuration for free users"""
    return {
        "google_adsense": {
            "client_id": "ca-pub-YOUR-ADSENSE-ID",  # Replace with actual AdSense ID
            "enabled": True,
            "ad_slots": {
                "banner_top": "1234567890",
                "banner_sidebar": "0987654321", 
                "banner_bottom": "1122334455",
                "native_feed": "5566778899"
            }
        },
        "ad_placements": [
            {"type": "banner", "position": "top", "size": "728x90"},
            {"type": "banner", "position": "sidebar", "size": "300x250"},
            {"type": "native", "position": "feed", "frequency": 5},
            {"type": "banner", "position": "bottom", "size": "728x90"}
        ]
    }

@api_router.get("/ads/should-show")
async def should_show_ads(current_user: User = Depends(get_current_user)):
    """Check if ads should be shown to user"""
    
    # Check premium status
    subscription = await db.user_subscriptions.find_one({
        "user_id": current_user.id,
        "status": "active"
    })
    
    if subscription:
        is_premium = subscription["plan_type"] in ["premium", "pro"]
        is_expired = subscription.get("expires_at") and subscription["expires_at"] < datetime.utcnow()
        show_ads = not (is_premium and not is_expired)
    else:
        show_ads = True  # Free users see ads
    
    return {
        "show_ads": show_ads,
        "reason": "free_user" if show_ads else "premium_user"
    }

# Admin Authentication Routes
@api_router.post("/admin/login", response_model=Token)
async def admin_login(admin_data: AdminLogin):
    """Admin login endpoint"""
    admin = await db.admins.find_one({"username": admin_data.username})
    
    if not admin or not verify_password(admin_data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": admin_data.username, "type": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(current_admin: AdminUser = Depends(get_current_admin)):
    """Get admin dashboard statistics"""
    
    # Get total counts
    total_content = await db.content.count_documents({})
    total_movies = await db.content.count_documents({"content_type": "movie"})
    total_series = await db.content.count_documents({"content_type": "series"})
    total_dramas = await db.content.count_documents({"content_type": "drama"})
    total_anime = await db.content.count_documents({"content_type": "anime"})
    
    # Get unique countries count
    countries = await db.content.distinct("country")
    countries_count = len(countries)
    
    # Get recent additions (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_additions = await db.content.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    return AdminStats(
        total_content=total_content,
        total_movies=total_movies,
        total_series=total_series,
        total_dramas=total_dramas,
        total_anime=total_anime,
        countries=countries_count,
        recent_additions=recent_additions
    )

@api_router.get("/admin/me")
async def get_current_admin_info(current_admin: AdminUser = Depends(get_current_admin)):
    """Get current admin user info"""
    return {"username": current_admin.username, "is_admin": current_admin.is_admin}

@api_router.get("/content", response_model=ContentResponse)
async def get_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    country: Optional[str] = None,
    content_type: Optional[ContentType] = None,
    genre: Optional[ContentGenre] = None,
    year: Optional[int] = None
):
    """Get paginated content with optional filters"""
    skip = (page - 1) * limit
    
    # Build filter query
    filter_query = {}
    
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"original_title": {"$regex": search, "$options": "i"}},
            {"synopsis": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    if country:
        filter_query["country"] = {"$regex": country, "$options": "i"}
    
    if content_type:
        filter_query["content_type"] = content_type
    
    if genre:
        filter_query["genres"] = genre
    
    if year:
        filter_query["year"] = year
    
    # Get total count
    total = await db.content.count_documents(filter_query)
    
    # Get paginated results
    cursor = db.content.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    contents = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string and create Content objects
    content_list = []
    for content in contents:
        if '_id' in content:
            del content['_id']
        content_list.append(Content(**content))
    
    return ContentResponse(
        contents=content_list,
        total=total,
        page=page,
        limit=limit
    )

@api_router.get("/content/search")
async def advanced_content_search(
    query: Optional[str] = None,
    country: Optional[str] = None,
    content_type: Optional[ContentType] = None,
    genre: Optional[ContentGenre] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    sort_by: Optional[str] = "created_at",  # created_at, rating, year, title
    sort_order: Optional[str] = "desc",  # asc, desc
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Advanced content search with multiple filters and sorting"""
    skip = (page - 1) * limit
    
    # Build filter query
    filter_query = {}
    
    if query:
        filter_query["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"original_title": {"$regex": query, "$options": "i"}},
            {"synopsis": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}},
            {"cast.name": {"$regex": query, "$options": "i"}},
            {"crew.name": {"$regex": query, "$options": "i"}}
        ]
    
    if country:
        filter_query["country"] = {"$regex": country, "$options": "i"}
    
    if content_type:
        filter_query["content_type"] = content_type
    
    if genre:
        filter_query["genres"] = genre
    
    # Year range filter
    if year_from or year_to:
        year_filter = {}
        if year_from:
            year_filter["$gte"] = year_from
        if year_to:
            year_filter["$lte"] = year_to
        filter_query["year"] = year_filter
    
    # Rating range filter
    if rating_min or rating_max:
        rating_filter = {}
        if rating_min:
            rating_filter["$gte"] = rating_min
        if rating_max:
            rating_filter["$lte"] = rating_max
        filter_query["rating"] = rating_filter
    
    # Build sort criteria
    sort_direction = 1 if sort_order == "asc" else -1
    sort_criteria = [(sort_by, sort_direction)]
    
    # Get total count
    total = await db.content.count_documents(filter_query)
    
    # Get paginated results
    cursor = db.content.find(filter_query).sort(sort_criteria).skip(skip).limit(limit)
    contents = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string and create Content objects
    content_list = []
    for content in contents:
        if '_id' in content:
            del content['_id']
        content_list.append(Content(**content))
    
    return ContentResponse(
        contents=content_list,
        total=total,
        page=page,
        limit=limit
    )

@api_router.get("/content/featured")
async def get_featured_content(
    category: Optional[str] = "trending",  # trending, new_releases, top_rated, by_country
    country: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Get featured content for homepage sections"""
    
    if category == "trending":
        # Trending: highest rated content from last 3 months
        three_months_ago = datetime.utcnow() - timedelta(days=90)
        cursor = db.content.find({
            "created_at": {"$gte": three_months_ago}
        }).sort([("rating", -1), ("created_at", -1)]).limit(limit)
        
    elif category == "new_releases":
        # New releases: recently added content
        cursor = db.content.find().sort("created_at", -1).limit(limit)
        
    elif category == "top_rated":
        # Top rated: highest rated content overall
        cursor = db.content.find().sort("rating", -1).limit(limit)
        
    elif category == "by_country" and country:
        # Country specific content
        cursor = db.content.find({
            "country": {"$regex": country, "$options": "i"}
        }).sort([("rating", -1), ("created_at", -1)]).limit(limit)
        
    else:
        # Default to trending
        cursor = db.content.find().sort([("rating", -1), ("created_at", -1)]).limit(limit)
    
    contents = await cursor.to_list(length=limit)
    
    content_list = []
    for content in contents:
        if '_id' in content:
            del content['_id']
        content_list.append(Content(**content))
    
    return content_list

@api_router.get("/content/{content_id}", response_model=Content)
async def get_content_by_id(content_id: str):
    """Get content by ID"""
    content = await db.content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    if '_id' in content:
        del content['_id']
    
    return Content(**content)

@api_router.post("/content", response_model=Content)
async def create_content(content_data: ContentCreate):
    """Create new content"""
    content = Content(**content_data.dict())
    
    # Insert into database
    await db.content.insert_one(content.dict())
    
    return content

# Admin Content Management Routes
@api_router.post("/admin/content", response_model=Content)
async def admin_create_content(
    content_data: ContentCreate, 
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Create new content"""
    content = Content(**content_data.dict())
    
    # Insert into database
    await db.content.insert_one(content.dict())
    
    return content

@api_router.put("/admin/content/{content_id}", response_model=Content)
async def admin_update_content(
    content_id: str,
    content_data: ContentUpdate,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Update existing content"""
    
    # Find existing content
    existing_content = await db.content.find_one({"id": content_id})
    if not existing_content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in content_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update in database
    await db.content.update_one({"id": content_id}, {"$set": update_data})
    
    # Return updated content
    updated_content = await db.content.find_one({"id": content_id})
    if '_id' in updated_content:
        del updated_content['_id']
    
    return Content(**updated_content)

@api_router.delete("/admin/content/{content_id}")
async def admin_delete_content(
    content_id: str,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Delete content"""
    
    # Check if content exists
    existing_content = await db.content.find_one({"id": content_id})
    if not existing_content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Delete content
    await db.content.delete_one({"id": content_id})
    
    return {"message": "Content deleted successfully"}

@api_router.get("/admin/content", response_model=ContentResponse)
async def admin_get_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    country: Optional[str] = None,
    content_type: Optional[ContentType] = None,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Get content with admin privileges"""
    skip = (page - 1) * limit
    
    # Build filter query
    filter_query = {}
    
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"original_title": {"$regex": search, "$options": "i"}},
            {"synopsis": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    if country:
        filter_query["country"] = {"$regex": country, "$options": "i"}
    
    if content_type:
        filter_query["content_type"] = content_type
    
    # Get total count
    total = await db.content.count_documents(filter_query)
    
    # Get paginated results
    cursor = db.content.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    contents = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string and create Content objects
    content_list = []
    for content in contents:
        if '_id' in content:
            del content['_id']
        content_list.append(Content(**content))
    
    return ContentResponse(
        contents=content_list,
        total=total,
        page=page,
        limit=limit
    )

# Admin Review Management
@api_router.get("/admin/reviews", response_model=ReviewsListResponse)
async def admin_get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Get all reviews with optional search"""
    skip = (page - 1) * limit
    filter_query = {}
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"review_text": {"$regex": search, "$options": "i"}},
        ]

    total = await db.reviews.count_documents(filter_query)
    cursor = db.reviews.find(filter_query).sort("created_date", -1).skip(skip).limit(limit)
    reviews = await cursor.to_list(length=limit)

    enriched_reviews = []
    for review in reviews:
        if '_id' in review:
            del review['_id']

        user = await db.users.find_one({"id": review["user_id"]})
        user_info = {"username": user["username"]} if user else {}

        content = await db.content.find_one({"id": review["content_id"]})
        content_info = {"title": content["title"]} if content else {}

        enriched_reviews.append({**review, "user": user_info, "content": content_info})

    return ReviewsListResponse(
        reviews=enriched_reviews,
        total=total,
        page=page,
        limit=limit
    )

@api_router.put("/admin/reviews/{review_id}", response_model=dict)
async def admin_update_review(
    review_id: str,
    review_data: AdminReviewUpdate,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Update a review"""
    existing_review = await db.reviews.find_one({"id": review_id})
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found")

    update_data = {k: v for k, v in review_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    await db.reviews.update_one({"id": review_id}, {"$set": update_data})

    return {"message": "Review updated successfully"}

@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(
    review_id: str,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Delete a review"""
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    # Note: In a real app, you might want to recalculate content average rating here.
    # For simplicity, we omit that for now.

    return {"message": "Review deleted successfully"}

@api_router.post("/admin/bulk-import", response_model=BulkImportResult)
async def admin_bulk_import(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Admin: Bulk import content from Excel/CSV file"""
    
    # Validate file type
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Please upload .xlsx, .xls, or .csv files only."
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Parse file
        df = parse_excel_csv_file(file_content, file.filename)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty or has no valid data")
        
        # Process each row
        successful_imports = 0
        failed_imports = 0
        errors = []
        imported_content = []
        
        for index, row in df.iterrows():
            try:
                content_data = validate_and_convert_row(row)
                
                if content_data is None:
                    failed_imports += 1
                    errors.append(f"Row {index + 1}: Missing required fields or invalid data")
                    continue
                
                # Check if content already exists (by title and year)
                existing = await db.content.find_one({
                    "title": content_data["title"],
                    "year": content_data["year"]
                })
                
                if existing:
                    failed_imports += 1
                    errors.append(f"Row {index + 1}: Content '{content_data['title']}' ({content_data['year']}) already exists")
                    continue
                
                # Insert into database
                await db.content.insert_one(content_data)
                successful_imports += 1
                imported_content.append(f"{content_data['title']} ({content_data['year']})")
                
            except Exception as e:
                failed_imports += 1
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return BulkImportResult(
            success=successful_imports > 0,
            total_rows=len(df),
            successful_imports=successful_imports,
            failed_imports=failed_imports,
            errors=errors[:20],  # Limit errors to first 20
            imported_content=imported_content[:20]  # Limit list to first 20
        )
        
    except Exception as e:
        logger.error(f"Bulk import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.get("/admin/bulk-import/template")
async def download_template(current_admin: AdminUser = Depends(get_current_admin)):
    """Admin: Download bulk import template"""
    
    template_data = {
        'title': ['Squid Game', 'Parasite'],
        'original_title': ['오징어 게임', '기생충'],
        'year': [2021, 2019],
        'country': ['South Korea', 'South Korea'],
        'content_type': ['series', 'movie'],
        'synopsis': [
            'A desperate group of people compete in children\'s games for a massive cash prize.',
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
        'poster_url': ['', ''],  # Optional - will use default if empty
        'banner_url': ['', '']   # Optional
    }
    
    df = pd.DataFrame(template_data)
    
    # Create Excel file in memory
    excel_buffer = io.BytesIO()
    df.to_excel(excel_buffer, index=False, sheet_name='Content Template')
    excel_buffer.seek(0)
    
    return {
        "message": "Template structure",
        "columns": list(template_data.keys()),
        "required_columns": ["title", "year", "country", "content_type", "synopsis", "rating"],
        "optional_columns": ["original_title", "episodes", "duration", "cast", "crew", "streaming_platforms", "tags", "poster_url", "banner_url"],
        "sample_data": template_data
    }

@api_router.get("/countries")
async def get_countries():
    """Get list of available countries"""
    countries = await db.content.distinct("country")
    return {"countries": sorted(countries)}

@api_router.get("/genres")
async def get_genres():
    """Get list of available genres"""
    return {"genres": [genre.value for genre in ContentGenre]}

@api_router.get("/content-types")
async def get_content_types():
    """Get list of available content types"""
    return {"content_types": [content_type.value for content_type in ContentType]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize database with sample data and admin user"""
    
    # Create default admin if not exists
    admin_exists = await db.admins.find_one({"username": "admin"})
    if not admin_exists:
        default_admin = AdminUser(
            username="admin",
            password_hash=hash_password("admin123"),
            is_admin=True
        )
        await db.admins.insert_one(default_admin.dict())
        logger.info("Created default admin user (username: admin, password: admin123)")
    
    # Check if content collection is empty
    count = await db.content.count_documents({})
    if count == 0:
        logger.info("Initializing database with sample content...")
        await populate_sample_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

async def populate_sample_data():
    """Populate database with sample global content"""
    sample_content = [
        {
            "id": str(uuid.uuid4()),
            "title": "Squid Game",
            "original_title": "오징어 게임",
            "poster_url": "https://images.unsplash.com/photo-1633882595230-0969f5af2780?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "banner_url": "https://images.unsplash.com/photo-1710988486897-e933e4b0f72c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwzfHxnbG9iYWwlMjBjaW5lbWF8ZW58MHx8fHwxNzUzNTI3MjU2fDA&ixlib=rb-4.1.0&q=85",
            "synopsis": "A desperate group of people compete in children's games for a massive cash prize, but the stakes are deadly.",
            "year": 2021,
            "country": "South Korea",
            "content_type": "series",
            "genres": ["thriller", "drama", "mystery"],
            "rating": 8.7,
            "episodes": 9,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Lee Jung-jae", "character": "Seong Gi-hun", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Park Hae-soo", "character": "Cho Sang-woo", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Hwang Dong-hyuk", "role": "director", "profile_image": None}
            ],
            "streaming_platforms": ["Netflix"],
            "tags": ["survival", "korean", "psychological"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Parasite",
            "original_title": "기생충",
            "poster_url": "https://images.unsplash.com/photo-1517486518908-97a5f91b325f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwzfHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "banner_url": "https://images.unsplash.com/photo-1627133805103-ce2d34ccdd37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHw0fHxnbG9iYWwlMjBjaW5lbWF8ZW58MHx8fHwxNzUzNTI3MjU2fDA&ixlib=rb-4.1.0&q=85",
            "synopsis": "A poor family schemes to become employed by a wealthy family and infiltrate their household by posing as unrelated, highly qualified individuals.",
            "year": 2019,
            "country": "South Korea",
            "content_type": "movie",
            "genres": ["thriller", "drama", "comedy"],
            "rating": 8.5,
            "duration": 132,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Song Kang-ho", "character": "Ki-taek", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Lee Sun-kyun", "character": "Park Dong-ik", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Bong Joon-ho", "role": "director", "profile_image": None}
            ],
            "streaming_platforms": ["Hulu", "Amazon Prime"],
            "tags": ["oscar winner", "social commentary", "dark comedy"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Your Name",
            "original_title": "君の名は。",
            "poster_url": "https://images.unsplash.com/photo-1539481915544-f5cd50562d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHw0fHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "synopsis": "Two teenagers share a profound, magical connection upon discovering they are swapping bodies. Things manage to become even more complicated when the boy and girl decide to meet in person.",
            "year": 2016,
            "country": "Japan",
            "content_type": "anime",
            "genres": ["romance", "fantasy", "drama"],
            "rating": 8.4,
            "duration": 106,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Ryunosuke Kamiki", "character": "Taki Tachibana (voice)", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Mone Kamishiraishi", "character": "Mitsuha Miyamizu (voice)", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Makoto Shinkai", "role": "director", "profile_image": None}
            ],
            "streaming_platforms": ["Crunchyroll", "Funimation"],
            "tags": ["anime", "body swap", "supernatural"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "3 Idiots",
            "original_title": "3 Idiots",
            "poster_url": "https://images.unsplash.com/photo-1633882595230-0969f5af2780?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "synopsis": "Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.",
            "year": 2009,
            "country": "India",
            "content_type": "movie",
            "genres": ["comedy", "drama"],
            "rating": 8.4,
            "duration": 170,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Aamir Khan", "character": "Rancho", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "R. Madhavan", "character": "Farhan", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Sharman Joshi", "character": "Raju", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Rajkumar Hirani", "role": "director", "profile_image": None}
            ],
            "streaming_platforms": ["Netflix", "Amazon Prime"],
            "tags": ["bollywood", "friendship", "education"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Handmaiden",
            "original_title": "아가씨",
            "poster_url": "https://images.unsplash.com/photo-1517486518908-97a5f91b325f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwzfHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "synopsis": "A woman is hired as a handmaiden to a Japanese heiress, but secretly she is involved in a plot to defraud her.",
            "year": 2016,
            "country": "South Korea",
            "content_type": "movie",
            "genres": ["thriller", "drama", "mystery"],
            "rating": 8.1,
            "duration": 145,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Kim Min-hee", "character": "Lady Hideko", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Kim Tae-ri", "character": "Sook-hee", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Park Chan-wook", "role": "director", "profile_image": None}
            ],
            "streaming_platforms": ["Amazon Prime", "Mubi"],
            "tags": ["psychological", "period drama", "lgbtq"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Money Heist",
            "original_title": "La Casa de Papel",
            "poster_url": "https://images.unsplash.com/photo-1539481915544-f5cd50562d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHw0fHxpbnRlcm5hdGlvbmFsJTIwbW92aWVzfGVufDB8fHx8MTc1MzUyNzI2OHww&ixlib=rb-4.1.0&q=85",
            "synopsis": "A criminal mastermind who goes by 'The Professor' has a plan to pull off the biggest heist in recorded history -- to print billions of euros in the Royal Mint of Spain.",
            "year": 2017,
            "country": "Spain",
            "content_type": "series",
            "genres": ["crime", "thriller", "drama"],
            "rating": 8.2,
            "episodes": 41,
            "cast": [
                {"id": str(uuid.uuid4()), "name": "Álvaro Morte", "character": "The Professor", "profile_image": None},
                {"id": str(uuid.uuid4()), "name": "Úrsula Corberó", "character": "Tokyo", "profile_image": None}
            ],
            "crew": [
                {"id": str(uuid.uuid4()), "name": "Álex Pina", "role": "creator", "profile_image": None}
            ],
            "streaming_platforms": ["Netflix"],
            "tags": ["heist", "spanish", "resistance"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert sample data
    await db.content.insert_many(sample_content)
    logger.info(f"Inserted {len(sample_content)} sample content items")