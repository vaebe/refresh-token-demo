const { createApp } = Vue;

createApp({
  data() {
    return {
      username: '',
      password: '',
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
      } catch (error) {
        console.error(error);
      }
    },
    async logout() {
      try {
        await axiosInstance.post('/logout');
        localStorage.removeItem('accessToken');
        this.isLoggedIn = false;
        this.data = null;
      } catch (error) {
        console.error(error);
      }
    },
    async refreshToken() {
      try {
        const response = await axiosInstance.post('/refresh-token');
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);
      } catch (error) {
        console.error(error);
      }
    },
    async getData() {
      try {
        const response = await axiosInstance.get('/data');
        this.data = response.data;
      } catch (error) {
        console.error(error);
      }
    }
  }
}).mount('#app');