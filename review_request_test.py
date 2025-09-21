#!/usr/bin/env python3
"""
Review Request Backend Testing for Global Drama Verse Guide
Specific testing for the review request endpoints:
1. GET {REACT_APP_BACKEND_URL}/api/health -> expect 200
2. GET /api/content -> capture total and list length
3. If contents are 0, do: POST /api/admin/login with {username:'admin', password:'admin123'} -> get token; 
   then POST /api/admin/bulk-import/from-url with body {csv_url:'https://customer-assets.emergentagent.com/job_dramaguide/artifacts/19m2njd2_Top_Drama199.csv'} using Bearer token
4. After import, GET /api/content again -> confirm > 0
5. Return exact HTTP responses, including errors if any
"""

import requests
import json
import sys
from typing import Dict, Any, List
import time

# Get backend URL from frontend .env
BACKEND_URL = "https://routefix-drama.preview.emergentagent.com/api"

class ReviewRequestTester:
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
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
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
            if 'json' in kwargs:
                print(f"Request body: {json.dumps(kwargs['json'], indent=2)}")
            response = requests.request(method, url, timeout=30, **kwargs)
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text[:500]}...")
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_endpoint(self):
        """Test 1: GET /api/health -> expect 200"""
        try:
            response = self.make_request("GET", "/health")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "status" in data and data["status"] == "ok":
                        self.log_test("Health Endpoint", True, "Health endpoint returned 200 with status: ok", {"response": data})
                    else:
                        self.log_test("Health Endpoint", True, f"Health endpoint returned 200", {"response": data})
                except json.JSONDecodeError:
                    self.log_test("Health Endpoint", True, f"Health endpoint returned 200", {"response": response.text})
            else:
                self.log_test("Health Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_test("Health Endpoint", False, f"Exception: {str(e)}")
    
    def test_content_list_endpoint(self):
        """Test 2: GET /api/content -> capture total and list length"""
        try:
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        # Direct list response
                        content_count = len(data)
                        self.log_test("Content List Endpoint", True, f"Retrieved {content_count} content items (direct list)", {"total": content_count, "list_length": content_count})
                        return content_count
                    elif isinstance(data, dict) and "contents" in data:
                        # Paginated response
                        contents = data["contents"]
                        total = data.get("total", len(contents))
                        content_count = len(contents)
                        self.log_test("Content List Endpoint", True, f"Retrieved {content_count} content items (total: {total})", {"total": total, "list_length": content_count})
                        return total
                    else:
                        self.log_test("Content List Endpoint", False, "Unexpected response format", {"response": data})
                        return 0
                except json.JSONDecodeError:
                    self.log_test("Content List Endpoint", False, "Invalid JSON response", {"response": response.text})
                    return 0
            else:
                self.log_test("Content List Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                return 0
                
        except Exception as e:
            self.log_test("Content List Endpoint", False, f"Exception: {str(e)}")
            return 0
    
    def test_admin_login(self):
        """Test 3a: POST /api/admin/login with {username:'admin', password:'admin123'} -> get token"""
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
                        self.log_test("Admin Login", True, "Successfully authenticated admin and obtained token", {"token_type": data.get("token_type", "bearer")})
                        return True
                    else:
                        self.log_test("Admin Login", False, "No access_token in response", {"response": data})
                        return False
                except json.JSONDecodeError:
                    self.log_test("Admin Login", False, "Invalid JSON response", {"response": response.text})
                    return False
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_bulk_import_from_url(self):
        """Test 3b: POST /api/admin/bulk-import/from-url with CSV URL using Bearer token"""
        if not self.admin_token:
            self.log_test("Bulk Import from URL", False, "No admin token available")
            return False
            
        try:
            import_data = {
                "csv_url": "https://customer-assets.emergentagent.com/job_dramaguide/artifacts/19m2njd2_Top_Drama199.csv"
            }
            
            response = self.make_request("POST", "/admin/bulk-import/from-url", json=import_data)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "successful_imports" in data:
                        successful_imports = data["successful_imports"]
                        total_rows = data.get("total_rows", 0)
                        self.log_test("Bulk Import from URL", True, f"Successfully imported {successful_imports} items from {total_rows} rows", {"response": data})
                        return successful_imports > 0
                    else:
                        self.log_test("Bulk Import from URL", True, "Import completed", {"response": data})
                        return True
                except json.JSONDecodeError:
                    self.log_test("Bulk Import from URL", False, "Invalid JSON response", {"response": response.text})
                    return False
            else:
                self.log_test("Bulk Import from URL", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Bulk Import from URL", False, f"Exception: {str(e)}")
            return False
    
    def test_content_list_after_import(self):
        """Test 4: GET /api/content again -> confirm > 0"""
        try:
            response = self.make_request("GET", "/content")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        # Direct list response
                        content_count = len(data)
                        if content_count > 0:
                            self.log_test("Content List After Import", True, f"Confirmed {content_count} content items after import", {"total": content_count, "list_length": content_count})
                            return True
                        else:
                            self.log_test("Content List After Import", False, "No content items found after import", {"total": content_count, "list_length": content_count})
                            return False
                    elif isinstance(data, dict) and "contents" in data:
                        # Paginated response
                        contents = data["contents"]
                        total = data.get("total", len(contents))
                        content_count = len(contents)
                        if total > 0:
                            self.log_test("Content List After Import", True, f"Confirmed {content_count} content items (total: {total}) after import", {"total": total, "list_length": content_count})
                            return True
                        else:
                            self.log_test("Content List After Import", False, "No content items found after import", {"total": total, "list_length": content_count})
                            return False
                    else:
                        self.log_test("Content List After Import", False, "Unexpected response format", {"response": data})
                        return False
                except json.JSONDecodeError:
                    self.log_test("Content List After Import", False, "Invalid JSON response", {"response": response.text})
                    return False
            else:
                self.log_test("Content List After Import", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Content List After Import", False, f"Exception: {str(e)}")
            return False
    
    def run_review_request_tests(self):
        """Run all review request tests in sequence"""
        print("=" * 80)
        print("REVIEW REQUEST BACKEND TESTING - STARTING")
        print("=" * 80)
        
        # Test 1: Health endpoint
        self.test_health_endpoint()
        
        # Test 2: Get content list and check count
        initial_content_count = self.test_content_list_endpoint()
        
        # Test 3: If no content, do admin login and bulk import
        if initial_content_count == 0:
            print("\nNo content found, proceeding with admin login and bulk import...")
            
            # Test 3a: Admin login
            login_success = self.test_admin_login()
            
            if login_success:
                # Test 3b: Bulk import from URL
                import_success = self.test_bulk_import_from_url()
                
                if import_success:
                    # Test 4: Check content list again
                    self.test_content_list_after_import()
                else:
                    self.log_test("Review Request Flow", False, "Bulk import failed, cannot verify content after import")
            else:
                self.log_test("Review Request Flow", False, "Admin login failed, cannot proceed with bulk import")
        else:
            print(f"\nContent already exists ({initial_content_count} items), skipping import process...")
            self.log_test("Review Request Flow", True, f"Content already available ({initial_content_count} items), no import needed")
        
        # Summary
        print("\n" + "=" * 80)
        print("REVIEW REQUEST TESTING SUMMARY")
        print("=" * 80)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Tests passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return success_rate == 100.0

def main():
    """Main function to run review request tests"""
    tester = ReviewRequestTester()
    success = tester.run_review_request_tests()
    
    if success:
        print("\n🎉 ALL REVIEW REQUEST TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME REVIEW REQUEST TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()