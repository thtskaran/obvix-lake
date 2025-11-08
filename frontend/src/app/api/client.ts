// Base API client for support agent console

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  // TODO: Implement HTTP methods with proper error handling
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    throw new Error('API client not implemented yet');
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    throw new Error('API client not implemented yet');
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    throw new Error('API client not implemented yet');
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    throw new Error('API client not implemented yet');
  }
}

export const apiClient = new ApiClient();