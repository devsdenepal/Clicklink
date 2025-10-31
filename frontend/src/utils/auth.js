const TOKEN_KEY = 'auth_token';
const BACKEND_URL = 'https://clicklink-flax.vercel.app';

const getToken = () => localStorage.getItem(TOKEN_KEY);

const setToken = (token) => {
  if (!token) {
    console.warn('Attempting to set empty token');
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
};

const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Date.now() / 1000;
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true;
  }
};

const handleResponse = async (res) => {
  if (res.ok) return res;
  const contentType = res.headers.get('content-type');
  let body = null;
  if (contentType && contentType.includes('application/json')) {
    try { body = await res.json(); } catch {}
  } else {
    try { body = await res.text(); } catch {}
  }

  let message = (body && (body.error || body.message)) || (typeof body === 'string' ? body : 'Request failed');
  if (body && body.details) {
    const det = typeof body.details === 'string' ? body.details : (body.details.message || JSON.stringify(body.details));
    if (det && det !== message) message += `: ${det}`;
  }
  const err = new Error(message);
  err.status = res.status;
  if (body && typeof body === 'object') {
    err.code = body.code;
    err.data = body;
  }

  if (res.status === 401) {
    if (err.code === 'TOKEN_EXPIRED' || err.code === 'TOKEN_INVALID') {
      removeToken();
      window.location.href = '/';
    }
  }

  throw err;
};

const api = {
  get: async (route) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }
    const url = `${BACKEND_URL}${route}`;
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return handleResponse(res);
  },

  post: async (route, data) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }
    const url = `${BACKEND_URL}${route}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  put: async (route, data) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }
    const url = `${BACKEND_URL}${route}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  }
};

export {
  api,
  getToken,
  setToken,
  removeToken,
  isTokenExpired
};
