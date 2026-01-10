// API Configuration for Production & Development

const isDevelopment = (import.meta as any).env?.DEV || false;

// Production: use relative paths so frontend and backend work on same domain (Render)
const PROD_API_URL = '';
const DEV_API_URL = 'http://localhost:3001';

// Use environment variable override if provided
export const API_BASE_URL =
    (import.meta as any).env?.VITE_API_URL || (isDevelopment ? DEV_API_URL : PROD_API_URL);

console.log('🌐 API Base URL:', API_BASE_URL || '(relative)');
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');

// API endpoints
export const API_ENDPOINTS = {
    data: `${API_BASE_URL}/api/data`,
    auth: `${API_BASE_URL}/api/auth`,
    users: `${API_BASE_URL}/api/users`
};

// Helper to build API URLs
export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
    const url = `${API_BASE_URL}${endpoint}`;

    if (params) {
        const searchParams = new URLSearchParams(params);
        return `${url}?${searchParams.toString()}`;
    }

    return url;
}

// Helper for authenticated fetch
export async function authFetch(endpointOrUrl: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('wealthflow_token');

    const isAbsolute = /^https?:\/\//i.test(endpointOrUrl);
    const url = isAbsolute ? endpointOrUrl : getApiUrl(endpointOrUrl);

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined)
    };

    // Attach JWT if present
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set JSON content-type when body is plain object/string.
    // If body is FormData, browser sets correct boundary automatically.
    const body = (options as any).body;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(url, { ...options, headers });
}

// Test API connection
export async function testApiConnection(): Promise<boolean> {
    try {
        const testUrl = getApiUrl('/api/data', { type: 'team' });
        console.log('🧪 Testing API connection to:', testUrl);

        const response = await authFetch('/api/data?type=team');
        console.log('✅ API connection test:', response.ok ? 'SUCCESS' : 'FAILED');

        return response.ok;
    } catch (error) {
        console.error('❌ API connection test failed:', error);
        return false;
    }
}
