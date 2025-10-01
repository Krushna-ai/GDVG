import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BulkImport = ({ darkTheme, onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // New state for job tracking and history
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'history'
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);

  // Sample data for quick template generation
  const sampleData = [
    {
      title: "Squid Game",
      original_title: "오징어 게임",
      synopsis: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games for a tempting prize.",
      year: 2021,
      country: "South Korea",
      content_type: "series",
      genres: "thriller,drama,mystery",
      rating: 8.0,
      episodes: 9,
      duration: 60,
      cast: "Lee Jung-jae,Park Hae-soo,Wi Ha-jun",
      crew: "Hwang Dong-hyuk (Director)",
      streaming_platforms: "Netflix",
      tags: "survival,psychological,korean",
      poster_url: "",
      banner_url: ""
    }
  ];

  // Fetch import history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportHistory();
    }
  }, [activeTab, historyPage]);

  // Poll for job progress when there's an active job
  useEffect(() => {
    if (currentJobId && uploading) {
      const interval = setInterval(() => {
        fetchJobProgress(currentJobId);
      }, 2000); // Poll every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentJobId, uploading]);

  const fetchImportHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API}/admin/bulk-import/jobs?page=${historyPage}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setImportHistory(response.data.jobs || []);
      setHistoryTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch import history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchJobProgress = async (jobId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API}/admin/bulk-import/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const job = response.data;
      setJobProgress(job);
      
      // If job is completed or failed, stop polling
      if (job.status === 'completed' || job.status === 'failed') {
        setUploading(false);
        setImportResult({
          success: job.successful_imports > 0,
          total_rows: job.total_rows,
          successful_imports: job.successful_imports,
          failed_imports: job.failed_imports,
          errors: job.errors || [],
          imported_content: []
        });
        setCurrentJobId(null);
        setJobProgress(null);
        if (onImportComplete) onImportComplete();
      }
    } catch (error) {
      console.error('Failed to fetch job progress:', error);
    }
  };

  const viewJobDetails = async (jobId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API}/admin/bulk-import/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedJobDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      alert('Failed to load job details');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                       'application/vnd.ms-excel', 'text/csv'];
    
    if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setSelectedFile(file);
      setImportResult(null);
      setPreviewData(null);
      setConfirmOpen(false);
    } else {
      alert('Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const uploadFileToServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('admin_token');
    const response = await axios.post(`${API}/admin/bulk-import`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  };

  const previewFileOnServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('admin_token');
    const response = await axios.post(`${API}/admin/bulk-import/preview`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  };

  const previewUrlOnServer = async (url) => {
    const token = localStorage.getItem('admin_token');
    const response = await axios.post(`${API}/admin/bulk-import/preview-url`, { csv_url: url }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  };

  const importUrlOnServer = async (url) => {
    const token = localStorage.getItem('admin_token');
    const response = await axios.post(`${API}/admin/bulk-import/from-url`, { csv_url: url }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  };

  const handleUpload = async () => {
    if (!selectedFile && !googleSheetUrl) {
      alert('Please select a file or provide a Google Sheets CSV link');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      if (googleSheetUrl) {
        // Server-side preview to avoid browser CORS
        const preview = await previewUrlOnServer(googleSheetUrl);
        setPreviewData(preview);
        setConfirmOpen(true);
      } else {
        const preview = await previewFileOnServer(selectedFile);
        setPreviewData(preview);
        setConfirmOpen(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setImportResult({
        success: false,
        total_rows: 0,
        successful_imports: 0,
        failed_imports: 0,
        errors: [error.response?.data?.detail || 'Preview failed'],
        imported_content: []
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmImport = async () => {
    if (!selectedFile && !googleSheetUrl) return;
    setUploading(true);
    setImportResult(null);
    setJobProgress(null);
    
    try {
      let result;
      if (googleSheetUrl) {
        result = await importUrlOnServer(googleSheetUrl);
      } else {
        result = await uploadFileToServer(selectedFile);
      }
      setConfirmOpen(false);
      setPreviewData(null);
      
      // Start polling for job progress
      // The backend returns BulkImportResult immediately, but we need to fetch jobs to get the job_id
      // Since the import just completed, the most recent job should be ours
      setTimeout(async () => {
        try {
          const token = localStorage.getItem('admin_token');
          const jobsResponse = await axios.get(`${API}/admin/bulk-import/jobs?page=1&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (jobsResponse.data.jobs && jobsResponse.data.jobs.length > 0) {
            const latestJob = jobsResponse.data.jobs[0];
            setCurrentJobId(latestJob.id);
            setJobProgress(latestJob);
          }
        } catch (error) {
          console.error('Failed to fetch latest job:', error);
          // Fallback to showing immediate result
          setImportResult(result);
          setUploading(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Upload error:', error);
      setImportResult({
        success: false,
        total_rows: 0,
        successful_imports: 0,
        failed_imports: 0,
        errors: [error.response?.data?.detail || 'Upload failed'],
        imported_content: []
      });
      setUploading(false);
    }
  };

  const importFromGoogleSheet = async () => {
    // This button now just triggers the same Preview & Import flow using the URL
    if (!googleSheetUrl || !googleSheetUrl.startsWith('http')) {
      alert('Please paste a valid public Google Sheets CSV export URL');
      return;
    }
    await handleUpload();
  };

  const downloadTemplate = (withSamples = false) => {
    const headers = [
      'title', 'original_title', 'synopsis', 'year', 'country', 'content_type',
      'genres', 'rating', 'episodes', 'duration', 'cast', 'crew', 
      'streaming_platforms', 'tags', 'poster_url', 'banner_url'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    if (withSamples) {
      sampleData.forEach(row => {
        const csvRow = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
        csvContent += csvRow + '\n';
      });
    } else {
      // Add empty row for template structure
      csvContent += headers.map(() => '""').join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', withSamples ? 'content_template_with_samples.csv' : 'content_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setImportResult(null);
    setGoogleSheetUrl('');
    setPreviewData(null);
    setConfirmOpen(false);
    const input = document.getElementById('file-input');
    if (input) input.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={`text-xl font-bold ${
          darkTheme ? 'text-white' : 'text-gray-900'
        }`}>
          Bulk Import Content
        </h3>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            darkTheme
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showTemplate ? 'Hide' : 'Show'} Instructions
        </button>
      </div>

      {/* Instructions */}
      {showTemplate && (
        <div className={`p-6 rounded-xl border ${
          darkTheme 
            ? 'bg-gray-900 border-red-900/50' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h4 className={`font-semibold mb-4 ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            Bulk Import Instructions
          </h4>
          
          <div className="space-y-4">
            <div>
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Supported Sources:
              </h5>
              <ul className={`list-disc list-inside text-sm space-y-1 ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li>Excel files (.xlsx, .xls)</li>
                <li>CSV files (.csv)</li>
                <li>Google Sheets public CSV link (File → Share → Anyone with link → Use export?format=csv URL)</li>
              </ul>
            </div>

            <div>
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Required Columns:
              </h5>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  title
                </code>
                <span className="ml-2">All other columns are optional; missing values will be treated as N.A or sensible defaults.</span>
              </div>
            </div>

            <div>
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Optional Columns:
              </h5>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                  original_title, synopsis, year, country, content_type, genres, rating, episodes, duration, cast, crew, streaming_platforms, tags, poster_url, banner_url
                </code>
              </div>
            </div>

            <div>
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Notes:
              </h5>
              <ul className={`list-disc list-inside text-sm space-y-1 ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li>Missing or invalid numbers (year, episodes, duration, rating) will be skipped or set to defaults.</li>
                <li>Unknown content_type defaults to "drama".</li>
                <li>Missing country/synopsis will be set to "N.A".</li>
                <li>Genres can be comma-separated; unrecognized genres are ignored.</li>
              </ul>
            </div>

            <button
              onClick={() => downloadTemplate(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
            >
              Download Sample Template
            </button>
          </div>
        </div>
      )}

      {/* Google Sheets Import */}
      <div className={`p-4 rounded-xl border ${darkTheme ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <label className={`block text-sm font-medium mb-2 ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
          Google Sheets CSV Link (public)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <button
            type="button"
            onClick={importFromGoogleSheet}
            disabled={uploading}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50"
          >
            Preview from Link
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-xl transition-colors ${
          darkTheme
            ? `${dragOver ? 'border-red-600' : 'border-gray-700'} bg-gray-900`
            : `${dragOver ? 'border-red-500' : 'border-gray-300'} bg-gray-50`
        }`}
      >
        <div className="text-center">
          <svg className={`mx-auto h-12 w-12 mb-4 ${
            darkTheme ? 'text-gray-600' : 'text-gray-400'
          }`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <label
            htmlFor="file-input"
            className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200`}
          >
            Choose File
          </label>
          
          {selectedFile && (
            <div className="mt-4">
              <p className={`text-sm ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Selected: <span className="font-medium">{selectedFile.name}</span>
              </p>
              <p className={`text-xs ${
                darkTheme ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Size: {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {(selectedFile || googleSheetUrl) && (
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            ) : (
              'Preview & Import'
            )}
          </button>
          
          <button
            onClick={resetUpload}
            disabled={uploading}
            className={`px-6 py-3 rounded-lg transition-colors disabled:opacity-50 ${
              darkTheme
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Reset
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={`w-full max-w-4xl rounded-xl shadow-xl ${darkTheme ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className={`text-lg font-semibold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>Confirm Import</h4>
              <button onClick={() => setConfirmOpen(false)} className={`${darkTheme ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>✕</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-lg`}>
                  <div className="text-sm">Total Rows</div>
                  <div className="text-2xl font-bold">{previewData.total_rows}</div>
                </div>
                <div className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-lg`}>
                  <div className="text-sm">Will Import</div>
                  <div className="text-2xl font-bold text-green-600">{previewData.will_import}</div>
                </div>
                <div className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-lg`}>
                  <div className="text-sm">Will Skip</div>
                  <div className="text-2xl font-bold text-red-600">{previewData.will_skip}</div>
                </div>
                <div className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-lg`}>
                  <div className="text-sm">Detected Columns</div>
                  <div className="text-xs break-words">{previewData.detected_columns.join(', ')}</div>
                </div>
              </div>
              <div className="mb-2 font-medium">Preview (first 50 rows)</div>
              <div className="overflow-x-auto">
                <table className={`min-w-full text-sm ${darkTheme ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <tr>
                      {['Row','Title','Year','Country','Type','Rating','Genres','Episodes','Valid','Issues'].map(h => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((r, idx) => (
                      <tr key={idx} className={`${r.valid ? '' : 'bg-red-50/30'}`}>
                        <td className="px-3 py-2">{r.row}</td>
                        <td className="px-3 py-2">{r.title}</td>
                        <td className="px-3 py-2">{r.year ?? 'N.A'}</td>
                        <td className="px-3 py-2">{r.country}</td>
                        <td className="px-3 py-2 uppercase">{r.content_type}</td>
                        <td className="px-3 py-2">{typeof r.rating === 'number' ? r.rating.toFixed(1) : (r.rating || '0.0')}</td>
                        <td className="px-3 py-2">{r.genres}</td>
                        <td className="px-3 py-2">{r.episodes ?? 'N.A'}</td>
                        <td className="px-3 py-2">{r.valid ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{(r.issues || []).join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className={`${darkTheme ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} px-4 py-2 rounded-lg`}>Cancel</button>
              <button onClick={confirmImport} className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800">Confirm Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className={`p-6 rounded-xl border ${
          importResult.success
            ? (darkTheme ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200')
            : (darkTheme ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')
        }`}>
          <div className="flex items-center mb-4">
            {importResult.success ? (
              <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <h4 className={`font-semibold ${
              importResult.success 
                ? 'text-green-800' 
                : 'text-red-800'
            }`}>
              Import {importResult.success ? 'Completed' : 'Failed'}
            </h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`text-center p-3 rounded-lg ${
              darkTheme ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className={`text-2xl font-bold ${
                darkTheme ? 'text-white' : 'text-gray-900'
              }`}>
                {importResult.total_rows}
              </div>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Rows
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              darkTheme ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="text-2xl font-bold text-green-600">
                {importResult.successful_imports}
              </div>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Imported
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              darkTheme ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="text-2xl font-bold text-red-600">
                {importResult.failed_imports}
              </div>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Failed
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              darkTheme ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className={`text-2xl font-bold ${
                importResult.successful_imports > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {importResult.total_rows > 0 ? Math.round((importResult.successful_imports / importResult.total_rows) * 100) : 0}%
              </div>
              <div className={`text-sm ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Success Rate
              </div>
            </div>
          </div>

          {/* Successfully Imported Content */}
          {importResult.imported_content.length > 0 && (
            <div className="mb-4">
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-green-300' : 'text-green-800'
              }`}>
                Successfully Imported:
              </h5>
              <div className="max-h-32 overflow-y-auto">
                <ul className={`text-sm space-y-1 ${
                  darkTheme ? 'text-green-200' : 'text-green-700'
                }`}>
                  {importResult.imported_content.map((content, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {content}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div>
              <h5 className={`font-medium mb-2 ${
                darkTheme ? 'text-red-300' : 'text-red-800'
              }`}>
                Errors:
              </h5>
              <div className="max-h-32 overflow-y-auto">
                <ul className={`text-sm space-y-1 ${
                  darkTheme ? 'text-red-200' : 'text-red-700'
                }`}>
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-4 w-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkImport;