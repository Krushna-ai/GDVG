#!/usr/bin/env python3
"""
Homepage Sanity Backend Testing for Global Drama Verse Guide
Quick backend sanity for homepage issue + diagnostics as requested
"""

import requests
import json
import sys
from typing import Dict, Any

# Get backend URL from frontend .env
BACKEND_URL = "https://routefix-drama.preview.emergentagent.com/api"

class HomepageSanityTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        
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
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_content_endpoint(self):
        """Test GET /api/content -> ensure contents[] length > 0 and matches DB total > 0"""
        try:
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has required structure
                if "contents" in data and "total" in data:
                    contents = data["contents"]
                    total = data["total"]
                    
                    # Check contents[] length > 0
                    if len(contents) > 0:
                        self.log_test("Content List Length", True, f"contents[] has {len(contents)} items (> 0)")
                    else:
                        self.log_test("Content List Length", False, "contents[] is empty (length = 0)")
                        return
                    
                    # Check DB total > 0
                    if total > 0:
                        self.log_test("Content DB Total", True, f"DB total is {total} (> 0)")
                    else:
                        self.log_test("Content DB Total", False, f"DB total is {total} (not > 0)")
                        return
                    
                    # Verify contents length matches expectation with total
                    if len(contents) <= total:
                        self.log_test("Content List vs Total", True, f"contents[] length ({len(contents)}) is consistent with total ({total})")
                    else:
                        self.log_test("Content List vs Total", False, f"contents[] length ({len(contents)}) exceeds total ({total})")
                    
                    # Check content structure
                    if len(contents) > 0:
                        sample_content = contents[0]
                        required_fields = ["id", "title", "poster_url", "content_type"]
                        missing_fields = [f for f in required_fields if f not in sample_content]
                        
                        if not missing_fields:
                            self.log_test("Content Structure", True, "Content items have required fields (id, title, poster_url, content_type)")
                        else:
                            self.log_test("Content Structure", False, f"Content missing fields: {missing_fields}")
                
                else:
                    missing_fields = []
                    if "contents" not in data:
                        missing_fields.append("contents")
                    if "total" not in data:
                        missing_fields.append("total")
                    self.log_test("Content Endpoint Structure", False, f"Response missing required fields: {missing_fields}", {"response": data})
            else:
                self.log_test("Content Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Content Endpoint", False, f"Exception: {str(e)}")
    
    def test_health_deep_endpoint(self):
        """Test GET /api/health/deep -> verify core_routes_ok true and content_count > 0"""
        try:
            response = self.make_request("GET", "/health/deep")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check core_routes_ok is true
                if "core_routes_ok" in data:
                    core_routes_ok = data["core_routes_ok"]
                    if core_routes_ok is True:
                        self.log_test("Core Routes OK", True, "core_routes_ok is true")
                    else:
                        self.log_test("Core Routes OK", False, f"core_routes_ok is {core_routes_ok} (not true)")
                        # Show which routes are failing
                        if "core_route_map" in data:
                            failing_routes = [route for route, status in data["core_route_map"].items() if not status]
                            if failing_routes:
                                print(f"   Failing routes: {failing_routes}")
                else:
                    self.log_test("Core Routes OK", False, "core_routes_ok field missing from response")
                
                # Check content_count > 0
                if "db" in data and "content_count" in data["db"]:
                    content_count = data["db"]["content_count"]
                    if content_count > 0:
                        self.log_test("Content Count", True, f"content_count is {content_count} (> 0)")
                    else:
                        self.log_test("Content Count", False, f"content_count is {content_count} (not > 0)")
                else:
                    self.log_test("Content Count", False, "content_count field missing from response")
                
                # Additional diagnostics
                if "status" in data:
                    status = data["status"]
                    if status == "ok":
                        self.log_test("Health Status", True, f"Overall health status is '{status}'")
                    else:
                        self.log_test("Health Status", False, f"Overall health status is '{status}' (not 'ok')")
                
                # Show available routes for debugging
                if "routes" in data:
                    routes = data["routes"]
                    print(f"   Available routes: {len(routes)} total")
                    
            else:
                self.log_test("Health Deep Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Health Deep Endpoint", False, f"Exception: {str(e)}")
    
    def test_featured_content_endpoint(self):
        """Test GET /api/content/featured -> returns array (>=1) if DB has data"""
        try:
            response = self.make_request("GET", "/content/featured")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response is an array
                if isinstance(data, list):
                    if len(data) >= 1:
                        self.log_test("Featured Content Array", True, f"Returns array with {len(data)} items (>= 1)")
                        
                        # Check structure of featured items
                        if len(data) > 0:
                            sample_item = data[0]
                            required_fields = ["id", "title", "poster_url", "content_type"]
                            missing_fields = [f for f in required_fields if f not in sample_item]
                            
                            if not missing_fields:
                                self.log_test("Featured Content Structure", True, "Featured items have required fields")
                            else:
                                self.log_test("Featured Content Structure", False, f"Featured items missing fields: {missing_fields}")
                    else:
                        self.log_test("Featured Content Array", False, f"Returns array with {len(data)} items (< 1)")
                else:
                    self.log_test("Featured Content Array", False, f"Response is not an array, got: {type(data)}", {"response": data})
            else:
                self.log_test("Featured Content Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Featured Content Endpoint", False, f"Exception: {str(e)}")
    
    def run_homepage_sanity_tests(self):
        """Run all homepage sanity tests"""
        print("🚀 Starting Homepage Sanity Backend Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: GET /api/content
        print("\n1️⃣ Testing GET /api/content")
        self.test_content_endpoint()
        
        # Test 2: GET /api/health/deep  
        print("\n2️⃣ Testing GET /api/health/deep")
        self.test_health_deep_endpoint()
        
        # Test 3: GET /api/content/featured
        print("\n3️⃣ Testing GET /api/content/featured")
        self.test_featured_content_endpoint()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 HOMEPAGE SANITY TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = [r for r in self.test_results if r["success"]]
        failed_tests = [r for r in self.test_results if not r["success"]]
        
        print(f"✅ PASSED: {len(passed_tests)}")
        print(f"❌ FAILED: {len(failed_tests)}")
        print(f"📈 SUCCESS RATE: {len(passed_tests)}/{len(self.test_results)} ({len(passed_tests)/len(self.test_results)*100:.1f}%)")
        
        if failed_tests:
            print("\n🔍 FAILED TESTS:")
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['message']}")
        
        return len(failed_tests) == 0

def main():
    """Main function"""
    tester = HomepageSanityTester()
    success = tester.run_homepage_sanity_tests()
    
    if success:
        print("\n🎉 All homepage sanity tests PASSED!")
        sys.exit(0)
    else:
        print("\n💥 Some homepage sanity tests FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()