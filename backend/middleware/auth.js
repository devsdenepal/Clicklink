const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

function generateToken(user) {
  if (!user.clickupToken) {
    throw new Error('ClickUp token is required');
  }
  return jwt.sign({ 
    id: user.id,
    email: user.email,
    username: user.username,
    clickupToken: user.clickupToken // Include ClickUp token in JWT
  }, JWT_SECRET, { 
    expiresIn: '7d' 
  });
}

function requireAuth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided', code: 'TOKEN_MISSING' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ error: 'No token provided', code: 'TOKEN_MISSING' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token has required fields
    if (!decoded.clickupToken) {
      return res.status(401).json({ error: 'Invalid token format', code: 'TOKEN_INVALID_FORMAT' });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }
    return res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
  }
}

module.exports = {
  generateToken,
  requireAuth,
  JWT_SECRET
};