const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const username = ref('user1');
    const password = ref('pw1');
    const isLoggedIn = ref(false);
    const data = ref(null);

    // 清除 access token  
    localStorage.removeItem('accessToken');
    
    async function login() {
      try {
        const response = await axiosInstance.post('/login', { username: username.value, password: password.value });
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);

        isLoggedIn.value = true;

        console.log('Logged in', JSON.stringify(response.data));
      } catch (error) {
        console.error(error);
        console.log('Logged in', '登录失败!');
      }
    }

    async function logout() {
      try {
        await axiosInstance.post('/logout');
        localStorage.removeItem('accessToken');

        isLoggedIn.value = false;
        data.value = null;

        console.log('Logged out');
      } catch (error) {
        console.error(error);
      }
    }

    async function refreshToken() {
      try {
        console.log('Refreshed token: start===============================');

        const response = await axiosInstance.post('/refresh-token');
        const accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', accessToken);

        console.log('Refreshed token:', accessToken);
      } catch (error) {
        localStorage.removeItem('accessToken');
        isLoggedIn.value = false;
        data.value = null;
      }
    }

    async function getData(params) {
      try {
        const response = await axiosInstance.get(`/data/${params}`);
        data.value = response.data;
        console.log('Got data:', JSON.stringify(response.data));

        return response.data;
      } catch (error) {
        console.error(error)

        if (error.response.status === 403) {
          localStorage.removeItem('accessToken');
          isLoggedIn.value = false;
          data.value = null;
          console.log('Got data:', '刷新token失败，请重新登录!');
        }

        return error
      }
    }

    function getDataInBatches() {
      const list = [getData('1qq'), getData('2qq'), getData('3qq')];

      Promise.all(list)
        .then(res => {
          console.log('getDataInBatches:', res);
        })
        .catch(error => {
          console.error('getDataInBatches', error);
        });
    }

    return {
      username,
      password,
      isLoggedIn,
      data,
      login,
      logout,
      refreshToken,
      getData,
      getDataInBatches
    };
  }
}).mount('#app');