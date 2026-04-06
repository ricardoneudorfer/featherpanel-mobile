import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  SessionResponse,
  ApiEnvelope,
} from '@/types/api';
import { createApiClient, handleApiError } from '@/lib/api';

interface SavedInstance {
  id: string;
  name: string;
  url: string;
}

interface TwoFactorData {
  email: string;
}

interface AppState {
  instanceUrl: string | null;
  authToken: string | null;
  user: User | null;
  isLoading: boolean;
  savedInstances: SavedInstance[];
}

const STORAGE_KEYS = {
  INSTANCE_URL: 'featherpanel_instance_url',
  AUTH_TOKEN: 'featherpanel_auth_token',
  USER: 'featherpanel_user',
  SAVED_INSTANCES: 'featherpanel_saved_instances',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [state, setState] = useState<AppState>({
    instanceUrl: null,
    authToken: null,
    user: null,
    isLoading: true,
    savedInstances: [],
  });

  const [apiClient, setApiClient] = useState<AxiosInstance | null>(null);
  const queryClient = useQueryClient();
  const sessionIntervalRef = useRef<NodeJS.Timeout>();
  const instanceUrlRef = useRef<string | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const loadStorageDirectly = async () => {
      try {
        const [instanceUrl, authToken, userStr, savedInstancesStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.INSTANCE_URL),
          AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.SAVED_INSTANCES),
        ]);

        const user = userStr ? (JSON.parse(userStr) as User) : null;
        const savedInstances = savedInstancesStr ? (JSON.parse(savedInstancesStr) as SavedInstance[]) : [];

        setState({
          instanceUrl: instanceUrl || null,
          authToken: authToken || null,
          user: user,
          isLoading: false,
          savedInstances: savedInstances || [],
        });

        instanceUrlRef.current = instanceUrl || null;
        authTokenRef.current = authToken || null;
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to load storage:', error);
        setState({
          instanceUrl: null,
          authToken: null,
          user: null,
          isLoading: false,
          savedInstances: [],
        });
        isInitializedRef.current = true;
      }
    };

    loadStorageDirectly();
  }, []);

  const setInstanceUrl = useCallback(async (url: string) => {
    let cleanUrl = url.trim();

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    cleanUrl = cleanUrl.replace(/\/$/, '');

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INSTANCE_URL, cleanUrl);
      setState((prev) => ({ ...prev, instanceUrl: cleanUrl }));
      instanceUrlRef.current = cleanUrl;
    } catch (error) {
      console.error('Failed to save instance URL:', error);
      throw error;
    }
  }, []);

  const setAuth = useCallback(async (cookieHeader: string, user: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, cookieHeader),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);
      setState((prev) => ({ ...prev, authToken: cookieHeader, user }));
      authTokenRef.current = cookieHeader;
    } catch (error) {
      console.error('Failed to save auth:', error);
      throw error;
    }
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      setState((prev) => ({ ...prev, authToken: null, user: null }));
      authTokenRef.current = null;
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.INSTANCE_URL,
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      setState({
        instanceUrl: null,
        authToken: null,
        user: null,
        isLoading: false,
        savedInstances: state.savedInstances,
      });
      instanceUrlRef.current = null;
      authTokenRef.current = null;
    } catch (error) {
      console.error('Failed to clear all:', error);
    }
  }, [state.savedInstances]);

  const saveInstance = useCallback(async (name: string, url: string) => {
    let cleanUrl = url.trim();

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    cleanUrl = cleanUrl.replace(/\/$/, '');

    const newInstance: SavedInstance = {
      id: Date.now().toString(),
      name,
      url: cleanUrl,
    };

    try {
      const existingInstances = state.savedInstances || [];
      const updatedInstances = [...existingInstances, newInstance];
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_INSTANCES, JSON.stringify(updatedInstances));
      setState((prev) => ({ ...prev, savedInstances: updatedInstances }));
    } catch (error) {
      console.error('Failed to save instance:', error);
      throw error;
    }
  }, [state.savedInstances]);

  const deleteInstance = useCallback(async (id: string) => {
    try {
      const updatedInstances = state.savedInstances.filter((instance) => instance.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_INSTANCES, JSON.stringify(updatedInstances));
      setState((prev) => ({ ...prev, savedInstances: updatedInstances }));
    } catch (error) {
      console.error('Failed to delete instance:', error);
      throw error;
    }
  }, [state.savedInstances]);

  const updateInstance = useCallback(
    async (id: string, name: string, url: string): Promise<void> => {
      const instance = state.savedInstances.find((inst) => inst.id === id);
      if (!instance) {
        throw new Error('Instance not found');
      }

      let cleanUrl = url.trim();

      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      cleanUrl = cleanUrl.replace(/\/$/, '');

      const updatedInstance: SavedInstance = {
        id,
        name: name.trim(),
        url: cleanUrl,
      };

      try {
        const updatedInstances = state.savedInstances.map((inst) => (inst.id === id ? updatedInstance : inst));
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_INSTANCES, JSON.stringify(updatedInstances));
        setState((prev) => ({ ...prev, savedInstances: updatedInstances }));
      } catch (error) {
        console.error('Failed to update instance:', error);
        throw error;
      }
    },
    [state.savedInstances]
  );

  const selectInstance = useCallback(async (instance: SavedInstance) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INSTANCE_URL, instance.url);
      setState((prev) => ({ ...prev, instanceUrl: instance.url }));
      instanceUrlRef.current = instance.url;
    } catch (error) {
      console.error('Failed to select instance:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (state.instanceUrl) {
      const cleanUrl = state.instanceUrl.replace(/\/$/, '');

      const client = axios.create({
        baseURL: cleanUrl,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
        withCredentials: true,
      });

      client.interceptors.request.use(
        (config) => {
          if (state.authToken) {
            config.headers['Cookie'] = state.authToken;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      client.interceptors.response.use(
        (response) => {
          return response;
        },
        async (error: AxiosError) => {
          if (error.response?.status === 401 && state.authToken) {
            await clearAuth().catch(() => undefined);
          }
          return Promise.reject(error);
        }
      );

      setApiClient(client);
    } else {
      setApiClient(null);
    }
  }, [state.instanceUrl, state.authToken, clearAuth]);

  const fetchSession = useCallback(async () => {
    const currentInstanceUrl = instanceUrlRef.current;
    const currentAuthToken = authTokenRef.current;

    if (!currentInstanceUrl || !currentAuthToken) {
      return;
    }

    try {
      const client = createApiClient(currentInstanceUrl, currentAuthToken);
      const res = await client.get<SessionResponse>('/api/user/session');
      const data = res.data;

      if (data.success && !data.error && data.data && data.data.user_info) {
        const userInfo = data.data.user_info as User;
        setState((prev) => ({ ...prev, user: userInfo }));
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await clearAuth();
      }
    }
  }, [clearAuth]);

  useEffect(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
    }

    if (isInitializedRef.current && instanceUrlRef.current && authTokenRef.current) {
      fetchSession();

      sessionIntervalRef.current = setInterval(() => {
        fetchSession();
      }, 30000);
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [state.isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<LoginResponse> => {
      if (!state.instanceUrl) {
        throw new Error('Instance URL not set');
      }

      const cleanUrl = state.instanceUrl.replace(/\/$/, '');

      const client = axios.create({
        baseURL: cleanUrl,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
        withCredentials: true,
      });

      const response = await client.put<LoginResponse>('/api/user/auth/login', {
        username_or_email: credentials.username_or_email,
        password: credentials.password,
        turnstile_token: credentials.turnstile_token || '',
      });

      const setCookie = response.headers['set-cookie'];

      if (setCookie && Array.isArray(setCookie) && setCookie.length > 0) {
        const raw = setCookie[0];
        const cookieHeader = raw.split(';')[0] + ';';

        if (response.data.success && !response.data.error && response.data.data && response.data.data.user) {
          const user = response.data.data.user as User;
          await setAuth(cookieHeader, user);
        }
      }

      return response.data;
    },
    onSuccess: async (data) => {
      if (data.success && !data.error && data.data && data.data.user) {
        await fetchSession();
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest): Promise<ApiEnvelope<unknown>> => {
      if (!state.instanceUrl) {
        throw new Error('Instance URL not set');
      }

      const cleanUrl = state.instanceUrl.replace(/\/$/, '');

      const client = axios.create({
        baseURL: cleanUrl,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      try {
        const response = await client.put<ApiEnvelope<unknown>>('/api/user/auth/register', data);
        return response.data;
      } catch (error: any) {
        const msg = handleApiError(error);
        throw new Error(msg);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!state.instanceUrl || !state.authToken) {
        return;
      }

      const url = `${state.instanceUrl.replace(/\/$/, '')}/api/user/auth/logout`;
      await axios.get(url, {
        headers: {
          Cookie: state.authToken,
        },
      });
    },
    onSuccess: async () => {
      await clearAuth();
    },
  });

  const twoFactorVerify = useMutation({
    mutationFn: async (payload: { email: string; code: string }): Promise<LoginResponse> => {
      if (!state.instanceUrl) {
        throw new Error('Instance URL not set');
      }

      const cleanUrl = state.instanceUrl.replace(/\/$/, '');
      const client = createApiClient(cleanUrl, '');

      const response = await client.post<LoginResponse>('/api/user/auth/two-factor', {
        email: payload.email,
        code: payload.code.trim(),
      });

      const user = response.data?.data as unknown as User;
      const setCookie = response.headers['set-cookie'];

      if (user && setCookie) {
        const cookieHeader = Array.isArray(setCookie)
          ? setCookie[0].split(';')[0] + ';'
          : (setCookie as string).split(';')[0] + ';';
        await setAuth(cookieHeader, user);
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && !data.error && data.data && data.data.user) {
        fetchSession();
      }
    },
  });

  const canChangeInstanceUrl = !state.authToken;

  return {
    ...state,
    apiClient,
    canChangeInstanceUrl,
    setInstanceUrl,
    setAuth,
    clearAuth,
    clearAll,
    saveInstance,
    deleteInstance,
    updateInstance,
    selectInstance,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    twoFactorVerify: twoFactorVerify.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    fetchSession,
  };
});