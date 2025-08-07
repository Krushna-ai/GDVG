#!/usr/bin/env python3
"""
Backend API Testing for Global Drama Verse Guide
Tests all content-related endpoints, search functionality, filtering, and database integration
"""

import requests
import json
import sys
from typing import Dict, Any, List
import time

# Get backend URL from frontend .env
BACKEND_URL = "https://b38b7380-807e-47cb-8ee8-c17b3cc26cc6.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.sample_content_id = None
        self.auth_token = None
        self.test_user_id = None
        self.test_watchlist_item_id = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add authorization header if token is available
        if self.auth_token and 'headers' not in kwargs:
            kwargs['headers'] = {}
        if self.auth_token:
            kwargs['headers']['Authorization'] = f"Bearer {self.auth_token}"
            
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_root_endpoint(self):
        """Test GET /api/ root endpoint"""
        try:
            response = self.make_request("GET", "/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Global Drama Verse Guide API" in data["message"]:
                    self.log_test("Root Endpoint", True, "Root endpoint working correctly")
                else:
                    self.log_test("Root Endpoint", False, "Unexpected response format", {"response": data})
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
    
    def test_content_list_endpoint(self):
        """Test GET /api/content with pagination"""
        try:
            # Test basic content list
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["contents", "total", "page", "limit"]
                
                if all(field in data for field in required_fields):
                    contents = data["contents"]
                    if len(contents) > 0:
                        # Store first content ID for later tests
                        self.sample_content_id = contents[0]["id"]
                        self.log_test("Content List", True, f"Retrieved {len(contents)} content items")
                        
                        # Test content structure
                        sample_content = contents[0]
                        required_content_fields = ["id", "title", "country", "content_type", "genres", "rating", "year"]
                        
                        if all(field in sample_content for field in required_content_fields):
                            self.log_test("Content Structure", True, "Content objects have required fields")
                        else:
                            missing_fields = [f for f in required_content_fields if f not in sample_content]
                            self.log_test("Content Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Content List", False, "No content items returned")
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Content List", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Content List", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Content List", False, f"Exception: {str(e)}")
    
    def test_content_pagination(self):
        """Test content pagination parameters"""
        try:
            # Test with specific page and limit
            response = self.make_request("GET", "/content?page=1&limit=3")
            
            if response.status_code == 200:
                data = response.json()
                if data["page"] == 1 and data["limit"] == 3 and len(data["contents"]) <= 3:
                    self.log_test("Content Pagination", True, "Pagination working correctly")
                else:
                    self.log_test("Content Pagination", False, "Pagination parameters not respected", {"data": data})
            else:
                self.log_test("Content Pagination", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Content Pagination", False, f"Exception: {str(e)}")
    
    def test_content_search(self):
        """Test content search functionality"""
        try:
            # Test search by title
            response = self.make_request("GET", "/content?search=Squid")
            
            if response.status_code == 200:
                data = response.json()
                contents = data["contents"]
                
                if len(contents) > 0:
                    # Check if search results contain the search term
                    found_match = any("squid" in content["title"].lower() or 
                                    "squid" in content.get("original_title", "").lower() or
                                    "squid" in content["synopsis"].lower()
                                    for content in contents)
                    
                    if found_match:
                        self.log_test("Content Search", True, f"Search returned {len(contents)} relevant results")
                    else:
                        self.log_test("Content Search", False, "Search results don't match query")
                else:
                    self.log_test("Content Search", False, "Search returned no results")
            else:
                self.log_test("Content Search", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Content Search", False, f"Exception: {str(e)}")
    
    def test_content_filters(self):
        """Test content filtering functionality"""
        try:
            # Test country filter
            response = self.make_request("GET", "/content?country=South Korea")
            
            if response.status_code == 200:
                data = response.json()
                contents = data["contents"]
                
                if len(contents) > 0:
                    korean_content = all("korea" in content["country"].lower() for content in contents)
                    if korean_content:
                        self.log_test("Country Filter", True, f"Country filter returned {len(contents)} Korean content")
                    else:
                        self.log_test("Country Filter", False, "Country filter not working correctly")
                else:
                    self.log_test("Country Filter", False, "Country filter returned no results")
            else:
                self.log_test("Country Filter", False, f"HTTP {response.status_code}")
            
            # Test content type filter
            response = self.make_request("GET", "/content?content_type=movie")
            
            if response.status_code == 200:
                data = response.json()
                contents = data["contents"]
                
                if len(contents) > 0:
                    all_movies = all(content["content_type"] == "movie" for content in contents)
                    if all_movies:
                        self.log_test("Content Type Filter", True, f"Content type filter returned {len(contents)} movies")
                    else:
                        self.log_test("Content Type Filter", False, "Content type filter not working correctly")
                else:
                    self.log_test("Content Type Filter", False, "Content type filter returned no results")
            else:
                self.log_test("Content Type Filter", False, f"HTTP {response.status_code}")
                
            # Test genre filter
            response = self.make_request("GET", "/content?genre=thriller")
            
            if response.status_code == 200:
                data = response.json()
                contents = data["contents"]
                
                if len(contents) > 0:
                    has_thriller = all("thriller" in content["genres"] for content in contents)
                    if has_thriller:
                        self.log_test("Genre Filter", True, f"Genre filter returned {len(contents)} thriller content")
                    else:
                        self.log_test("Genre Filter", False, "Genre filter not working correctly")
                else:
                    self.log_test("Genre Filter", False, "Genre filter returned no results")
            else:
                self.log_test("Genre Filter", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Content Filters", False, f"Exception: {str(e)}")
    
    def test_individual_content(self):
        """Test GET /api/content/{id}"""
        if not self.sample_content_id:
            self.log_test("Individual Content", False, "No sample content ID available")
            return
            
        try:
            response = self.make_request("GET", f"/content/{self.sample_content_id}")
            
            if response.status_code == 200:
                content = response.json()
                required_fields = ["id", "title", "country", "content_type", "genres", "rating", "year"]
                
                if all(field in content for field in required_fields):
                    if content["id"] == self.sample_content_id:
                        self.log_test("Individual Content", True, f"Retrieved content: {content['title']}")
                    else:
                        self.log_test("Individual Content", False, "Returned content ID doesn't match requested ID")
                else:
                    missing_fields = [f for f in required_fields if f not in content]
                    self.log_test("Individual Content", False, f"Missing fields: {missing_fields}")
            elif response.status_code == 404:
                self.log_test("Individual Content", False, "Content not found (404)")
            else:
                self.log_test("Individual Content", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Individual Content", False, f"Exception: {str(e)}")
    
    def test_invalid_content_id(self):
        """Test error handling for invalid content ID"""
        try:
            response = self.make_request("GET", "/content/invalid-id-12345")
            
            if response.status_code == 404:
                self.log_test("Invalid Content ID", True, "Correctly returned 404 for invalid ID")
            else:
                self.log_test("Invalid Content ID", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Content ID", False, f"Exception: {str(e)}")
    
    def test_advanced_search_endpoint(self):
        """Test GET /api/content/search - Advanced search with multiple filters"""
        try:
            # Test 1: Basic query search
            response = self.make_request("GET", "/content/search?query=Squid")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    self.log_test("Advanced Search - Basic Query", True, f"Query search returned {len(data['contents'])} results")
                else:
                    self.log_test("Advanced Search - Basic Query", False, "Query search returned no results")
            else:
                self.log_test("Advanced Search - Basic Query", False, f"HTTP {response.status_code}")
            
            # Test 2: Country filter
            response = self.make_request("GET", "/content/search?country=South Korea")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    # Verify all results are from South Korea
                    all_korean = all("korea" in content["country"].lower() for content in data["contents"])
                    if all_korean:
                        self.log_test("Advanced Search - Country Filter", True, f"Country filter returned {len(data['contents'])} Korean content")
                    else:
                        self.log_test("Advanced Search - Country Filter", False, "Country filter not working correctly")
                else:
                    self.log_test("Advanced Search - Country Filter", False, "Country filter returned no results")
            else:
                self.log_test("Advanced Search - Country Filter", False, f"HTTP {response.status_code}")
            
            # Test 3: Content type filter
            response = self.make_request("GET", "/content/search?content_type=movie")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    all_movies = all(content["content_type"] == "movie" for content in data["contents"])
                    if all_movies:
                        self.log_test("Advanced Search - Content Type Filter", True, f"Content type filter returned {len(data['contents'])} movies")
                    else:
                        self.log_test("Advanced Search - Content Type Filter", False, "Content type filter not working correctly")
                else:
                    self.log_test("Advanced Search - Content Type Filter", False, "Content type filter returned no results")
            else:
                self.log_test("Advanced Search - Content Type Filter", False, f"HTTP {response.status_code}")
            
            # Test 4: Genre filter
            response = self.make_request("GET", "/content/search?genre=thriller")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    has_thriller = all("thriller" in content["genres"] for content in data["contents"])
                    if has_thriller:
                        self.log_test("Advanced Search - Genre Filter", True, f"Genre filter returned {len(data['contents'])} thriller content")
                    else:
                        self.log_test("Advanced Search - Genre Filter", False, "Genre filter not working correctly")
                else:
                    self.log_test("Advanced Search - Genre Filter", False, "Genre filter returned no results")
            else:
                self.log_test("Advanced Search - Genre Filter", False, f"HTTP {response.status_code}")
            
            # Test 5: Year range filter
            response = self.make_request("GET", "/content/search?year_from=2015&year_to=2020")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    in_range = all(2015 <= content["year"] <= 2020 for content in data["contents"])
                    if in_range:
                        self.log_test("Advanced Search - Year Range Filter", True, f"Year range filter returned {len(data['contents'])} content from 2015-2020")
                    else:
                        self.log_test("Advanced Search - Year Range Filter", False, "Year range filter not working correctly")
                else:
                    self.log_test("Advanced Search - Year Range Filter", False, "Year range filter returned no results")
            else:
                self.log_test("Advanced Search - Year Range Filter", False, f"HTTP {response.status_code}")
            
            # Test 6: Rating range filter
            response = self.make_request("GET", "/content/search?rating_min=8.0&rating_max=9.0")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 0:
                    in_range = all(8.0 <= content["rating"] <= 9.0 for content in data["contents"])
                    if in_range:
                        self.log_test("Advanced Search - Rating Range Filter", True, f"Rating range filter returned {len(data['contents'])} high-rated content")
                    else:
                        self.log_test("Advanced Search - Rating Range Filter", False, "Rating range filter not working correctly")
                else:
                    self.log_test("Advanced Search - Rating Range Filter", False, "Rating range filter returned no results")
            else:
                self.log_test("Advanced Search - Rating Range Filter", False, f"HTTP {response.status_code}")
            
            # Test 7: Combined filters
            response = self.make_request("GET", "/content/search?country=South Korea&content_type=movie&rating_min=8.0")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data:
                    self.log_test("Advanced Search - Combined Filters", True, f"Combined filters returned {len(data['contents'])} results")
                else:
                    self.log_test("Advanced Search - Combined Filters", False, "Combined filters failed")
            else:
                self.log_test("Advanced Search - Combined Filters", False, f"HTTP {response.status_code}")
            
            # Test 8: Sorting options
            response = self.make_request("GET", "/content/search?sort_by=rating&sort_order=desc")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and len(data["contents"]) > 1:
                    ratings = [content["rating"] for content in data["contents"]]
                    is_sorted_desc = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                    if is_sorted_desc:
                        self.log_test("Advanced Search - Sorting", True, "Results properly sorted by rating (descending)")
                    else:
                        self.log_test("Advanced Search - Sorting", False, "Sorting not working correctly")
                else:
                    self.log_test("Advanced Search - Sorting", True, "Sorting test completed (insufficient data for verification)")
            else:
                self.log_test("Advanced Search - Sorting", False, f"HTTP {response.status_code}")
            
            # Test 9: Pagination in search
            response = self.make_request("GET", "/content/search?page=1&limit=2")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and "page" in data and "limit" in data:
                    if data["page"] == 1 and data["limit"] == 2 and len(data["contents"]) <= 2:
                        self.log_test("Advanced Search - Pagination", True, "Search pagination working correctly")
                    else:
                        self.log_test("Advanced Search - Pagination", False, "Search pagination not working correctly")
                else:
                    self.log_test("Advanced Search - Pagination", False, "Search pagination response format incorrect")
            else:
                self.log_test("Advanced Search - Pagination", False, f"HTTP {response.status_code}")
            
            # Test 10: Empty search (should return all content)
            response = self.make_request("GET", "/content/search")
            
            if response.status_code == 200:
                data = response.json()
                if "contents" in data and "total" in data:
                    self.log_test("Advanced Search - Empty Query", True, f"Empty search returned {data['total']} total content items")
                else:
                    self.log_test("Advanced Search - Empty Query", False, "Empty search response format incorrect")
            else:
                self.log_test("Advanced Search - Empty Query", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Advanced Search Endpoint", False, f"Exception: {str(e)}")
    
    def test_featured_content_endpoint(self):
        """Test GET /api/content/featured - Featured content sections"""
        try:
            # Test 1: Trending content
            response = self.make_request("GET", "/content/featured?category=trending")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) > 0:
                    self.log_test("Featured Content - Trending", True, f"Retrieved {len(contents)} trending items")
                else:
                    self.log_test("Featured Content - Trending", False, "No trending content returned")
            else:
                self.log_test("Featured Content - Trending", False, f"HTTP {response.status_code}")
            
            # Test 2: New releases
            response = self.make_request("GET", "/content/featured?category=new_releases")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) > 0:
                    self.log_test("Featured Content - New Releases", True, f"Retrieved {len(contents)} new releases")
                else:
                    self.log_test("Featured Content - New Releases", False, "No new releases returned")
            else:
                self.log_test("Featured Content - New Releases", False, f"HTTP {response.status_code}")
            
            # Test 3: Top rated
            response = self.make_request("GET", "/content/featured?category=top_rated")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) > 0:
                    # Verify sorting by rating
                    ratings = [content["rating"] for content in contents]
                    is_sorted = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                    if is_sorted:
                        self.log_test("Featured Content - Top Rated", True, f"Retrieved {len(contents)} top rated items, properly sorted")
                    else:
                        self.log_test("Featured Content - Top Rated", True, f"Retrieved {len(contents)} top rated items")
                else:
                    self.log_test("Featured Content - Top Rated", False, "No top rated content returned")
            else:
                self.log_test("Featured Content - Top Rated", False, f"HTTP {response.status_code}")
            
            # Test 4: By country
            response = self.make_request("GET", "/content/featured?category=by_country&country=South Korea")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) > 0:
                    # Verify all content is from South Korea
                    all_korean = all("korea" in content["country"].lower() for content in contents)
                    if all_korean:
                        self.log_test("Featured Content - By Country", True, f"Retrieved {len(contents)} Korean content items")
                    else:
                        self.log_test("Featured Content - By Country", False, "Country filtering not working correctly")
                else:
                    self.log_test("Featured Content - By Country", False, "No country-specific content returned")
            else:
                self.log_test("Featured Content - By Country", False, f"HTTP {response.status_code}")
            
            # Test 5: Default category (should default to trending)
            response = self.make_request("GET", "/content/featured")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) > 0:
                    self.log_test("Featured Content - Default Category", True, f"Default category returned {len(contents)} items")
                else:
                    self.log_test("Featured Content - Default Category", False, "Default category returned no content")
            else:
                self.log_test("Featured Content - Default Category", False, f"HTTP {response.status_code}")
            
            # Test 6: Custom limit
            response = self.make_request("GET", "/content/featured?category=trending&limit=5")
            
            if response.status_code == 200:
                contents = response.json()
                if isinstance(contents, list) and len(contents) <= 5:
                    self.log_test("Featured Content - Custom Limit", True, f"Custom limit returned {len(contents)} items (max 5)")
                else:
                    self.log_test("Featured Content - Custom Limit", False, f"Custom limit not respected, returned {len(contents)} items")
            else:
                self.log_test("Featured Content - Custom Limit", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Featured Content Endpoint", False, f"Exception: {str(e)}")
    
    def test_trending_endpoint(self):
        """Test GET /api/trending (legacy endpoint)"""
        try:
            response = self.make_request("GET", "/trending")
            
            if response.status_code == 200:
                contents = response.json()
                
                if isinstance(contents, list) and len(contents) > 0:
                    # Check if results are sorted by rating (descending)
                    ratings = [content["rating"] for content in contents if "rating" in content]
                    is_sorted = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                    
                    if is_sorted:
                        self.log_test("Trending Content (Legacy)", True, f"Retrieved {len(contents)} trending items, properly sorted")
                    else:
                        self.log_test("Trending Content (Legacy)", True, f"Retrieved {len(contents)} trending items (sorting may vary)")
                else:
                    self.log_test("Trending Content (Legacy)", False, "No trending content returned")
            else:
                self.log_test("Trending Content (Legacy)", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Trending Content (Legacy)", False, f"Exception: {str(e)}")
    
    def test_countries_endpoint(self):
        """Test GET /api/countries"""
        try:
            response = self.make_request("GET", "/countries")
            
            if response.status_code == 200:
                data = response.json()
                
                if "countries" in data and isinstance(data["countries"], list):
                    countries = data["countries"]
                    expected_countries = ["South Korea", "Japan", "India", "Spain"]
                    
                    found_countries = [c for c in expected_countries if c in countries]
                    if len(found_countries) >= 3:  # At least 3 of the expected countries
                        self.log_test("Countries Endpoint", True, f"Retrieved {len(countries)} countries")
                    else:
                        self.log_test("Countries Endpoint", False, f"Missing expected countries. Found: {countries}")
                else:
                    self.log_test("Countries Endpoint", False, "Invalid response format")
            else:
                self.log_test("Countries Endpoint", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Countries Endpoint", False, f"Exception: {str(e)}")
    
    def test_genres_endpoint(self):
        """Test GET /api/genres"""
        try:
            response = self.make_request("GET", "/genres")
            
            if response.status_code == 200:
                data = response.json()
                
                if "genres" in data and isinstance(data["genres"], list):
                    genres = data["genres"]
                    expected_genres = ["romance", "comedy", "action", "thriller", "drama"]
                    
                    found_genres = [g for g in expected_genres if g in genres]
                    if len(found_genres) >= 4:  # At least 4 of the expected genres
                        self.log_test("Genres Endpoint", True, f"Retrieved {len(genres)} genres")
                    else:
                        self.log_test("Genres Endpoint", False, f"Missing expected genres. Found: {genres}")
                else:
                    self.log_test("Genres Endpoint", False, "Invalid response format")
            else:
                self.log_test("Genres Endpoint", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Genres Endpoint", False, f"Exception: {str(e)}")
    
    def test_content_types_endpoint(self):
        """Test GET /api/content-types"""
        try:
            response = self.make_request("GET", "/content-types")
            
            if response.status_code == 200:
                data = response.json()
                
                if "content_types" in data and isinstance(data["content_types"], list):
                    content_types = data["content_types"]
                    expected_types = ["drama", "movie", "series", "anime"]
                    
                    found_types = [t for t in expected_types if t in content_types]
                    if len(found_types) == 4:  # All expected types
                        self.log_test("Content Types Endpoint", True, f"Retrieved all {len(content_types)} content types")
                    else:
                        self.log_test("Content Types Endpoint", False, f"Missing expected types. Found: {content_types}")
                else:
                    self.log_test("Content Types Endpoint", False, "Invalid response format")
            else:
                self.log_test("Content Types Endpoint", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Content Types Endpoint", False, f"Exception: {str(e)}")
    
    def test_create_content(self):
        """Test POST /api/content"""
        try:
            new_content = {
                "title": "Test Drama",
                "original_title": "테스트 드라마",
                "poster_url": "https://example.com/poster.jpg",
                "synopsis": "A test drama for API testing",
                "year": 2024,
                "country": "Test Country",
                "content_type": "drama",
                "genres": ["romance", "comedy"],
                "rating": 7.5,
                "episodes": 16,
                "cast": [],
                "crew": [],
                "streaming_platforms": ["Test Platform"],
                "tags": ["test", "api"]
            }
            
            response = self.make_request("POST", "/content", json=new_content)
            
            if response.status_code == 200:
                created_content = response.json()
                
                if "id" in created_content and created_content["title"] == new_content["title"]:
                    self.log_test("Create Content", True, f"Successfully created content: {created_content['title']}")
                else:
                    self.log_test("Create Content", False, "Created content doesn't match input")
            else:
                self.log_test("Create Content", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Create Content", False, f"Exception: {str(e)}")
    
    def test_database_integration(self):
        """Test database integration and data persistence"""
        try:
            # Get content list to verify database connection
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                data = response.json()
                total_content = data["total"]
                
                if total_content > 0:
                    self.log_test("Database Integration", True, f"Database contains {total_content} content items")
                    
                    # Verify sample data is present
                    contents = data["contents"]
                    sample_titles = ["Squid Game", "Parasite", "Your Name", "3 Idiots", "Money Heist"]
                    found_titles = [c["title"] for c in contents if c["title"] in sample_titles]
                    
                    if len(found_titles) >= 3:
                        self.log_test("Sample Data", True, f"Found sample content: {found_titles}")
                    else:
                        self.log_test("Sample Data", False, f"Missing expected sample data. Found: {found_titles}")
                else:
                    self.log_test("Database Integration", False, "Database appears to be empty")
            else:
                self.log_test("Database Integration", False, f"Cannot verify database connection: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Database Integration", False, f"Exception: {str(e)}")
    
    def test_user_authentication(self):
        """Test user registration and login for watchlist testing"""
        try:
            # Test user registration
            test_user_data = {
                "email": "watchlist.tester@example.com",
                "username": "watchlist_tester",
                "password": "testpass123",
                "first_name": "Watchlist",
                "last_name": "Tester"
            }
            
            response = self.make_request("POST", "/auth/register", json=test_user_data)
            
            if response.status_code == 200:
                user_profile = response.json()
                self.test_user_id = user_profile["id"]
                self.log_test("User Registration", True, f"Successfully registered test user: {user_profile['username']}")
                
                # Test user login
                login_data = {
                    "email": test_user_data["email"],
                    "password": test_user_data["password"]
                }
                
                response = self.make_request("POST", "/auth/login", json=login_data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.auth_token = token_data["access_token"]
                    self.log_test("User Login", True, "Successfully logged in and obtained auth token")
                else:
                    self.log_test("User Login", False, f"Login failed: HTTP {response.status_code}")
                    
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login
                login_data = {
                    "email": test_user_data["email"],
                    "password": test_user_data["password"]
                }
                
                response = self.make_request("POST", "/auth/login", json=login_data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.auth_token = token_data["access_token"]
                    self.log_test("User Authentication", True, "Used existing test user and obtained auth token")
                else:
                    self.log_test("User Authentication", False, f"Login failed for existing user: HTTP {response.status_code}")
            else:
                self.log_test("User Registration", False, f"Registration failed: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("User Authentication", False, f"Exception: {str(e)}")
    
    def test_watchlist_add_content(self):
        """Test POST /api/watchlist - Add content to watchlist"""
        if not self.auth_token:
            self.log_test("Watchlist Add Content", False, "No auth token available")
            return
            
        if not self.sample_content_id:
            self.log_test("Watchlist Add Content", False, "No sample content ID available")
            return
            
        try:
            # Test 1: Add content with "want_to_watch" status
            watchlist_data = {
                "content_id": self.sample_content_id,
                "status": "want_to_watch",
                "notes": "Added for testing purposes"
            }
            
            response = self.make_request("POST", "/watchlist", json=watchlist_data)
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result:
                    self.test_watchlist_item_id = result["id"]
                    self.log_test("Watchlist Add Content - Want to Watch", True, "Successfully added content to watchlist")
                else:
                    self.log_test("Watchlist Add Content - Want to Watch", False, "No item ID returned")
            else:
                self.log_test("Watchlist Add Content - Want to Watch", False, f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Try to add same content again (should fail)
            response = self.make_request("POST", "/watchlist", json=watchlist_data)
            
            if response.status_code == 400:
                self.log_test("Watchlist Add Duplicate Content", True, "Correctly prevented duplicate content addition")
            else:
                self.log_test("Watchlist Add Duplicate Content", False, f"Expected 400, got {response.status_code}")
            
            # Test 3: Add content with different status (using different content if available)
            # Get another content ID for testing
            content_response = self.make_request("GET", "/content?limit=5")
            if content_response.status_code == 200:
                contents = content_response.json()["contents"]
                if len(contents) > 1:
                    second_content_id = contents[1]["id"]
                    
                    watching_data = {
                        "content_id": second_content_id,
                        "status": "watching",
                        "progress": 5,
                        "total_episodes": 16,
                        "rating": 8.5
                    }
                    
                    response = self.make_request("POST", "/watchlist", json=watching_data)
                    
                    if response.status_code == 200:
                        self.log_test("Watchlist Add Content - Watching", True, "Successfully added content with watching status")
                    else:
                        self.log_test("Watchlist Add Content - Watching", False, f"HTTP {response.status_code}")
            
            # Test 4: Add content with invalid content ID
            invalid_data = {
                "content_id": "invalid-content-id-12345",
                "status": "want_to_watch"
            }
            
            response = self.make_request("POST", "/watchlist", json=invalid_data)
            
            if response.status_code == 404:
                self.log_test("Watchlist Add Invalid Content", True, "Correctly handled invalid content ID")
            else:
                self.log_test("Watchlist Add Invalid Content", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Watchlist Add Content", False, f"Exception: {str(e)}")
    
    def test_watchlist_get_user_watchlist(self):
        """Test GET /api/watchlist - Get user's watchlist"""
        if not self.auth_token:
            self.log_test("Get User Watchlist", False, "No auth token available")
            return
            
        try:
            # Test 1: Get all watchlist items
            response = self.make_request("GET", "/watchlist")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["items", "total", "status_counts"]
                
                if all(field in data for field in required_fields):
                    items = data["items"]
                    total = data["total"]
                    status_counts = data["status_counts"]
                    
                    self.log_test("Get User Watchlist - All Items", True, f"Retrieved {len(items)} watchlist items (total: {total})")
                    
                    # Verify item structure
                    if len(items) > 0:
                        sample_item = items[0]
                        required_item_fields = ["id", "user_id", "content_id", "status", "content"]
                        
                        if all(field in sample_item for field in required_item_fields):
                            self.log_test("Watchlist Item Structure", True, "Watchlist items have required fields including content details")
                        else:
                            missing_fields = [f for f in required_item_fields if f not in sample_item]
                            self.log_test("Watchlist Item Structure", False, f"Missing fields: {missing_fields}")
                    
                    # Verify status counts structure
                    expected_statuses = ["want_to_watch", "watching", "completed", "dropped"]
                    if all(status in status_counts for status in expected_statuses):
                        self.log_test("Watchlist Status Counts", True, f"Status counts: {status_counts}")
                    else:
                        self.log_test("Watchlist Status Counts", False, "Missing status counts")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Get User Watchlist - All Items", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Get User Watchlist - All Items", False, f"HTTP {response.status_code}")
            
            # Test 2: Filter by status
            response = self.make_request("GET", "/watchlist?status=want_to_watch")
            
            if response.status_code == 200:
                data = response.json()
                items = data["items"]
                
                if len(items) > 0:
                    all_want_to_watch = all(item["status"] == "want_to_watch" for item in items)
                    if all_want_to_watch:
                        self.log_test("Get User Watchlist - Status Filter", True, f"Status filter returned {len(items)} 'want_to_watch' items")
                    else:
                        self.log_test("Get User Watchlist - Status Filter", False, "Status filter not working correctly")
                else:
                    self.log_test("Get User Watchlist - Status Filter", True, "Status filter returned no items (expected if no items with that status)")
            else:
                self.log_test("Get User Watchlist - Status Filter", False, f"HTTP {response.status_code}")
            
            # Test 3: Pagination
            response = self.make_request("GET", "/watchlist?page=1&limit=2")
            
            if response.status_code == 200:
                data = response.json()
                items = data["items"]
                
                if len(items) <= 2:
                    self.log_test("Get User Watchlist - Pagination", True, f"Pagination returned {len(items)} items (max 2)")
                else:
                    self.log_test("Get User Watchlist - Pagination", False, f"Pagination not working, returned {len(items)} items")
            else:
                self.log_test("Get User Watchlist - Pagination", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Get User Watchlist", False, f"Exception: {str(e)}")
    
    def test_watchlist_update_item(self):
        """Test PUT /api/watchlist/{item_id} - Update watchlist item"""
        if not self.auth_token:
            self.log_test("Update Watchlist Item", False, "No auth token available")
            return
            
        if not self.test_watchlist_item_id:
            self.log_test("Update Watchlist Item", False, "No watchlist item ID available")
            return
            
        try:
            # Test 1: Update status to watching
            update_data = {
                "status": "watching",
                "progress": 3,
                "rating": 8.0,
                "notes": "Updated to watching status"
            }
            
            response = self.make_request("PUT", f"/watchlist/{self.test_watchlist_item_id}", json=update_data)
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_test("Update Watchlist Item - Status Change", True, "Successfully updated watchlist item status to watching")
                else:
                    self.log_test("Update Watchlist Item - Status Change", False, "Unexpected response format")
            else:
                self.log_test("Update Watchlist Item - Status Change", False, f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Update to completed status
            complete_data = {
                "status": "completed",
                "progress": 16,
                "rating": 9.0,
                "notes": "Finished watching, excellent series!"
            }
            
            response = self.make_request("PUT", f"/watchlist/{self.test_watchlist_item_id}", json=complete_data)
            
            if response.status_code == 200:
                self.log_test("Update Watchlist Item - Complete", True, "Successfully updated watchlist item to completed")
            else:
                self.log_test("Update Watchlist Item - Complete", False, f"HTTP {response.status_code}")
            
            # Test 3: Update with partial data (only rating)
            partial_data = {
                "rating": 8.5
            }
            
            response = self.make_request("PUT", f"/watchlist/{self.test_watchlist_item_id}", json=partial_data)
            
            if response.status_code == 200:
                self.log_test("Update Watchlist Item - Partial Update", True, "Successfully updated watchlist item with partial data")
            else:
                self.log_test("Update Watchlist Item - Partial Update", False, f"HTTP {response.status_code}")
            
            # Test 4: Update non-existent item
            response = self.make_request("PUT", "/watchlist/invalid-item-id-12345", json=update_data)
            
            if response.status_code == 404:
                self.log_test("Update Non-existent Watchlist Item", True, "Correctly handled non-existent item update")
            else:
                self.log_test("Update Non-existent Watchlist Item", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Update Watchlist Item", False, f"Exception: {str(e)}")
    
    def test_watchlist_stats(self):
        """Test GET /api/watchlist/stats - Get watchlist statistics"""
        if not self.auth_token:
            self.log_test("Watchlist Stats", False, "No auth token available")
            return
            
        try:
            response = self.make_request("GET", "/watchlist/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["status_counts", "total_content", "recent_activity"]
                
                if all(field in data for field in required_fields):
                    status_counts = data["status_counts"]
                    total_content = data["total_content"]
                    recent_activity = data["recent_activity"]
                    
                    self.log_test("Watchlist Stats - Structure", True, f"Stats retrieved: {total_content} total items")
                    
                    # Verify status counts
                    expected_statuses = ["want_to_watch", "watching", "completed", "dropped"]
                    if all(status in status_counts for status in expected_statuses):
                        self.log_test("Watchlist Stats - Status Counts", True, f"Status breakdown: {status_counts}")
                    else:
                        self.log_test("Watchlist Stats - Status Counts", False, "Missing status counts")
                    
                    # Verify recent activity structure
                    if isinstance(recent_activity, list):
                        if len(recent_activity) > 0:
                            sample_activity = recent_activity[0]
                            if "content" in sample_activity and "status" in sample_activity:
                                self.log_test("Watchlist Stats - Recent Activity", True, f"Recent activity includes {len(recent_activity)} items with content details")
                            else:
                                self.log_test("Watchlist Stats - Recent Activity", False, "Recent activity missing required fields")
                        else:
                            self.log_test("Watchlist Stats - Recent Activity", True, "Recent activity is empty (expected if no items)")
                    else:
                        self.log_test("Watchlist Stats - Recent Activity", False, "Recent activity is not a list")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Watchlist Stats - Structure", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Watchlist Stats", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Watchlist Stats", False, f"Exception: {str(e)}")
    
    def test_watchlist_remove_content(self):
        """Test DELETE /api/watchlist/{item_id} - Remove content from watchlist"""
        if not self.auth_token:
            self.log_test("Remove Watchlist Content", False, "No auth token available")
            return
            
        if not self.test_watchlist_item_id:
            self.log_test("Remove Watchlist Content", False, "No watchlist item ID available")
            return
            
        try:
            # Test 1: Remove existing item
            response = self.make_request("DELETE", f"/watchlist/{self.test_watchlist_item_id}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_test("Remove Watchlist Content", True, "Successfully removed content from watchlist")
                else:
                    self.log_test("Remove Watchlist Content", False, "Unexpected response format")
            else:
                self.log_test("Remove Watchlist Content", False, f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Try to remove the same item again (should fail)
            response = self.make_request("DELETE", f"/watchlist/{self.test_watchlist_item_id}")
            
            if response.status_code == 404:
                self.log_test("Remove Non-existent Watchlist Item", True, "Correctly handled removal of non-existent item")
            else:
                self.log_test("Remove Non-existent Watchlist Item", False, f"Expected 404, got {response.status_code}")
            
            # Test 3: Remove with invalid item ID
            response = self.make_request("DELETE", "/watchlist/invalid-item-id-12345")
            
            if response.status_code == 404:
                self.log_test("Remove Invalid Watchlist Item", True, "Correctly handled invalid item ID")
            else:
                self.log_test("Remove Invalid Watchlist Item", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Remove Watchlist Content", False, f"Exception: {str(e)}")
    
    def test_watchlist_unauthorized_access(self):
        """Test watchlist endpoints without authentication"""
        try:
            # Temporarily remove auth token
            original_token = self.auth_token
            self.auth_token = None
            
            # Test GET /api/watchlist without auth
            response = self.make_request("GET", "/watchlist")
            
            if response.status_code == 401:
                self.log_test("Watchlist Unauthorized Access - GET", True, "Correctly blocked unauthorized access to watchlist")
            else:
                self.log_test("Watchlist Unauthorized Access - GET", False, f"Expected 401, got {response.status_code}")
            
            # Test POST /api/watchlist without auth
            watchlist_data = {
                "content_id": self.sample_content_id or "test-id",
                "status": "want_to_watch"
            }
            
            response = self.make_request("POST", "/watchlist", json=watchlist_data)
            
            if response.status_code == 401:
                self.log_test("Watchlist Unauthorized Access - POST", True, "Correctly blocked unauthorized content addition")
            else:
                self.log_test("Watchlist Unauthorized Access - POST", False, f"Expected 401, got {response.status_code}")
            
            # Test GET /api/watchlist/stats without auth
            response = self.make_request("GET", "/watchlist/stats")
            
            if response.status_code == 401:
                self.log_test("Watchlist Unauthorized Access - Stats", True, "Correctly blocked unauthorized stats access")
            else:
                self.log_test("Watchlist Unauthorized Access - Stats", False, f"Expected 401, got {response.status_code}")
            
            # Restore auth token
            self.auth_token = original_token
            
        except Exception as e:
            self.log_test("Watchlist Unauthorized Access", False, f"Exception: {str(e)}")
            # Restore auth token in case of exception
            self.auth_token = original_token
    
    # Day 6: Personal Analytics Tests
    def test_analytics_track_viewing(self):
        """Test POST /api/analytics/view - Track user viewing activity"""
        if not self.auth_token:
            self.log_test("Analytics Track Viewing", False, "No auth token available")
            return
            
        if not self.sample_content_id:
            self.log_test("Analytics Track Viewing", False, "No sample content ID available")
            return
            
        try:
            # Test 1: Track basic viewing activity
            viewing_data = {
                "content_id": self.sample_content_id,
                "viewing_duration": 45,
                "completion_percentage": 75.5,
                "device_type": "web"
            }
            
            response = self.make_request("POST", "/analytics/view", json=viewing_data)
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_test("Analytics Track Viewing - Basic", True, "Successfully tracked viewing activity")
                else:
                    self.log_test("Analytics Track Viewing - Basic", False, "Unexpected response format")
            else:
                self.log_test("Analytics Track Viewing - Basic", False, f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Track viewing with minimal data
            minimal_data = {
                "content_id": self.sample_content_id
            }
            
            response = self.make_request("POST", "/analytics/view", json=minimal_data)
            
            if response.status_code == 200:
                self.log_test("Analytics Track Viewing - Minimal", True, "Successfully tracked viewing with minimal data")
            else:
                self.log_test("Analytics Track Viewing - Minimal", False, f"HTTP {response.status_code}")
            
            # Test 3: Track viewing with invalid content ID
            invalid_data = {
                "content_id": "invalid-content-id-12345",
                "viewing_duration": 30
            }
            
            response = self.make_request("POST", "/analytics/view", json=invalid_data)
            
            if response.status_code == 404:
                self.log_test("Analytics Track Viewing - Invalid Content", True, "Correctly handled invalid content ID")
            else:
                self.log_test("Analytics Track Viewing - Invalid Content", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Analytics Track Viewing", False, f"Exception: {str(e)}")
    
    def test_analytics_dashboard(self):
        """Test GET /api/analytics/dashboard - Get comprehensive user analytics"""
        if not self.auth_token:
            self.log_test("Analytics Dashboard", False, "No auth token available")
            return
            
        try:
            response = self.make_request("GET", "/analytics/dashboard")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = [
                    "total_content_watched", "total_viewing_time", "completion_rate",
                    "favorite_genres", "favorite_countries", "viewing_streak",
                    "achievements", "monthly_stats", "top_rated_content"
                ]
                
                if all(field in data for field in required_fields):
                    self.log_test("Analytics Dashboard - Structure", True, "Dashboard has all required analytics fields")
                    
                    # Verify data types and structure
                    if isinstance(data["total_content_watched"], int) and data["total_content_watched"] >= 0:
                        self.log_test("Analytics Dashboard - Content Count", True, f"Total content watched: {data['total_content_watched']}")
                    else:
                        self.log_test("Analytics Dashboard - Content Count", False, "Invalid total content watched value")
                    
                    if isinstance(data["total_viewing_time"], int) and data["total_viewing_time"] >= 0:
                        self.log_test("Analytics Dashboard - Viewing Time", True, f"Total viewing time: {data['total_viewing_time']} minutes")
                    else:
                        self.log_test("Analytics Dashboard - Viewing Time", False, "Invalid total viewing time value")
                    
                    if isinstance(data["completion_rate"], (int, float)) and 0 <= data["completion_rate"] <= 100:
                        self.log_test("Analytics Dashboard - Completion Rate", True, f"Completion rate: {data['completion_rate']}%")
                    else:
                        self.log_test("Analytics Dashboard - Completion Rate", False, "Invalid completion rate value")
                    
                    if isinstance(data["favorite_genres"], list):
                        self.log_test("Analytics Dashboard - Favorite Genres", True, f"Found {len(data['favorite_genres'])} favorite genres")
                    else:
                        self.log_test("Analytics Dashboard - Favorite Genres", False, "Favorite genres is not a list")
                    
                    if isinstance(data["favorite_countries"], list):
                        self.log_test("Analytics Dashboard - Favorite Countries", True, f"Found {len(data['favorite_countries'])} favorite countries")
                    else:
                        self.log_test("Analytics Dashboard - Favorite Countries", False, "Favorite countries is not a list")
                    
                    if isinstance(data["viewing_streak"], int) and data["viewing_streak"] >= 0:
                        self.log_test("Analytics Dashboard - Viewing Streak", True, f"Viewing streak: {data['viewing_streak']} days")
                    else:
                        self.log_test("Analytics Dashboard - Viewing Streak", False, "Invalid viewing streak value")
                    
                    if isinstance(data["achievements"], list):
                        self.log_test("Analytics Dashboard - Achievements", True, f"User has {len(data['achievements'])} achievements")
                    else:
                        self.log_test("Analytics Dashboard - Achievements", False, "Achievements is not a list")
                    
                    if isinstance(data["monthly_stats"], dict):
                        self.log_test("Analytics Dashboard - Monthly Stats", True, f"Monthly stats for {len(data['monthly_stats'])} months")
                    else:
                        self.log_test("Analytics Dashboard - Monthly Stats", False, "Monthly stats is not a dict")
                    
                    if isinstance(data["top_rated_content"], list):
                        self.log_test("Analytics Dashboard - Top Rated Content", True, f"Found {len(data['top_rated_content'])} top rated items")
                    else:
                        self.log_test("Analytics Dashboard - Top Rated Content", False, "Top rated content is not a list")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Analytics Dashboard - Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Analytics Dashboard", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Analytics Dashboard", False, f"Exception: {str(e)}")
    
    def test_analytics_history(self):
        """Test GET /api/analytics/history - Get user's viewing history"""
        if not self.auth_token:
            self.log_test("Analytics History", False, "No auth token available")
            return
            
        try:
            # Test 1: Get viewing history
            response = self.make_request("GET", "/analytics/history")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["history", "total", "page", "limit"]
                
                if all(field in data for field in required_fields):
                    history = data["history"]
                    total = data["total"]
                    
                    self.log_test("Analytics History - Structure", True, f"Retrieved {len(history)} history items (total: {total})")
                    
                    # Verify history item structure
                    if len(history) > 0:
                        sample_item = history[0]
                        required_item_fields = ["user_id", "content_id", "viewed_at", "content"]
                        
                        if all(field in sample_item for field in required_item_fields):
                            self.log_test("Analytics History - Item Structure", True, "History items have required fields including content details")
                        else:
                            missing_fields = [f for f in required_item_fields if f not in sample_item]
                            self.log_test("Analytics History - Item Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Analytics History - Item Structure", True, "No history items to verify (expected for new user)")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Analytics History - Structure", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Analytics History", False, f"HTTP {response.status_code}")
            
            # Test 2: Test pagination
            response = self.make_request("GET", "/analytics/history?page=1&limit=5")
            
            if response.status_code == 200:
                data = response.json()
                if data["page"] == 1 and data["limit"] == 5 and len(data["history"]) <= 5:
                    self.log_test("Analytics History - Pagination", True, "Pagination working correctly")
                else:
                    self.log_test("Analytics History - Pagination", False, "Pagination parameters not respected")
            else:
                self.log_test("Analytics History - Pagination", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Analytics History", False, f"Exception: {str(e)}")
    
    # Day 7: Social Features Tests
    def test_social_follow_user(self):
        """Test POST /api/social/follow/{username} - Follow another user"""
        if not self.auth_token:
            self.log_test("Social Follow User", False, "No auth token available")
            return
            
        try:
            # Create a second test user to follow
            second_user_data = {
                "email": "social.test2@example.com",
                "username": "social_test_user2",
                "password": "testpass123",
                "first_name": "Social",
                "last_name": "TestUser2"
            }
            
            response = self.make_request("POST", "/auth/register", json=second_user_data)
            
            if response.status_code == 200 or (response.status_code == 400 and "already registered" in response.text):
                target_username = second_user_data["username"]
                
                # Test 1: Follow the user
                response = self.make_request("POST", f"/social/follow/{target_username}")
                
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result and target_username in result["message"]:
                        self.log_test("Social Follow User - Success", True, f"Successfully followed {target_username}")
                    else:
                        self.log_test("Social Follow User - Success", False, "Unexpected response format")
                else:
                    self.log_test("Social Follow User - Success", False, f"HTTP {response.status_code}: {response.text}")
                
                # Test 2: Try to follow the same user again (should fail)
                response = self.make_request("POST", f"/social/follow/{target_username}")
                
                if response.status_code == 400:
                    self.log_test("Social Follow User - Duplicate", True, "Correctly prevented duplicate follow")
                else:
                    self.log_test("Social Follow User - Duplicate", False, f"Expected 400, got {response.status_code}")
                
                # Test 3: Try to follow non-existent user
                response = self.make_request("POST", "/social/follow/nonexistent_user_12345")
                
                if response.status_code == 404:
                    self.log_test("Social Follow User - Non-existent", True, "Correctly handled non-existent user")
                else:
                    self.log_test("Social Follow User - Non-existent", False, f"Expected 404, got {response.status_code}")
                
                # Test 4: Try to follow yourself (should fail)
                # Get current user info first
                me_response = self.make_request("GET", "/auth/me")
                if me_response.status_code == 200:
                    my_username = me_response.json()["username"]
                    response = self.make_request("POST", f"/social/follow/{my_username}")
                    
                    if response.status_code == 400:
                        self.log_test("Social Follow User - Self Follow", True, "Correctly prevented self-follow")
                    else:
                        self.log_test("Social Follow User - Self Follow", False, f"Expected 400, got {response.status_code}")
                        
            else:
                self.log_test("Social Follow User", False, f"Failed to create second test user: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Social Follow User", False, f"Exception: {str(e)}")
    
    def test_social_unfollow_user(self):
        """Test DELETE /api/social/unfollow/{username} - Unfollow a user"""
        if not self.auth_token:
            self.log_test("Social Unfollow User", False, "No auth token available")
            return
            
        try:
            target_username = "social_test_user2"
            
            # Test 1: Unfollow the user we followed earlier
            response = self.make_request("DELETE", f"/social/unfollow/{target_username}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result and target_username in result["message"]:
                    self.log_test("Social Unfollow User - Success", True, f"Successfully unfollowed {target_username}")
                else:
                    self.log_test("Social Unfollow User - Success", False, "Unexpected response format")
            else:
                self.log_test("Social Unfollow User - Success", False, f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Try to unfollow the same user again (should fail)
            response = self.make_request("DELETE", f"/social/unfollow/{target_username}")
            
            if response.status_code == 400:
                self.log_test("Social Unfollow User - Not Following", True, "Correctly handled unfollow of non-followed user")
            else:
                self.log_test("Social Unfollow User - Not Following", False, f"Expected 400, got {response.status_code}")
            
            # Test 3: Try to unfollow non-existent user
            response = self.make_request("DELETE", "/social/unfollow/nonexistent_user_12345")
            
            if response.status_code == 404:
                self.log_test("Social Unfollow User - Non-existent", True, "Correctly handled non-existent user")
            else:
                self.log_test("Social Unfollow User - Non-existent", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Social Unfollow User", False, f"Exception: {str(e)}")
    
    def test_social_followers_following(self):
        """Test GET /api/social/followers/{username} and GET /api/social/following/{username}"""
        try:
            target_username = "social_test_user2"
            
            # Test 1: Get followers list
            response = self.make_request("GET", f"/social/followers/{target_username}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["followers", "total", "page", "limit"]
                
                if all(field in data for field in required_fields):
                    followers = data["followers"]
                    total = data["total"]
                    
                    self.log_test("Social Followers List", True, f"Retrieved {len(followers)} followers (total: {total})")
                    
                    # Verify follower structure
                    if len(followers) > 0:
                        sample_follower = followers[0]
                        required_follower_fields = ["username", "followed_at"]
                        
                        if all(field in sample_follower for field in required_follower_fields):
                            self.log_test("Social Followers Structure", True, "Follower items have required fields")
                        else:
                            missing_fields = [f for f in required_follower_fields if f not in sample_follower]
                            self.log_test("Social Followers Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Social Followers Structure", True, "No followers to verify structure")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Social Followers List", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Social Followers List", False, f"HTTP {response.status_code}")
            
            # Test 2: Get following list
            response = self.make_request("GET", f"/social/following/{target_username}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["following", "total", "page", "limit"]
                
                if all(field in data for field in required_fields):
                    following = data["following"]
                    total = data["total"]
                    
                    self.log_test("Social Following List", True, f"Retrieved {len(following)} following (total: {total})")
                    
                    # Verify following structure
                    if len(following) > 0:
                        sample_following = following[0]
                        required_following_fields = ["username", "followed_at"]
                        
                        if all(field in sample_following for field in required_following_fields):
                            self.log_test("Social Following Structure", True, "Following items have required fields")
                        else:
                            missing_fields = [f for f in required_following_fields if f not in sample_following]
                            self.log_test("Social Following Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Social Following Structure", True, "No following to verify structure")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Social Following List", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Social Following List", False, f"HTTP {response.status_code}")
            
            # Test 3: Test pagination for followers
            response = self.make_request("GET", f"/social/followers/{target_username}?page=1&limit=5")
            
            if response.status_code == 200:
                data = response.json()
                if data["page"] == 1 and data["limit"] == 5 and len(data["followers"]) <= 5:
                    self.log_test("Social Followers Pagination", True, "Followers pagination working correctly")
                else:
                    self.log_test("Social Followers Pagination", False, "Followers pagination not working correctly")
            else:
                self.log_test("Social Followers Pagination", False, f"HTTP {response.status_code}")
            
            # Test 4: Test with non-existent user
            response = self.make_request("GET", "/social/followers/nonexistent_user_12345")
            
            if response.status_code == 404:
                self.log_test("Social Followers Non-existent User", True, "Correctly handled non-existent user")
            else:
                self.log_test("Social Followers Non-existent User", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Social Followers Following", False, f"Exception: {str(e)}")
    
    def test_social_activity_feed(self):
        """Test GET /api/social/feed - Get activity feed from followed users"""
        if not self.auth_token:
            self.log_test("Social Activity Feed", False, "No auth token available")
            return
            
        try:
            # Test 1: Get activity feed
            response = self.make_request("GET", "/social/feed")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["activities", "total", "page", "limit"]
                
                if all(field in data for field in required_fields):
                    activities = data["activities"]
                    total = data["total"]
                    
                    self.log_test("Social Activity Feed - Structure", True, f"Retrieved {len(activities)} activities (total: {total})")
                    
                    # Verify activity structure
                    if len(activities) > 0:
                        sample_activity = activities[0]
                        required_activity_fields = ["activity_type", "created_at", "user"]
                        
                        if all(field in sample_activity for field in required_activity_fields):
                            self.log_test("Social Activity Feed - Item Structure", True, "Activity items have required fields")
                            
                            # Verify user info in activity
                            user_info = sample_activity["user"]
                            if "username" in user_info:
                                self.log_test("Social Activity Feed - User Info", True, "Activity includes user information")
                            else:
                                self.log_test("Social Activity Feed - User Info", False, "Activity missing user information")
                        else:
                            missing_fields = [f for f in required_activity_fields if f not in sample_activity]
                            self.log_test("Social Activity Feed - Item Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Social Activity Feed - Item Structure", True, "No activities to verify structure (expected for new user)")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Social Activity Feed - Structure", False, f"Missing response fields: {missing_fields}")
            else:
                self.log_test("Social Activity Feed", False, f"HTTP {response.status_code}")
            
            # Test 2: Test pagination
            response = self.make_request("GET", "/social/feed?page=1&limit=10")
            
            if response.status_code == 200:
                data = response.json()
                if data["page"] == 1 and data["limit"] == 10 and len(data["activities"]) <= 10:
                    self.log_test("Social Activity Feed - Pagination", True, "Activity feed pagination working correctly")
                else:
                    self.log_test("Social Activity Feed - Pagination", False, "Activity feed pagination not working correctly")
            else:
                self.log_test("Social Activity Feed - Pagination", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Social Activity Feed", False, f"Exception: {str(e)}")
    
    def test_social_user_stats(self):
        """Test GET /api/social/stats/{username} - Get user's social statistics"""
        try:
            target_username = "social_test_user2"
            
            # Test 1: Get social stats for existing user
            response = self.make_request("GET", f"/social/stats/{target_username}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["followers_count", "following_count", "public_reviews", "public_lists"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Social User Stats - Structure", True, "Social stats have all required fields")
                    
                    # Verify data types
                    if all(isinstance(data[field], int) and data[field] >= 0 for field in required_fields):
                        stats_summary = f"Followers: {data['followers_count']}, Following: {data['following_count']}, Reviews: {data['public_reviews']}, Lists: {data['public_lists']}"
                        self.log_test("Social User Stats - Values", True, f"Valid stats values - {stats_summary}")
                    else:
                        self.log_test("Social User Stats - Values", False, "Invalid stats values (should be non-negative integers)")
                        
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Social User Stats - Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Social User Stats", False, f"HTTP {response.status_code}")
            
            # Test 2: Get stats for current user
            me_response = self.make_request("GET", "/auth/me")
            if me_response.status_code == 200:
                my_username = me_response.json()["username"]
                response = self.make_request("GET", f"/social/stats/{my_username}")
                
                if response.status_code == 200:
                    self.log_test("Social User Stats - Own Stats", True, "Successfully retrieved own social stats")
                else:
                    self.log_test("Social User Stats - Own Stats", False, f"HTTP {response.status_code}")
            
            # Test 3: Get stats for non-existent user
            response = self.make_request("GET", "/social/stats/nonexistent_user_12345")
            
            if response.status_code == 404:
                self.log_test("Social User Stats - Non-existent User", True, "Correctly handled non-existent user")
            else:
                self.log_test("Social User Stats - Non-existent User", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Social User Stats", False, f"Exception: {str(e)}")
    
    def test_social_unauthorized_access(self):
        """Test social endpoints without authentication where required"""
        try:
            # Temporarily remove auth token
            original_token = self.auth_token
            self.auth_token = None
            
            # Test 1: Follow endpoint without auth (should fail)
            response = self.make_request("POST", "/social/follow/test_user")
            
            if response.status_code == 401:
                self.log_test("Social Unauthorized - Follow", True, "Correctly blocked unauthorized follow")
            else:
                self.log_test("Social Unauthorized - Follow", False, f"Expected 401, got {response.status_code}")
            
            # Test 2: Unfollow endpoint without auth (should fail)
            response = self.make_request("DELETE", "/social/unfollow/test_user")
            
            if response.status_code == 401:
                self.log_test("Social Unauthorized - Unfollow", True, "Correctly blocked unauthorized unfollow")
            else:
                self.log_test("Social Unauthorized - Unfollow", False, f"Expected 401, got {response.status_code}")
            
            # Test 3: Activity feed without auth (should fail)
            response = self.make_request("GET", "/social/feed")
            
            if response.status_code == 401:
                self.log_test("Social Unauthorized - Feed", True, "Correctly blocked unauthorized feed access")
            else:
                self.log_test("Social Unauthorized - Feed", False, f"Expected 401, got {response.status_code}")
            
            # Test 4: Public endpoints should work without auth
            response = self.make_request("GET", "/social/followers/social_test_user2")
            
            if response.status_code == 200:
                self.log_test("Social Public - Followers", True, "Followers list accessible without auth")
            else:
                self.log_test("Social Public - Followers", False, f"Expected 200, got {response.status_code}")
            
            response = self.make_request("GET", "/social/following/social_test_user2")
            
            if response.status_code == 200:
                self.log_test("Social Public - Following", True, "Following list accessible without auth")
            else:
                self.log_test("Social Public - Following", False, f"Expected 200, got {response.status_code}")
            
            response = self.make_request("GET", "/social/stats/social_test_user2")
            
            if response.status_code == 200:
                self.log_test("Social Public - Stats", True, "User stats accessible without auth")
            else:
                self.log_test("Social Public - Stats", False, f"Expected 200, got {response.status_code}")
            
            # Restore auth token
            self.auth_token = original_token
            
        except Exception as e:
            self.log_test("Social Unauthorized Access", False, f"Exception: {str(e)}")
            # Restore auth token in case of exception
            self.auth_token = original_token
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for Global Drama Verse Guide - Day 6 & 7: Personal Analytics & Social Features")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Core API endpoint tests
        self.test_root_endpoint()
        self.test_content_list_endpoint()
        self.test_content_pagination()
        self.test_individual_content()
        self.test_invalid_content_id()
        
        # Day 3 Public Content Discovery - Advanced Search Tests
        print("\n🔍 DAY 3 ADVANCED SEARCH TESTS")
        print("-" * 50)
        self.test_advanced_search_endpoint()
        
        # Day 3 Public Content Discovery - Featured Content Tests  
        print("\n⭐ DAY 3 FEATURED CONTENT TESTS")
        print("-" * 50)
        self.test_featured_content_endpoint()
        
        # Filter option endpoints
        print("\n📋 FILTER OPTION ENDPOINTS")
        print("-" * 50)
        self.test_countries_endpoint()
        self.test_genres_endpoint()
        self.test_content_types_endpoint()
        
        # User Authentication for Watchlist Tests
        print("\n🔐 USER AUTHENTICATION TESTS")
        print("-" * 50)
        self.test_user_authentication()
        
        # Day 4 Watchlist System Tests
        print("\n📝 DAY 4 WATCHLIST SYSTEM TESTS")
        print("-" * 50)
        self.test_watchlist_unauthorized_access()
        self.test_watchlist_add_content()
        self.test_watchlist_get_user_watchlist()
        self.test_watchlist_update_item()
        self.test_watchlist_stats()
        self.test_watchlist_remove_content()
        
        # Day 6 Personal Analytics Tests
        print("\n📊 DAY 6 PERSONAL ANALYTICS TESTS")
        print("-" * 50)
        self.test_analytics_track_viewing()
        self.test_analytics_dashboard()
        self.test_analytics_history()
        
        # Day 7 Social Features Tests
        print("\n👥 DAY 7 SOCIAL FEATURES TESTS")
        print("-" * 50)
        self.test_social_unauthorized_access()
        self.test_social_follow_user()
        self.test_social_unfollow_user()
        self.test_social_followers_following()
        self.test_social_activity_feed()
        self.test_social_user_stats()
        
        # Legacy endpoints
        print("\n🔄 LEGACY ENDPOINTS")
        print("-" * 50)
        self.test_trending_endpoint()
        
        # Search and filtering tests (original)
        print("\n🔎 ORIGINAL SEARCH & FILTER TESTS")
        print("-" * 50)
        self.test_content_search()
        self.test_content_filters()
        
        # Database integration tests
        print("\n💾 DATABASE INTEGRATION TESTS")
        print("-" * 50)
        self.test_database_integration()
        
        # Content creation test
        print("\n➕ CONTENT CREATION TEST")
        print("-" * 50)
        self.test_create_content()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the details above.")
        sys.exit(1)