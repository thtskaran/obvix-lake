// Base API client for support agent console

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export class ApiClient {
  private readonly baseURL: string;

  constructor(baseURL?: string) {
    const envBase = (import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
    const providedBase = (baseURL ?? envBase ?? '').replace(/\/$/, '');
    this.baseURL = providedBase;
  }

  private buildUrl(endpoint: string): string {
    const trimmedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!this.baseURL) {
      return trimmedEndpoint;
    }
    return `${this.baseURL}${trimmedEndpoint}`;
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers: HeadersInit = {
      Accept: 'application/json',
      ...(init?.headers || {}),
    };

    const response = await fetch(url, {
      ...init,
      headers,
    });

    let payload: unknown = null;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    const extractMessage = (data: unknown): string | undefined => {
      if (!data || typeof data !== 'object') {
        return undefined;
      }
      const record = data as Record<string, unknown>;
      const messageCandidate = record.message ?? record.error;
      return typeof messageCandidate === 'string' ? messageCandidate : undefined;
    };

    if (!response.ok) {
      const errorMessage = extractMessage(payload) ?? response.statusText ?? 'Request failed';
      const error = new Error(errorMessage);
      (error as Error & { status?: number; data?: unknown }).status = response.status;
      (error as Error & { status?: number; data?: unknown }).data = payload;
      throw error;
    }

    return {
      data: (payload as T) ?? (undefined as T),
      status: response.status,
      message: extractMessage(payload),
    };
  }

  async get<T>(endpoint: string, init?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...init,
    });
  }

  async post<T, U = unknown>(endpoint: string, data?: U, init?: RequestInit): Promise<ApiResponse<T>> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });
  }

  async put<T, U = unknown>(endpoint: string, data?: U, init?: RequestInit): Promise<ApiResponse<T>> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });
  }

  async delete<T>(endpoint: string, init?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...init,
    });
  }
}

export const apiClient = new ApiClient();