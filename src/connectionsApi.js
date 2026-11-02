import api from "./apiConfig";

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 60 * 60 * 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Builds connections and resolves once they are complete. Small schedules finish
// within the first request (200); large ones return 202 and are polled here, so
// callers can keep awaiting this before refreshing dependent data.
export const runCreateConnections = async ({ pollIntervalMs = POLL_INTERVAL_MS, maxWaitMs = MAX_WAIT_MS } = {}) => {
  const response = await api.get("/createConnections");
  if (response.status !== 202) return response;

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await wait(pollIntervalMs);
    const statusResponse = await api.get("/createConnections/status");
    const status = statusResponse.data?.status;
    if (status === "completed") return statusResponse;
    if (status === "failed" || status === "idle") {
      throw new Error(statusResponse.data?.message || "Connection processing failed");
    }
  }

  throw new Error("Connection processing is taking longer than expected. Please check again later.");
};
