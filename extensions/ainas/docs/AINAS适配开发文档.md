# AINAS 扩展开发文档

## 开发目标

基于 OpenClaw 控制 AINAS NAS 的媒体搜索和相册搜索功能，主要实现以下 API 映射：

| 函数                     | AINAS API                    | 说明            |
| ------------------------ | ---------------------------- | --------------- |
| `search_files`           | POST /files/search           | 智能文件搜索    |
| `search_media_by_prompt` | POST /media/ai-search        | AI 相册语义搜索 |
| `list_album_categories`  | GET /media/albums/categories | 相册分类列表    |

API 接口规范：`OpenClaw_NAS智能中枢系统-NAS能力接口规范_v1.0.pdf`

---

## 一、项目结构

```
extensions/ainas/
├── index.ts              # 插件入口，向 OpenClaw 注册三个工具
├── openclaw.plugin.json  # 插件清单：id、名称、描述、配置 schema
├── package.json          # 包信息，openclaw.extensions 指向 index.ts
├── README.md
└── src/
    ├── client.ts         # AINAS REST API 客户端（Bearer 认证、统一响应格式）
    └── tools.ts          # 三个工具的工厂函数及参数 schema
```

## 二、运行原理

1. **插件加载**：OpenClaw 从 `extensions/` 发现 ainas 插件，加载 `index.ts` 并执行 `register(api)`。
2. **工具注册**：`api.registerTool(...)` 将三个工具加入 Agent 的工具池，Agent 可根据用户意图自动选择调用。
3. **配置注入**：`plugins.entries.ainas.config` 中的 `baseUrl`、`accessToken` 在工具执行时注入，用于构造 AINAS HTTP 请求。
4. **API 调用**：每个工具通过 `AinasClient` 发送 REST 请求到 AINAS，解析统一响应格式 `{ code, message, data, requestId }`，`code !== 200` 时抛出错误。

## 三、配置与使用

### 3.1 配置

在 `~/.openclaw/openclaw.json` 或项目配置中：

```json
{
  "plugins": {
    "entries": {
      "ainas": {
        "enabled": true,
        "config": {
          "baseUrl": "https://nas-device-ip:port/api/v1",
          "accessToken": "ainas-token"
        }
      }
    }
  }
}
```

- **baseUrl**：AINAS API 根路径，如 `https://192.168.1.100:8443/api/v1`
- **accessToken**：Bearer 令牌，由 NAS 在初始化阶段提供

### 3.2 启用插件

```bash
openclaw plugins enable ainas
# 修改配置后需重启 Gateway
```

### 3.3 自然语言示例

- “搜索上周修改过的项目报告 PPT” → 调用 `search_files`
- “找去年夏天海边的视频，有狗和夕阳” → 调用 `search_media_by_prompt`
- “列出相册的人物和宠物分类” → 调用 `list_album_categories`

---

## 四、与 AINAS 联调测试

### 4.1 前置条件

- AINAS NAS 已部署并对外暴露 API
- 已获得有效的 `access_token`（预共享密钥换取）
- OpenClaw 与 AINAS 网络可达

### 4.2 联调步骤

1. **配置 AINAS 地址与令牌**

   ```bash
   openclaw config set plugins.entries.ainas.config.baseUrl "http://AINAS_IP:PORT/api/v1"
   openclaw config set plugins.entries.ainas.config.accessToken "YOUR_TOKEN"
   openclaw plugins enable ainas
   ```

2. **Mock 或真实 AINAS**
   - **真实**：直接连接已部署的 AINAS 环境。

3. **验证连通性**

   ```bash
   # 示例：用 curl 测试 /media/albums/categories
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "http://AINAS_IP:PORT/api/v1/media/albums/categories"
   ```

4. **通过 OpenClaw Agent 测试**
   - 启动 Gateway：`openclaw gateway` 或通过 Mac 应用
   - 在任意已连接渠道（如 Telegram、Web UI）发送自然语言请求
   - 观察 Agent 是否调用 `search_files`、`search_media_by_prompt`、`list_album_categories`

5. **日志排查**
   - 查看 Gateway 日志中的工具调用与错误堆栈
   - AINAS 返回的 `requestId` 可用于在 NAS 侧追踪请求

### 4.3 常见问题

- **401**：`accessToken` 无效或过期，需重新获取
- **403**：权限不足，检查 NAS 侧授权
- **404**：baseUrl 或路径错误，确认包含 `/api/v1`
- **插件未加载**：确认 `plugins.entries.ainas.enabled` 为 true，并已重启 Gateway
