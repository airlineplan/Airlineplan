const DEFAULT_RETRY_DELAYS_MS = [750, 1500];

export const isRetryableApiError = (error) => {
  if (error?.code === "ERR_CANCELED") return false;

  const status = error?.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

export const requestWithRetry = async (
  request,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS
) => {
  const delays = Array.isArray(retryDelaysMs) ? retryDelaysMs : DEFAULT_RETRY_DELAYS_MS;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= delays.length || !isRetryableApiError(error)) {
        throw error;
      }

      const delayMs = Math.max(0, Number(delays[attempt]) || 0);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("API request retry loop ended unexpectedly");
};

export const getApiErrorMessage = (error, fallbackMessage) => (
  error?.response?.data?.error
  || error?.response?.data?.message
  || fallbackMessage
);
