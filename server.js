const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 定义根路由返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.json());
app.use(cookieParser());

// 密钥，用于签名和验证 JWT
const ACCESS_TOKEN_SECRET = '516AE41C-9658-220A-C2EE-698EFB7546CC';
const REFRESH_TOKEN_SECRET = 'FB3C5606-A097-B63F-ED27-113985FB5905';

// 模拟用户数据库
const users = [
  { id: 1, username: 'user1', password: 'pw1' },
  { id: 2, username: 'user2', password: 'pw2' }
];

// 生成访问令牌和刷新令牌
function generateToken(userId) {
  const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '10s' });
  const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: '30s' });
  return {
    accessToken,
    refreshToken
  }
}
function gteCookieRefreshTokenKey(userId) {
  return `refreshToken-${userId}`
}

// 存储令牌到用户 id 的映射（这里使用一个简单的对象模拟）
const accessTokens = {};

// 设置 token 信息
function setTokenInfo(res, userId) {
  // 生成访问令牌和刷新令牌
  const { accessToken, refreshToken } = generateToken(userId);
  accessTokens[accessToken] = userId

  /**
   * 将刷新令牌存储在 HTTP-only cookie 中
   * 直接返回客户端也可以，调用刷新 toekn 接口时候将 refreshToken 通过接口传递但客户端一般存储在 localStorage 中可以被获取到不够安全
   * cookie 同样存在限制，因为需要在服务器端存储，不支持分布式应用
   */
  res.cookie(gteCookieRefreshTokenKey(userId), refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });

  res.json({ accessToken });
}

// 登录接口
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    res.status(400).json({ message: '用户不存在！' });
    return
  }

  setTokenInfo(res, user.id)
});


// 获取 header 中的 token
function getHeaderToken(req) {
  const fullToken = req.headers.authorization

  if (!fullToken) {
    return {
      code: -1,
      message: 'token 不存在！'
    }
  }

  const token = fullToken.split(' ')[1];
  if (!token) {
    return {
      code: -1,
      message: '未知的 token!'
    }
  }

  return {
    code: 0,
    message: token,
    userId: accessTokens[token]
  }
}

// 刷新访问令牌接口
app.post('/refresh-token', (req, res) => {
  const accessTokenInfo = getHeaderToken(req)
  // 未携带 accessToken 返回错误
  if (accessTokenInfo.code !== 0) {
    res.status(403).json({ message: accessTokenInfo.message });
    return
  }

  // 错误有三种 JsonWebTokenError| NotBeforeError | TokenExpiredError;
  try {
    // 只要不返回错误就代表成功!
    jwt.verify(accessTokenInfo.message, ACCESS_TOKEN_SECRET);
  } catch (err) {
    res.status(403).json({ message: '未知的 token!' });
    return
  }

  // accessToken 验证通过 判断 refreshToken 是否可以续签
  const refreshToken = req.cookies[gteCookieRefreshTokenKey(accessTokenInfo.userId)];

  if (!refreshToken) {
    res.status(403).json({ message: 'refreshToken 不存在！' });
    return
  }

  try {
    // 只要不返回错误就代表成功!
    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    setTokenInfo(res, accessTokenInfo.userId)
  }
  catch (err) {
    // error.name === 'TokenExpiredError' 
    console.log(err.name, 'token 过期');
    res.status(403).json({ message: '未知的 refreshToken' });
    return
  }
});

// 退出登录成功
function logoutSuccess(res, accessTokenInfo) {
  // 清除 cookie 中的 refreshToken
  res.clearCookie(gteCookieRefreshTokenKey(accessTokenInfo.userId));

  // 清除缓存的 accessToken
  delete accessTokens[accessTokenInfo.message]; 

  res.json({ message: 'Logged out successfully' });
}

// 登出接口
app.post('/logout', (req, res) => {
  const accessTokenInfo = getHeaderToken(req)
  // 未携带 accessToken 返回错误
  if (accessTokenInfo.code !== 0) {
    res.status(403).json({ message: accessTokenInfo.message });
    return
  }

  try {
    // 只要不返回错误就代表成功!
    jwt.verify(accessTokenInfo.message, ACCESS_TOKEN_SECRET);
    logoutSuccess(res, accessTokenInfo)
  } catch (err) {

    // token 过期依然可以正常退出
    if (err.name === 'TokenExpiredError') {
      logoutSuccess(res, accessTokenInfo)
      return
    }
    // 否则返回错误
    res.status(403).json({ message: '未知的 token!' });
  }
});

// 模拟获取数据
app.get('/data', (req, res) => {
  const accessTokenInfo = getHeaderToken(req)
  // 未携带 accessToken 返回错误
  if (accessTokenInfo.code !== 0) {
    res.status(403).json({ message: accessTokenInfo.message });
    return
  }

  try {
    // 只要不返回错误就代表成功!
    jwt.verify(accessTokenInfo.message, ACCESS_TOKEN_SECRET);
    res.json({ message: '获取成功！', data: new Date() });
  } catch (err) {
    res.status(401).json({ message: 'token 已过期' });
  }
});

// 获取所有 cookie
app.get('/get-cookies', (req, res) => {
  const cookies = req.cookies;
  res.send(`Cookies: ${JSON.stringify(cookies)}`);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server successfully started`);
  console.log(`Server: http://127.0.0.1:${PORT}`);
});