/**
 * Shared "never break live" pattern for every external data call in this app.
 *
 * Every API route follows the same shape:
 *   1. Check a short-lived in-memory cache (avoids hammering the free upstream
 *      source and keeps repeated page loads fast during a class demo).
 *   2. Try the live, keyless upstream with a hard timeout.
 *   3. On ANY failure (network, timeout, bad shape, rate limit) fall back to
 *      the bundled fixture in `src/fixtures/` instead of throwing.
 *
 * The route always returns 200 with a `source: "live" | "mock"` flag so the
 * UI can show a small badge — never an error page in front of a class.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 4000,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs `live()`; on any thrown error (network/timeout/parse), returns
 * `fallback()` instead. Never lets a route handler throw.
 */
export async function withFallback<T>(
  live: () => Promise<T>,
  fallback: () => T
): Promise<{ value: T; source: "live" | "mock" }> {
  try {
    const value = await live();
    return { value, source: "live" };
  } catch {
    return { value: fallback(), source: "mock" };
  }
}
