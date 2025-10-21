const express = require('express');
const axios = require('axios');
const { signJwt } = require('../middleware/auth');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:5000'}/auth/github/callback`;

// 1) Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) return res.status(500).send('GitHub OAuth not configured');
  // Carry existing JWT from query to merge post-callback
  const carry = req.query.carry || null;
  const stateObj = { k: Date.now().toString(36), carry };
  const state = encodeURIComponent(JSON.stringify(stateObj));
  const scope = encodeURIComponent('repo read:user read:org');
  const redirect = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${scope}&state=${state}`;
  res.redirect(redirect);
});

// 2) GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI
    }, { headers: { Accept: 'application/json' } });

    const githubToken = tokenRes.data && tokenRes.data.access_token;
    if (!githubToken) return res.status(500).send('GitHub token exchange failed');

    // Try to parse carry token from state to merge with ClickUp session
    let mergedPayload = { githubToken, provider: 'github' };
    try {
      if (state) {
        const parsed = JSON.parse(decodeURIComponent(state));
        const carryToken = parsed && parsed.carry;
        if (carryToken) {
          // Verify carry token and merge tokens
          const jwtLib = require('jsonwebtoken');
          const { JWT_SECRET } = require('../middleware/auth');
          const decoded = jwtLib.verify(carryToken, JWT_SECRET);
          if (decoded && (decoded.clickupToken || decoded.id)) {
            mergedPayload = {
              id: decoded.id,
              email: decoded.email,
              username: decoded.username,
              clickupToken: decoded.clickupToken,
              githubToken,
              provider: 'github'
            };
          }
        }
      }
    } catch (e) {
      // Fallback to github-only token
    }

    // Sign a JWT embedding tokens
    const jwt = signJwt(mergedPayload);

    // Redirect to frontend page which will read token and store it
    const redirectUrl = `${FRONTEND_URL}/github-stats?token=${encodeURIComponent(jwt)}`;
    res.redirect(redirectUrl);
  } catch (e) {
    console.error('GitHub OAuth callback failed:', e.response?.data || e.message);
    res.status(500).send('GitHub OAuth failed');
  }
});

module.exports = router;
