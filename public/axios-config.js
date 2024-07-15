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
        // 请求刷新 token 接口
        const response = await axiosInstance.post('/refresh-token');

        // 获取新的 access token
        const accessToken = response.data.accessToken;

        // 存储 access token
        localStorage.setItem('accessToken', accessToken);

        // 设置 Authorization header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // 将错误的请求配置重新发送
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // 获取新的 access token 失败，清除 access token 并重新登录
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