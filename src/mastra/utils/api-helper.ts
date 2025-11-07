// API Configuration
const API_BASE_URL = process.env.MEDICAL_API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.MEDICAL_API_KEY || '';

// Ensure API base URL ends with /api-ia or append it
const getBaseUrl = (): string => {
  if (API_BASE_URL.includes('/api-ia')) {
    return API_BASE_URL;
  }
  return `${API_BASE_URL}/api-ia`;
};

// Convert object to URL-encoded form data
const toFormData = (data: Record<string, string | number | boolean>): string => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

// Helper function for API calls with form-data support
export async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, string | number | boolean> | FormData,
  useJson: boolean = false
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers: HeadersInit = {};
  
  // Determine content type
  if (body instanceof FormData) {
    // FormData sets Content-Type automatically with boundary
    // Don't set Content-Type header for FormData
  } else if (useJson && body) {
    headers['Content-Type'] = 'application/json';
  } else if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  
  // Add authentication
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  
  // Prepare request body
  let requestBody: string | FormData | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (useJson && body) {
    requestBody = JSON.stringify(body);
  } else if (body) {
    requestBody = toFormData(body);
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });
  
  // Handle different status codes
  if (response.status === 207) {
    // Partial success - product created but with warnings
    const data = await response.json().catch(() => ({}));
    return data as T;
  }
  
  if (!response.ok) {
    let errorMessage = response.statusText;
    let errorData: any = {};
    
    try {
      const errorJson = await response.json();
      errorData = errorJson;
      
      // Extract message from common error response formats
      if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
      } else if (typeof errorJson === 'string') {
        errorMessage = errorJson;
      }
    } catch {
      // If response is not JSON, use status text
    }
    
    // Create specific error messages based on status code
    switch (response.status) {
      case 400:
        throw new Error(`Bad Request: ${errorMessage || 'Invalid data provided'}`);
      case 401:
        throw new Error(`Unauthorized: ${errorMessage || 'Invalid or missing authentication token'}`);
      case 500:
        throw new Error(`Internal Server Error: ${errorMessage || 'Server error occurred'}`);
      default:
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    return (text || {}) as T;
  }
  
  return response.json();
}







