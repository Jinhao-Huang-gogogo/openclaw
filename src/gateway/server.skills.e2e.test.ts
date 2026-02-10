// @ts-ignore
import { vi, afterAll, beforeAll, describe, expect, test } from "vitest";
import { getFreePort, installGatewayTestHooks, startGatewayServer } from "./test-helpers.js";

const mockConfig = {
  plugins: {
    entries: {
      ainas: {
        enabled: true,
        config: {
          accessToken: "test-token-123",
        },
      },
    },
  },
  agents: {
    list: [],
  },
  meta: {},
};

// Mock config module
vi.mock("../config/config.js", async (importOriginal) => {
  return {
    loadConfig: () => mockConfig,
    resolveDefaultAgentId: () => "default",
    resolveAgentWorkspaceDir: () => "/tmp/workspace-default",
    writeConfigFile: async () => {},
    createConfigIO: () => ({
      loadConfig: () => mockConfig,
      readConfigFileSnapshot: async () => ({
        path: "/tmp/config.json",
        exists: true,
        raw: "{}",
        parsed: mockConfig,
        valid: true,
        config: mockConfig,
        hash: "hash",
        issues: [],
        warnings: [],
        legacyIssues: [],
      }),
      writeConfigFile: async () => {},
      configPath: "/tmp/config.json",
    }),
    readConfigFileSnapshot: async () => ({
      exists: true,
      valid: true,
      issues: [],
      legacyIssues: [],
      config: mockConfig,
      path: "/tmp/config.json",
      parsed: mockConfig,
      raw: "{}",
    }),
    migrateLegacyConfig: () => ({ config: {}, changes: [] }),
    isNixMode: false,
    CONFIG_PATH: "/tmp/config.json",
    resolveConfigPath: () => "/tmp/config.json",
    resolveStateDir: () => "/tmp/state",
    validateConfigObjectWithPlugins: () => ({
      ok: true,
      issues: [],
      warnings: [],
      config: mockConfig,
    }),
    validateConfigObject: () => ({ ok: true, issues: [], warnings: [], config: mockConfig }),
    applyPluginAutoEnable: () => ({ changes: [], config: mockConfig }),
    normalizeConfigPaths: () => mockConfig,
    applyModelDefaults: (c) => c,
    applyCompactionDefaults: (c) => c,
    applyContextPruningDefaults: (c) => c,
    applyAgentDefaults: (c) => c,
    applySessionDefaults: (c) => c,
    applyLoggingDefaults: (c) => c,
    applyMessageDefaults: (c) => c,
    applyTalkApiKey: (c) => c,
    applyConfigOverrides: (c) => c,
  };
});

// Mock agent scope
vi.mock("../agents/agent-scope.js", () => {
  return {
    resolveDefaultAgentId: () => "default",
    resolveAgentWorkspaceDir: () => "/tmp/workspace-default",
    listAgentIds: () => ["default"],
  };
});

// Mock skills status
vi.mock("../agents/skills-status.js", () => {
  return {
    buildWorkspaceSkillStatus: () => ({
      skills: [
        {
          skillKey: "test-skill",
          name: "Test Skill",
          description: "A test skill",
          disabled: false,
          requirements: { bins: [] },
        },
      ],
    }),
  };
});

// Mock skills remote
vi.mock("../infra/skills-remote.js", () => {
  return {
    getRemoteSkillEligibility: () => ({}),
  };
});

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startGatewayServer>>;
let port = 0;

beforeAll(async () => {
  port = await getFreePort();
  server = await startGatewayServer(port);
});

afterAll(async () => {
  await server.close();
  vi.restoreAllMocks();
});

describe("assistant skills api", () => {
  test("GET /assistant/skills requires auth", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/assistant/skills`);
    expect(res.status).toBe(401);
  });

  test("GET /assistant/skills rejects invalid token", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/assistant/skills`, {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });
    expect(res.status).toBe(401);
  });

  test("GET /assistant/skills accepts valid token", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/assistant/skills`, {
      headers: {
        Authorization: "Bearer test-token-123",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.message).toBe("OK");
    expect(Array.isArray(body.data.skills)).toBe(true);
  });

  test("PATCH /assistant/skills/{id} requires auth", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/assistant/skills/some-skill`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(401);
  });

  test("PATCH /assistant/skills/{id} updates skill status with valid token", async () => {
    const resList = await fetch(`http://127.0.0.1:${port}/assistant/skills`, {
      headers: {
        Authorization: "Bearer test-token-123",
      },
    });
    const bodyList = await resList.json();
    const skills = bodyList.data.skills;

    if (skills.length > 0) {
      const skill = skills[0];
      const newStatus = !skill.enabled;

      const resUpdate = await fetch(`http://127.0.0.1:${port}/assistant/skills/${skill.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token-123",
        },
        body: JSON.stringify({ enabled: newStatus }),
      });

      expect(resUpdate.status).toBe(200);
      const bodyUpdate = await resUpdate.json();
      expect(bodyUpdate.data.enabled).toBe(newStatus);
    }
  });
});
