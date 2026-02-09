import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  createListAlbumCategoriesTool,
  createSearchFilesTool,
  createSearchMediaByPromptTool,
} from "./src/tools.js";

const plugin = {
  id: "ainas",
  name: "AINAS",
  description: "AINAS NAS media search, file search, and album categories.",
  configSchema: {
    type: "object",
    additionalProperties: false,
    required: ["baseUrl", "accessToken"],
    properties: {
      baseUrl: {
        type: "string",
        description: "AINAS API base URL (e.g. https://nas.example.com:8443/api/v1)",
      },
      accessToken: {
        type: "string",
        description: "Bearer token for API authentication",
      },
    },
  },
  register(api: OpenClawPluginApi) {
    api.registerTool(createSearchFilesTool(api));
    api.registerTool(createSearchMediaByPromptTool(api));
    api.registerTool(createListAlbumCategoriesTool(api));
  },
};

export default plugin;
