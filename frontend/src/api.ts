import type {Catalog} from "./types";

export async function fetchCatalog(signal?: AbortSignal): Promise<Catalog> {
  const response = await fetch("/api/v1/catalog", {
    headers: {"Accept": "application/json"},
    signal,
  });
  if (!response.ok) {
    let message = "蝉鸣目录暂时不可用";
    try {
      const payload = await response.json() as {error?: {message?: string}};
      message = payload.error?.message ?? message;
    } catch {
      // Keep the user-facing fallback.
    }
    throw new Error(message);
  }
  const catalog = await response.json() as Catalog;
  if (catalog.schemaVersion !== 2) {
    throw new Error(`不支持的目录版本：${catalog.schemaVersion}`);
  }
  return catalog;
}
