import axios, { AxiosInstance } from 'axios';
import { ApiEnvelope } from '@/types/api';

export const createApiClient = (
  baseURL: string,
  authToken?: string
): AxiosInstance => {

  const isNode = typeof window === 'undefined';

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9,en-GB;q=0.8,de;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.78 Mobile Safari/537.36 FeatherPanel Mobile/1.0 (https://featherpanel.app)',
  };

  if (isNode && authToken) {
    headers['Cookie'] = `remember_token=${authToken}`;
  }

  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers,
    timeout: 15000,
  });

  client.interceptors.request.use(
    (config) => {
      const { url, method, headers, params, data } = config;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => {
      const { url, method, headers, params, data: reqData } = response.config;
      return response;
    },
    (error) => {
      const cfg = error.config || {};
      const { url, method, headers, params, data } = cfg;
      return Promise.reject(error);
    }
  );

  return client;
};

export const extractApiMessage = <T = unknown>(
  envelope: Partial<ApiEnvelope<T>>
): string | undefined => {
  if (!envelope) return undefined;

  const messageFromErrors =
    Array.isArray(envelope.errors) && envelope.errors.length > 0
      ? envelope.errors[0]?.detail || envelope.errors[0]?.status?.toString()
      : undefined;

  return envelope.error_message || envelope.message || messageFromErrors;
};

export const handleApiError = (error: any): string => {

  if (error.response) {
    const data = (error.response.data || {}) as Partial<ApiEnvelope<unknown>>;
    return extractApiMessage(data) || `Error: ${error.response.status}`;
  } else if (error.request) {
    if (error.code === 'ECONNABORTED') return 'Request timeout. Please try again.';
    if (error.code === 'ERR_NETWORK')
      return 'Network error. Please check your connection and instance URL.';
    return 'No response from server. Please check your connection.';
  } else {
    return error.message || 'An unexpected error occurred';
  }
};

export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};