const API_PREFIX: string =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' ? import.meta.env.VITE_API_BASE_URL : '';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_PREFIX}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(text || res.statusText || 'Request failed', res.status);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
