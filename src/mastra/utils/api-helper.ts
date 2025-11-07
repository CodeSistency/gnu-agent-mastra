import type { ApiErrorResponse, ApiResponse } from '../types/api-responses';
import { ApiError } from './api-error';

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

/**
 * Extrae el mensaje de error de la respuesta de la API con prioridad
 * Prioridad: meta.message > message > error > statusText
 */
const extractErrorMessage = (errorJson: any, statusText: string, endpoint: string): string => {
  // Prioridad 1: meta.message (estructura específica de GNU Health API)
  // La API GNU Health siempre devuelve el mensaje real en meta.message
  if (errorJson?.meta?.message) {
    console.log('🔵 [extractErrorMessage] Usando meta.message:', errorJson.meta.message);
    return errorJson.meta.message;
  }
  
  // Prioridad 2: message directo
  if (errorJson?.message) {
    console.log('🔵 [extractErrorMessage] Usando message:', errorJson.message);
    return errorJson.message;
  }
  
  // Prioridad 3: error directo
  if (errorJson?.error) {
    console.log('🔵 [extractErrorMessage] Usando error:', errorJson.error);
    return errorJson.error;
  }
  
  // Prioridad 4: Si es string directamente
  if (typeof errorJson === 'string') {
    console.log('🔵 [extractErrorMessage] Usando errorJson como string');
    return errorJson;
  }
  
  // Fallback: statusText con contexto del endpoint
  console.log('🔵 [extractErrorMessage] Usando statusText como fallback');
  return statusText;
};

// Helper function for API calls with form-data support
export async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, string | number | boolean> | FormData,
  useJson: boolean = false
): Promise<T> {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${endpoint}`;
  
  console.log('🔵 [apiCall] Iniciando llamada API');
  console.log('🔵 [apiCall] Endpoint:', endpoint);
  console.log('🔵 [apiCall] Method:', method);
  console.log('🔵 [apiCall] Base URL:', baseUrl);
  console.log('🔵 [apiCall] Body recibido:', body);
  
  const headers: HeadersInit = {};
  
  // For GET and HEAD requests, convert body to query parameters
  let requestBody: string | FormData | undefined;
  
  if (method === 'GET') {
    // GET/HEAD requests cannot have body, use query parameters instead
    if (body && !(body instanceof FormData)) {
      const params = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
      console.log('🔵 [apiCall] GET: Parámetros convertidos a query string:', queryString);
    }
    // No body for GET/HEAD requests
    requestBody = undefined;
  } else {
    // For POST, PUT, DELETE: determine content type and prepare body
    if (body instanceof FormData) {
      // FormData sets Content-Type automatically with boundary
      // Don't set Content-Type header for FormData
      requestBody = body;
      console.log('🔵 [apiCall] Usando FormData como body');
    } else if (useJson && body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
      console.log('🔵 [apiCall] Usando JSON como body:', requestBody);
    } else if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = toFormData(body);
      console.log('🔵 [apiCall] Usando form-urlencoded como body:', requestBody);
    }
  }
  
  // Add authentication
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
    console.log('🔵 [apiCall] API Key presente:', API_KEY ? 'Sí' : 'No');
  } else {
    console.log('⚠️ [apiCall] API Key NO configurada');
  }
  
  console.log('🔵 [apiCall] URL final:', url);
  console.log('🔵 [apiCall] Headers:', JSON.stringify(headers, null, 2));
  console.log('🔵 [apiCall] Request body:', requestBody);
  
  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });
  
  console.log('🟢 [apiCall] Response status:', response.status);
  console.log('🟢 [apiCall] Response statusText:', response.statusText);
  
  // Handle different status codes
  if (response.status === 207) {
    // Partial success - product created but with warnings
    const data = await response.json().catch(() => ({}));
    return data as T;
  }
  
  if (!response.ok) {
    let errorMessage = response.statusText;
    let errorData: ApiErrorResponse | any = {};
    let responseText = '';
    
    try {
      responseText = await response.text();
      console.log('🔴 [apiCall] Error response text:', responseText);
      
      if (responseText) {
        try {
          const errorJson = JSON.parse(responseText) as ApiErrorResponse | any;
          errorData = errorJson;
          console.log('🔴 [apiCall] Error response JSON:', JSON.stringify(errorJson, null, 2));
          
          // Extraer mensaje usando la función helper con prioridad correcta
          errorMessage = extractErrorMessage(errorJson, response.statusText, endpoint);
        } catch {
          // If response is not JSON, use as text
          errorMessage = responseText;
        }
      }
    } catch (e) {
      console.log('🔴 [apiCall] Error al leer respuesta:', e);
    }
    
    console.log('🔴 [apiCall] Error final:', {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      errorData,
      responseText,
      endpoint,
    });
    
    // Crear error personalizado con toda la información de la API
    // Esto permite que el agente reciba toda la información necesaria para comunicar el error
    const apiError = new ApiError(
      errorMessage || `Error de API (${response.status})`,
      response.status,
      errorData,
      endpoint,
      method,
      body && !(body instanceof FormData) ? body as Record<string, any> : undefined
    );

    console.log('🔴 [apiCall] Lanzando ApiError con información completa:', {
      statusCode: apiError.statusCode,
      apiMessage: apiError.getApiMessage(),
      endpoint: apiError.endpoint,
      method: apiError.method,
    });

    throw apiError;
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    return (text || {}) as T;
  }
  
  return response.json();
}







