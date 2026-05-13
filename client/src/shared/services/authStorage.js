const TOKEN_KEY = 'token';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const storeToken = (token, { persistent = true } = {}) => {
  if (typeof window === 'undefined' || !token) return;

  if (persistent) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

export const bootstrapTokenFromUrl = () => {
  if (typeof window === 'undefined') return null;

  const currentUrl = new URL(window.location.href);
  const urlToken = currentUrl.searchParams.get('token');

  if (!urlToken) {
    return getStoredToken();
  }

  storeToken(urlToken, { persistent: false });
  currentUrl.searchParams.delete('token');
  window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);

  return urlToken;
};
