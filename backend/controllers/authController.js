const axios = require('axios');
const { generateToken } = require('../middleware/auth');
const { HttpsProxyAgent } = require('https-proxy-agent');

const {
  CLICKUP_CLIENT_ID,
  CLICKUP_CLIENT_SECRET,
  REDIRECT_URI,
  FRONTEND_URL,
  HTTPS_PROXY,
  https_proxy
} = process.env;

// Configure a proxy agent if HTTPS_PROXY is set
const httpsProxy = HTTPS_PROXY || https_proxy;
let httpsAgent;
if (httpsProxy) {
  console.log('Using HTTPS proxy:', httpsProxy);
  httpsAgent = new HttpsProxyAgent(httpsProxy);
}

function generateState() {
  return Math.random().toString(36).substring(2);
}

// 1. Redirect user to ClickUp OAuth
const redirectToClickUp = (req, res) => {
  const state = generateState();
  // Store state in a temporary cookie that will be removed after OAuth
  res.cookie('oauthState', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000 // 5 minutes
  });
  
  const authUrl = `https://app.clickup.com/api?client_id=${CLICKUP_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
  return res.redirect(authUrl);
};

// 2. Handle ClickUp OAuth callback
const handleCallback = async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies?.oauthState;
  
  // Clear the state cookie immediately
  res.clearCookie('oauthState');
  
  if (!code || state !== savedState) {
    return res.status(400).send('Invalid state or missing code');
  }

  try {
    console.log('Exchanging code for token...');
    const tokenRes = await axios.post('https://api.clickup.com/api/v2/oauth/token', {
      client_id: CLICKUP_CLIENT_ID,
      client_secret: CLICKUP_CLIENT_SECRET,
      code
    }, { httpsAgent });
    
    const clickupToken = tokenRes.data.access_token;
    if (!clickupToken) {
      throw new Error('No access token received from ClickUp');
    }

    // Get user info to include in JWT
    console.log('Fetching user info...');
    const userRes = await axios.get('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: `Bearer ${clickupToken}` },
      httpsAgent
    });

    // Create user object with ClickUp data and token
    const user = {
      id: userRes.data.user.id,
      username: userRes.data.user.username,
      email: userRes.data.user.email,
      clickupToken: tokenRes.data.access_token
    };

    // Generate JWT
    const token = generateToken(user);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}?token=${token}`);
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err.message);
    res.status(500).send('OAuth token exchange failed');
  }
};

// Logout endpoint
const logout = (req, res) => {
  res.json({ ok: true });
};

// 3. Get authenticated ClickUp user info
const getUser = async (req, res) => {
  try {
    if (!req.user.clickupToken) {
      return res.status(401).json({ error: 'Unauthorized', details: 'No ClickUp token found' });
    }

    const userRes = await axios.get('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: `Bearer ${req.user.clickupToken}` },
      httpsAgent
    });
    
    const userData = userRes.data.user;
    res.json({
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        color: userData.color,
        profilePicture: userData.profilePicture
      }
    });
  } catch (err) {
    console.error('Failed fetching user:', err.response?.data || err.message);
    if (err.response?.data?.ECODE === 'OAUTH_019') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please log in again',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: err.response?.data || err.message 
    });
  }
};

module.exports = {
  redirectToClickUp,
  handleCallback,
  logout,
  getUser
};
