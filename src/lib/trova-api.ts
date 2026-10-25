type TrovaImportMeta = ImportMeta & { env: ImportMetaEnv & { VITE_TROVALABS_API_URL?: string } };

export const TROVA_API_BASE_URL = (
  (import.meta as TrovaImportMeta).env.VITE_TROVALABS_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "https://api.trovalabs.com")
).replace(/\/$/, "");

export const TROVA_SESSION_KEY = "trova_access_token";

export function getTrovaSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(TROVA_SESSION_KEY) ?? "";
}

export async function readApiError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? `API request failed (${response.status})`;
}
