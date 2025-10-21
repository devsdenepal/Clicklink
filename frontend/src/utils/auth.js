// Auth utility functions
const TOKEN_KEY = 'auth_token';

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

// Common error handler for API responses
const handleResponse = async (res) => {
  if (res.ok) return res;

  const contentType = res.headers.get('content-type');
  let error = { status: res.status };

  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    error.data = data;
    error.code = data.code;
    error.message = data.error || 'Request failed';
  } else {
    error.message = await res.text();
  }

  if (res.status === 401) {
    if (error.code === 'TOKEN_EXPIRED' || error.code === 'TOKEN_INVALID') {
      removeToken();
      window.location.href = '/'; // Redirect to login
    }
  }

  throw error;
};

// API client with auth header and error handling
const api = {
  get: async (url) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }

    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return handleResponse(res);
  },

  post: async (url, data) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }

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

  put: async (url, data) => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      window.location.href = '/';
      throw new Error('Token expired');
    }

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