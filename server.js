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

// 存储刷新令牌的数据库（这里使用一个简单的对象模拟）
const refreshTokens = {};

// 模拟用户数据库
const users = [
  { id: 1, username: 'user1', password: 'pw1' },
  { id: 2, username: 'user2', password: 'pw2' }
];

// 生成访问令牌和刷新令牌
function generateToken(userId) {
  const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return {
    accessToken,
    refreshToken
  }
}

// 设置 token 信息
function setTokenInfo(res, userId) {
  // 生成访问令牌和刷新令牌
  const { accessToken, refreshToken } = generateToken(userId);

  // 存储刷新令牌及其过期时间
  refreshTokens[refreshToken] = userId

  /**
   * 将刷新令牌存储在 HTTP-only cookie 中
   * 直接返回客户端也可以，调用刷新 toekn 接口时候将 refreshToken 通过接口传递但客户端一般存储在 localStorage 中可以被获取到不够安全
   * cookie 同样存在限制，因为需要在服务器端存储，不支持分布式应用
   */
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });

  res.json({ accessToken });
}

// 登录接口
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: '用户不存在！' });
  }

  setTokenInfo(res, user.id)
});

// 刷新访问令牌接口
app.post('/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'refreshToken 不存在！' });
  }

  if (!refreshTokens[refreshToken]) {
    return res.status(403).json({ message: '未知的 refreshToken！' });
  }

  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err) => {
    if (err) {
      return res.status(403).json({ message: '未知的 refreshToken' });
    }

    setTokenInfo(res, refreshTokens[refreshToken])
  });
});

// 登出接口
app.post('/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    delete refreshTokens[refreshToken];
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// 模拟获取数据
app.post('/get-data', (req, res) => {
  // 从 header 取出token验证
  const token = req.headers.authorization.split(' ')[1];

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err) => {
    if (err) {
      return res.status(401).json({ message: 'token 已过期' });
    }

    res.json({ message: '获取成功！' });
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server successfully started`);
  console.log(`Server: http://127.0.0.1:${PORT}`);
});