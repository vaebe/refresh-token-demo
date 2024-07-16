const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  withCredentials: true
});

let refreshing = false;
let queue = []

async function refreshToken(originalRequest) {
  // 请求刷新 token 接口
  return axiosInstance.post('/refresh-token').then(response => {
    // 获取新的 access token
    const accessToken = response.data.accessToken;

    // 存储 access token
    localStorage.setItem('accessToken', accessToken);

    // 设置 Authorization header
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

     // 重新执行 401 函数
     queue.forEach(cb => cb());
   
    // // 执行完毕后清空队列
    queue = []

    return axiosInstance(originalRequest);
  }).catch((err) => {
    // 获取新的 access token 失败，清除 access token 并重新登录
    localStorage.removeItem('accessToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
    queue = []
    return Promise.reject(err)
  }).finally(() => {
    refreshing = false;
  })
}

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response.status === 401) {
      // 将 401 的错误的请求加入队列
      if (refreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(axiosInstance(originalRequest)));
        });
      }

      if (!refreshing) {
        refreshing = true;
        return await refreshToken(originalRequest)
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