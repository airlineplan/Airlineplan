import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://airlineplan.com';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the access token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['x-access-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL };
