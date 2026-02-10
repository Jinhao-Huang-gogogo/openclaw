import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { buildWorkspaceSkillStatus } from "../../agents/skills-status.js";
import { loadConfig, writeConfigFile, type OpenClawConfig } from "../../config/config.js";
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";
import { readJsonBodyOrError, sendJson } from "../http-common.js";

type SkillResponse = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  iconUrl?: string;
  prerequisites?: string;
};

export async function handleAssistantSkillsRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (!url.pathname.startsWith("/assistant/skills")) {
    return false;
  }

  const id = url.pathname.slice("/assistant/skills".length).replace(/^\//, "");

  const cfg = loadConfig();
  // Check Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendJson(res, 401, {
      code: 401,
      message: "Unauthorized: Missing or invalid token format",
      requestId: crypto.randomUUID(),
    });
    return true;
  }

  const token = authHeader.slice(7).trim();
  // ainas config might be nested under plugins.entries.ainas.config.accessToken or similar
  // oxlint-disable-next-line typescript/no-explicit-any
  const ainasConfig = (cfg.plugins?.entries?.ainas?.config ?? {}) as { accessToken?: string };
  const expectedToken = ainasConfig?.accessToken;

  if (!expectedToken || token !== expectedToken) {
    sendJson(res, 401, {
      code: 401,
      message: "Unauthorized: Invalid token",
      requestId: crypto.randomUUID(),
    });
    return true;
  }

  if (req.method === "GET" && !id) {
    return handleGetSkills(req, res, cfg);
  }

  if (req.method === "PATCH" && id) {
    return handleUpdateSkill(req, res, id, cfg);
  }

  return false;
}

async function handleGetSkills(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: OpenClawConfig,
): Promise<boolean> {
  const agentId = resolveDefaultAgentId(cfg);
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  const report = buildWorkspaceSkillStatus(workspaceDir, {
    config: cfg,
    eligibility: { remote: getRemoteSkillEligibility() },
  });

  const skills: SkillResponse[] = report.skills.map((skill) => ({
    id: skill.skillKey,
    name: skill.name,
    description: skill.description,
    enabled: !skill.disabled,
    // TODO: Map iconUrl if available in metadata
    // iconUrl: skill.metadata?.iconUrl,
    // TODO: Map prerequisites based on requirements
    prerequisites:
      skill.requirements.bins.length > 0
        ? `Requires binaries: ${skill.requirements.bins.join(", ")}`
        : undefined,
  }));

  sendJson(res, 200, {
    code: 200,
    message: "OK",
    data: { skills },
    requestId: crypto.randomUUID(),
  });
  return true;
}

async function handleUpdateSkill(
  req: IncomingMessage,
  res: ServerResponse,
  skillKey: string,
  cfg: OpenClawConfig,
): Promise<boolean> {
  const bodyUnknown = await readJsonBodyOrError(req, res, 1024 * 1024);
  if (bodyUnknown === undefined) {
    return true;
  }
  const body = bodyUnknown as { enabled?: boolean };

  if (typeof body.enabled !== "boolean") {
    sendJson(res, 400, {
      code: 400,
      message: "Invalid request: enabled must be a boolean",
      requestId: crypto.randomUUID(),
    });
    return true;
  }

  // NOTE: In production, we should probably fetch the latest config again
  // to avoid race conditions, but for this simple skill toggle,
  // reusing the loaded config object (which we just verified auth against) is acceptable
  // or we can reload to be safe. Since we need to write back, we should probably work on a fresh object copy or be careful.
  // The original implementation loaded config inside the function.
  // Let's use the passed config object but ensure we don't mutate it in place if it's cached (though loadConfig usually returns fresh object).
  // The previous implementation was: const cfg = loadConfig();

  const skills = cfg.skills ? { ...cfg.skills } : {};
  const entries = skills.entries ? { ...skills.entries } : {};
  const current = entries[skillKey] ? { ...entries[skillKey] } : {};

  // Update enabled status (stored as enabled in config, mapped to disabled in status report)
  current.enabled = body.enabled;

  entries[skillKey] = current;
  skills.entries = entries;
  const nextConfig: OpenClawConfig = {
    ...cfg,
    skills,
  };
  await writeConfigFile(nextConfig);

  sendJson(res, 200, {
    code: 200,
    message: "Skill updated successfully",
    data: {
      id: skillKey,
      enabled: body.enabled,
      updatedTime: new Date().toISOString(),
    },
    requestId: crypto.randomUUID(),
  });
  return true;
}
