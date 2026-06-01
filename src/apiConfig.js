import axios from 'axios';
import { toast } from 'react-toastify';
import { forceLogout, getAccessToken } from './auth/session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://airlineplan.com';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the access token in all requests
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers['x-access-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const AUTH_BYPASS_PATHS = [
    '/user-login',
    '/user-signup',
    '/send-email',
    '/change-passowrd',
    '/send-contactEmail',
];
let lastForbiddenToast = { message: '', at: 0 };

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || '';
        const token = error?.config?.headers?.['x-access-token'] || getAccessToken();
        const shouldIgnore = AUTH_BYPASS_PATHS.some((path) => requestUrl.includes(path));

        if (token && !shouldIgnore && status === 401) {
            forceLogout("session_invalid", token);
        }

        if (!shouldIgnore && status === 403) {
            const message = error?.response?.data?.error || error?.response?.data?.message || 'You do not have access to perform this action.';
            const now = Date.now();
            if (message !== lastForbiddenToast.message || now - lastForbiddenToast.at > 1500) {
                toast.error(message);
                lastForbiddenToast = { message, at: now };
            }
        }

        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL };
