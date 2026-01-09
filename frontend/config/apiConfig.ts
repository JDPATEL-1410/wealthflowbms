// API Configuration
// This ensures the frontend can connect to the backend in all environments

// Get API URL from environment variable or use default
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

// API endpoints
export const API_ENDPOINTS = {
    data: `${API_BASE_URL}/api/data`,
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

// Test API connection
export async function testApiConnection(): Promise<boolean> {
    try {
        const response = await fetch(getApiUrl('/api/data', { type: 'team' }));
        return response.ok;
    } catch (error) {
        console.error('API connection test failed:', error);
        return false;
    }
}
