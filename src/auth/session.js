const ACCESS_TOKEN_KEY = "accessToken";
const AUTH_LOGOUT_EVENT = "auth:logout";
let lastLoggedOutToken = null;
let lastLoggedOutReason = null;

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setAccessToken = (token) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  lastLoggedOutToken = null;
  lastLoggedOutReason = null;
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const forceLogout = (reason = "session_invalid", token = getAccessToken()) => {
  if (!token) {
    return;
  }

  if (lastLoggedOutToken === token && lastLoggedOutReason === reason) {
    return;
  }

  lastLoggedOutToken = token;
  lastLoggedOutReason = reason;
  clearAuthSession();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AUTH_LOGOUT_EVENT, {
        detail: { reason },
      })
    );
  }
};

export const onAuthLogout = (handler) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => handler(event.detail);
  window.addEventListener(AUTH_LOGOUT_EVENT, listener);

  return () => window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
};

