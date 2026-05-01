export const METRICS_CACHE_KEY_PREFIX = "fleet:metrics:";
export const METRICS_CACHE_INVALIDATED_AT_KEY = "fleet:metrics:invalidatedAt";
export const METRICS_CACHE_TTL_MS = 10 * 60 * 1000;

export const getFleetMetricsInvalidatedAt = () => {
    try {
        return Number(localStorage.getItem(METRICS_CACHE_INVALIDATED_AT_KEY)) || 0;
    } catch (error) {
        console.warn("Failed to read fleet metrics invalidation marker", error);
        return 0;
    }
};

export const clearFleetMetricsCache = () => {
    try {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(METRICS_CACHE_KEY_PREFIX)) keysToDelete.push(key);
        }
        keysToDelete.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
        console.warn("Failed to clear fleet metrics cache from localStorage", error);
    }
};

export const invalidateFleetMetricsCache = () => {
    clearFleetMetricsCache();
    try {
        localStorage.setItem(METRICS_CACHE_INVALIDATED_AT_KEY, String(Date.now()));
    } catch (error) {
        console.warn("Failed to mark fleet metrics cache as invalidated", error);
    }
};

