/**
 * Peak Otel - İstemci API Servisi
 */

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('peak_hotel_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('peak_hotel_token', token);
    } else {
      localStorage.removeItem('peak_hotel_token');
    }
  },

  getUser() {
    try {
      const user = localStorage.getItem('peak_hotel_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('peak_hotel_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('peak_hotel_user');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Bir hata meydana geldi.');
      }

      return data;
    } catch (err) {
      this.toast(err.message, 'error');
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const cleanParams = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = val;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
