/**
 * AINAS NAS API client. Base path: {baseUrl}/api/v1 (baseUrl already includes /api/v1).
 */

export type AinasApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  requestId?: string;
};

export type AinasSearchFilesParams = {
  query: string;
  spaceType?: "personal" | "public" | "group";
  fileTypes?: string[];
  dateRange?: { start?: string; end?: string };
  page?: number;
  size?: number;
};

export type AinasSearchMediaParams = {
  query: string;
  mediaType?: "photo" | "video" | "all";
  dateRange?: { start?: string; end?: string };
  tags?: string[];
  page?: number;
  size?: number;
};

export type AinasListAlbumCategoriesParams = {
  type?: "person" | "pet" | "scene" | "location";
};

function ensureNoTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

export class AinasClient {
  constructor(
    private baseUrl: string,
    private accessToken: string,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<AinasApiResponse<T>> {
    const base = ensureNoTrailingSlash(this.baseUrl);
    const p = path.startsWith("/") ? path : `/${path}`;
    let url = `${base}${p}`;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams(params).toString();
      url += (url.includes("?") ? "&" : "?") + search;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (body !== undefined && method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let json: AinasApiResponse<T>;
    try {
      json = (await res.json()) as AinasApiResponse<T>;
    } catch {
      throw new Error(`AINAS API request failed: ${res.status} ${res.statusText}`);
    }
    if (json.code !== 200) {
      throw new Error(
        `AINAS API error: ${json.message} (code=${json.code}, requestId=${json.requestId ?? "?"})`,
      );
    }
    return json;
  }

  async searchFiles(params: AinasSearchFilesParams): Promise<AinasApiResponse<unknown>> {
    const body = {
      query: params.query,
      spaceType: params.spaceType,
      fileTypes: params.fileTypes,
      dateRange: params.dateRange,
      page: params.page ?? 1,
      size: params.size ?? 20,
    };
    return this.request<unknown>("POST", "/files/search", body);
  }

  async searchMediaByPrompt(params: AinasSearchMediaParams): Promise<AinasApiResponse<unknown>> {
    const body = {
      query: params.query,
      mediaType: params.mediaType ?? "all",
      dateRange: params.dateRange,
      tags: params.tags,
      page: params.page ?? 1,
      size: params.size ?? 20,
    };
    return this.request<unknown>("POST", "/media/ai-search", body);
  }

  async listAlbumCategories(
    params?: AinasListAlbumCategoriesParams,
  ): Promise<AinasApiResponse<unknown>> {
    const q: Record<string, string> = {};
    if (params?.type) {
      q.type = params.type;
    }
    return this.request<unknown>("GET", "/media/albums/categories", undefined, q);
  }
}

export function createAinasClient(baseUrl: string, accessToken: string): AinasClient {
  const base = ensureNoTrailingSlash(baseUrl.trim()) || baseUrl.trim();
  if (!base) {
    throw new Error("AINAS baseUrl is required");
  }
  const token = accessToken?.trim();
  if (!token) {
    throw new Error("AINAS accessToken is required");
  }
  return new AinasClient(base, token);
}
