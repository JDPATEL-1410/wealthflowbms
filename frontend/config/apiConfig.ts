// API Configuration for Production & Development
const isDevelopment = (import.meta as any).env?.DEV || false;
// PRODUCTION: Use empty string for relative paths
const PROD_API_URL = '';
const DEV_API_URL = 'http://localhost:3001';

// Use environment variable or fallback to auto-detection
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ||
    (isDevelopment ? DEV_API_URL : PROD_API_URL);

console.log('🌐 API Base URL:', API_BASE_URL || '(relative)');
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');

// API endpoints
export const API_ENDPOINTS = {
    data: `${API_BASE_URL}/api/data`,
    auth: `${API_BASE_URL}/api/auth`,
    users: `${API_BASE_URL}/api/users`,
};

// Helper function to build API URLs
export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
    const url = `${API_BASE_URL}${endpoint}`;

    if (params) {
        const searchParams = new URLSearchParams(params);
        return `${url}?${searchParams.toString()}`;
    }

    return url;
}

// Helper for authenticated fetch
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('wealthflow_token');
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    return fetch(url, { ...options, headers });
}

// Test API connection
export async function testApiConnection(): Promise<boolean> {
    try {
        console.log('🧪 Testing API connection to:', getApiUrl('/api/data', { type: 'team' }));
        const response = await authFetch(getApiUrl('/api/data', { type: 'team' }));
        console.log('✅ API connection test:', response.ok ? 'SUCCESS' : 'FAILED');
        return response.ok;
    } catch (error) {
        console.error('❌ API connection test failed:', error);
        return false;
    }
}
