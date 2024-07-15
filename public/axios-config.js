const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  withCredentials: true
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await axiosInstance.post('/refresh-token');
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        delete axiosInstance.defaults.headers.common['Authorization'];
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

window.axiosInstance = axiosInstance;