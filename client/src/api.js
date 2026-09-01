import axios from 'axios';

export const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
	const token = localStorage.getItem('token');
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

api.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			if (window.location.pathname !== '/login') window.location.assign('/login');
		}
		return Promise.reject(error);
	}
);
