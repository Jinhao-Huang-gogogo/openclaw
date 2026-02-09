import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import { createAinasClient } from "./client.js";

type AinasPluginConfig = {
  baseUrl?: string;
  accessToken?: string;
};

function getClient(api: OpenClawPluginApi) {
  const cfg = (api.pluginConfig ?? {}) as AinasPluginConfig;
  const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl.trim() : "";
  const accessToken = typeof cfg.accessToken === "string" ? cfg.accessToken.trim() : "";
  if (!baseUrl || !accessToken) {
    throw new Error(
      "AINAS plugin not configured. Set plugins.entries.ainas.config.baseUrl and plugins.entries.ainas.config.accessToken.",
    );
  }
  return createAinasClient(baseUrl, accessToken);
}

export function createSearchFilesTool(api: OpenClawPluginApi) {
  return {
    name: "search_files",
    description:
      "Search files on AINAS NAS by keyword or natural language. Maps to /files/search API.",
    parameters: Type.Object({
      query: Type.String({ description: "Search keyword or natural language description." }),
      spaceType: Type.Optional(
        Type.Unsafe<"personal" | "public" | "group">({
          type: "string",
          enum: ["personal", "public", "group"],
          description: "Space type filter.",
        }),
      ),
      fileTypes: Type.Optional(
        Type.Array(
          Type.String({
            description: "File type: document, image, video, audio, presentation, other.",
          }),
        ),
      ),
      dateRangeStart: Type.Optional(
        Type.String({ description: "Date range start, ISO 8601 (e.g. 2023-10-20T00:00:00Z)." }),
      ),
      dateRangeEnd: Type.Optional(
        Type.String({ description: "Date range end, ISO 8601 (e.g. 2023-10-27T23:59:59Z)." }),
      ),
      page: Type.Optional(Type.Number({ description: "Page number, default 1." })),
      size: Type.Optional(Type.Number({ description: "Page size, default 20." })),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const client = getClient(api);
      const query = typeof params.query === "string" ? params.query : "";
      if (!query.trim()) {
        throw new Error("query is required");
      }
      const dateRange =
        params.dateRangeStart || params.dateRangeEnd
          ? {
              start: typeof params.dateRangeStart === "string" ? params.dateRangeStart : undefined,
              end: typeof params.dateRangeEnd === "string" ? params.dateRangeEnd : undefined,
            }
          : undefined;
      const result = await client.searchFiles({
        query: query.trim(),
        spaceType:
          params.spaceType === "personal" ||
          params.spaceType === "public" ||
          params.spaceType === "group"
            ? params.spaceType
            : undefined,
        fileTypes: Array.isArray(params.fileTypes)
          ? (params.fileTypes.filter((t): t is string => typeof t === "string") as string[])
          : undefined,
        dateRange,
        page: typeof params.page === "number" ? params.page : undefined,
        size: typeof params.size === "number" ? params.size : undefined,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        details: result.data,
      };
    },
  };
}

export function createSearchMediaByPromptTool(api: OpenClawPluginApi) {
  return {
    name: "search_media_by_prompt",
    description:
      "AI semantic search for photos/videos on AINAS NAS by natural language. Maps to /media/ai-search API.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural language search description (e.g. last summer beach videos with dog).",
      }),
      mediaType: Type.Optional(
        Type.Unsafe<"photo" | "video" | "all">({
          type: "string",
          enum: ["photo", "video", "all"],
          description: "Media type filter, default all.",
        }),
      ),
      dateRangeStart: Type.Optional(Type.String({ description: "Date range start, ISO 8601." })),
      dateRangeEnd: Type.Optional(Type.String({ description: "Date range end, ISO 8601." })),
      tags: Type.Optional(
        Type.Array(Type.String(), {
          description: "Tags for combined filter.",
        }),
      ),
      page: Type.Optional(Type.Number({ description: "Page number, default 1." })),
      size: Type.Optional(Type.Number({ description: "Page size, default 20." })),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const client = getClient(api);
      const query = typeof params.query === "string" ? params.query : "";
      if (!query.trim()) {
        throw new Error("query is required");
      }
      const dateRange =
        params.dateRangeStart || params.dateRangeEnd
          ? {
              start: typeof params.dateRangeStart === "string" ? params.dateRangeStart : undefined,
              end: typeof params.dateRangeEnd === "string" ? params.dateRangeEnd : undefined,
            }
          : undefined;
      const result = await client.searchMediaByPrompt({
        query: query.trim(),
        mediaType:
          params.mediaType === "photo" || params.mediaType === "video" || params.mediaType === "all"
            ? params.mediaType
            : undefined,
        dateRange,
        tags: Array.isArray(params.tags)
          ? (params.tags.filter((t): t is string => typeof t === "string") as string[])
          : undefined,
        page: typeof params.page === "number" ? params.page : undefined,
        size: typeof params.size === "number" ? params.size : undefined,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        details: result.data,
      };
    },
  };
}

export function createListAlbumCategoriesTool(api: OpenClawPluginApi) {
  return {
    name: "list_album_categories",
    description:
      "List AI-generated album categories on AINAS NAS. Maps to /media/albums/categories API.",
    parameters: Type.Object({
      type: Type.Optional(
        Type.Unsafe<"person" | "pet" | "scene" | "location">({
          type: "string",
          enum: ["person", "pet", "scene", "location"],
          description: "Category type filter.",
        }),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const client = getClient(api);
      const typeParam =
        params.type === "person" ||
        params.type === "pet" ||
        params.type === "scene" ||
        params.type === "location"
          ? params.type
          : undefined;
      const result = await client.listAlbumCategories({ type: typeParam });
      return {
        content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        details: result.data,
      };
    },
  };
}
