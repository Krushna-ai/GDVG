#!/usr/bin/env python3
"""
Review Validation Test - Specific endpoint testing as requested
Tests the exact endpoints mentioned in the review request
"""

import requests
import json
import sys
from typing import Dict, Any

# Get backend URL from frontend .env
BACKEND_URL = "https://globaldramas.preview.emergentagent.com/api"

class ReviewValidationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.admin_token = None
        
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
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add authorization header if admin token is available
        if self.admin_token and 'headers' not in kwargs:
            kwargs['headers'] = {}
        if self.admin_token:
            kwargs['headers']['Authorization'] = f"Bearer {self.admin_token}"
            
        try:
            print(f"Making {method} request to: {url}")
            response = requests.request(method, url, timeout=30, **kwargs)
            print(f"Response: {response.status_code}")
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_admin_login(self):
        """Test POST /api/admin/login with {username: 'admin', password: 'admin123'}"""
        try:
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.make_request("POST", "/admin/login", json=login_data)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "access_token" in data:
                        self.admin_token = data["access_token"]
                        self.log_test(
                            "POST /api/admin/login", 
                            True, 
                            f"Status: {response.status_code} - Successfully authenticated admin and received access_token",
                            {"token_type": data.get("token_type", "N/A")}
                        )
                    else:
                        self.log_test(
                            "POST /api/admin/login", 
                            False, 
                            f"Status: {response.status_code} - Missing access_token in response",
                            {"response_body": data}
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        "POST /api/admin/login", 
                        False, 
                        f"Status: {response.status_code} - Invalid JSON response",
                        {"response_text": response.text}
                    )
            else:
                try:
                    error_body = response.json()
                except:
                    error_body = response.text
                    
                self.log_test(
                    "POST /api/admin/login", 
                    False, 
                    f"Status: {response.status_code} - Authentication failed",
                    {"error_body": error_body}
                )
                
        except Exception as e:
            self.log_test("POST /api/admin/login", False, f"Exception: {str(e)}")
    
    def test_content_list(self):
        """Test GET /api/content should return contents list > 0"""
        try:
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "contents" in data and isinstance(data["contents"], list):
                        content_count = len(data["contents"])
                        if content_count > 0:
                            self.log_test(
                                "GET /api/content", 
                                True, 
                                f"Status: {response.status_code} - Retrieved {content_count} content items",
                                {"total": data.get("total", "N/A"), "sample_titles": [c.get("title", "N/A") for c in data["contents"][:3]]}
                            )
                        else:
                            self.log_test(
                                "GET /api/content", 
                                False, 
                                f"Status: {response.status_code} - Contents list is empty",
                                {"response_structure": list(data.keys())}
                            )
                    else:
                        self.log_test(
                            "GET /api/content", 
                            False, 
                            f"Status: {response.status_code} - Missing or invalid 'contents' field",
                            {"response_structure": list(data.keys()) if isinstance(data, dict) else "Not a dict"}
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        "GET /api/content", 
                        False, 
                        f"Status: {response.status_code} - Invalid JSON response",
                        {"response_text": response.text[:500]}
                    )
            else:
                try:
                    error_body = response.json()
                except:
                    error_body = response.text
                    
                self.log_test(
                    "GET /api/content", 
                    False, 
                    f"Status: {response.status_code} - Request failed",
                    {"error_body": error_body}
                )
                
        except Exception as e:
            self.log_test("GET /api/content", False, f"Exception: {str(e)}")
    
    def test_content_search(self):
        """Test GET /api/content/search?query=Squid should return results if sample present"""
        try:
            response = self.make_request("GET", "/content/search?query=Squid")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "contents" in data and isinstance(data["contents"], list):
                        results = data["contents"]
                        result_count = len(results)
                        
                        if result_count > 0:
                            # Check if results are relevant to "Squid"
                            relevant_results = []
                            for content in results:
                                title = content.get("title", "").lower()
                                synopsis = content.get("synopsis", "").lower()
                                if "squid" in title or "squid" in synopsis:
                                    relevant_results.append(content.get("title", "Unknown"))
                            
                            if relevant_results:
                                self.log_test(
                                    "GET /api/content/search?query=Squid", 
                                    True, 
                                    f"Status: {response.status_code} - Found {result_count} results, {len(relevant_results)} relevant to 'Squid'",
                                    {"relevant_titles": relevant_results}
                                )
                            else:
                                self.log_test(
                                    "GET /api/content/search?query=Squid", 
                                    False, 
                                    f"Status: {response.status_code} - Found {result_count} results but none relevant to 'Squid'",
                                    {"returned_titles": [c.get("title", "N/A") for c in results[:3]]}
                                )
                        else:
                            self.log_test(
                                "GET /api/content/search?query=Squid", 
                                False, 
                                f"Status: {response.status_code} - No search results returned",
                                {"response_structure": list(data.keys())}
                            )
                    else:
                        self.log_test(
                            "GET /api/content/search?query=Squid", 
                            False, 
                            f"Status: {response.status_code} - Missing or invalid 'contents' field",
                            {"response_structure": list(data.keys()) if isinstance(data, dict) else "Not a dict"}
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        "GET /api/content/search?query=Squid", 
                        False, 
                        f"Status: {response.status_code} - Invalid JSON response",
                        {"response_text": response.text[:500]}
                    )
            else:
                try:
                    error_body = response.json()
                except:
                    error_body = response.text
                    
                self.log_test(
                    "GET /api/content/search?query=Squid", 
                    False, 
                    f"Status: {response.status_code} - Request failed",
                    {"error_body": error_body}
                )
                
        except Exception as e:
            self.log_test("GET /api/content/search?query=Squid", False, f"Exception: {str(e)}")
    
    def test_admin_bulk_import_template(self):
        """Test POST /api/admin/bulk-import/template requires admin token and should return template"""
        try:
            if not self.admin_token:
                self.log_test(
                    "POST /api/admin/bulk-import/template", 
                    False, 
                    "Cannot test - no admin token available (admin login failed)"
                )
                return
            
            response = self.make_request("POST", "/admin/bulk-import/template")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Check if response looks like a template
                    if isinstance(data, dict) or isinstance(data, list):
                        self.log_test(
                            "POST /api/admin/bulk-import/template", 
                            True, 
                            f"Status: {response.status_code} - Successfully retrieved bulk import template",
                            {"template_structure": str(type(data)), "sample_keys": list(data.keys()) if isinstance(data, dict) else "List response"}
                        )
                    else:
                        self.log_test(
                            "POST /api/admin/bulk-import/template", 
                            False, 
                            f"Status: {response.status_code} - Unexpected template format",
                            {"response_type": str(type(data)), "response": str(data)[:200]}
                        )
                except json.JSONDecodeError:
                    self.log_test(
                        "POST /api/admin/bulk-import/template", 
                        False, 
                        f"Status: {response.status_code} - Invalid JSON response",
                        {"response_text": response.text[:500]}
                    )
            else:
                try:
                    error_body = response.json()
                except:
                    error_body = response.text
                    
                self.log_test(
                    "POST /api/admin/bulk-import/template", 
                    False, 
                    f"Status: {response.status_code} - Request failed",
                    {"error_body": error_body}
                )
                
        except Exception as e:
            self.log_test("POST /api/admin/bulk-import/template", False, f"Exception: {str(e)}")
    
    def test_api_routes_reachability(self):
        """Test if /api routes are reachable at all"""
        try:
            # Test root API endpoint
            response = self.make_request("GET", "/")
            
            if response.status_code == 404:
                self.log_test(
                    "API Routes Reachability", 
                    False, 
                    f"Root /api/ endpoint returns 404 - API routes may not be properly configured",
                    {"base_url_used": self.base_url, "status_code": response.status_code}
                )
            else:
                self.log_test(
                    "API Routes Reachability", 
                    True, 
                    f"Root /api/ endpoint reachable - Status: {response.status_code}",
                    {"base_url_used": self.base_url}
                )
                
        except Exception as e:
            self.log_test("API Routes Reachability", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all validation tests"""
        print("=" * 80)
        print("REVIEW VALIDATION TEST - SPECIFIC ENDPOINT TESTING")
        print("=" * 80)
        print(f"Testing against: {self.base_url}")
        print()
        
        # Test API reachability first
        self.test_api_routes_reachability()
        
        # Test the specific endpoints mentioned in review request
        self.test_admin_login()
        self.test_content_list()
        self.test_content_search()
        self.test_admin_bulk_import_template()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print()
        
        if passed < total:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['message']}")
        else:
            print("✅ ALL TESTS PASSED!")
        
        return passed == total

if __name__ == "__main__":
    tester = ReviewValidationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)