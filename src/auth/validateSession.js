import { API_BASE_URL } from "../apiConfig";
import { forceLogout, getAccessToken } from "./session";

export const validateStoredSession = async () => {
  const token = getAccessToken();

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: "GET",
      headers: {
        "x-access-token": token,
      },
    });

    if (!response.ok) {
      forceLogout("session_invalid", token);
      return false;
    }

    return true;
  } catch (error) {
    forceLogout("session_unreachable", token);
    return false;
  }
};
