const { createApp } = Vue;

createApp({
  data() {
    return {
      username: 'user1',
      password: 'pw1',
      isLoggedIn: false,
      data: null
    };
  },
  mounted() {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      this.isLoggedIn = true;
    }
  },
  methods: {
    async login() {
      try {
        const response = await axiosInstance.post('/login', { username: this.username, password: this.password });
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);

        this.isLoggedIn = true;

        console.log('Logged in', JSON.stringify(response.data));
      } catch (error) {
        console.error(error);
        console.log('Logged in', '登录失败!');
      }
    },
    async logout() {
      try {
        await axiosInstance.post('/logout');
        localStorage.removeItem('accessToken');

        this.isLoggedIn = false;
        this.data = null;

        console.log('Logged out');
      } catch (error) {
        console.error(error);
      }
    },
    async refreshToken() {
      try {
        console.log('Refreshed token: start===============================', );

        const response = await axiosInstance.post('/refresh-token');
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);

        console.log('Refreshed token:', accessToken);
      } catch (error) {
        localStorage.removeItem('accessToken');
        this.isLoggedIn = false;
        this.data = null;
      }
    },
    async getData() {
      try {
        const response = await axiosInstance.get('/data');
        this.data = response.data;
        console.log('Got data:', JSON.stringify(response.data));
      } catch (error) {
        console.error( error);

        if (error.response.status === 403) {
          localStorage.removeItem('accessToken');
          this.isLoggedIn = false;
          this.data = null;
          console.log('Got data:', '刷新token失败，请重新登录!')
        }
      }
    }
  }
}).mount('#app');