# AINAS Extension

OpenClaw 插件，用于通过自然语言控制 AINAS NAS 的媒体搜索、文件搜索和相册分类功能。

## 功能

| 工具                     | AINAS API                    | 说明                                     |
| ------------------------ | ---------------------------- | ---------------------------------------- |
| `search_files`           | POST /files/search           | 智能文件搜索，支持关键词或自然语言       |
| `search_media_by_prompt` | POST /media/ai-search        | AI 相册语义搜索，按自然语言查找图片/视频 |
| `list_album_categories`  | GET /media/albums/categories | 获取 AI 生成的相册分类列表               |

## 配置

在 `~/.openclaw/openclaw.json` 或项目配置中设置：

```json5
{
  plugins: {
    entries: {
      ainas: {
        enabled: true,
        config: {
          baseUrl: "https://nas.example.com:8443/api/v1",
          accessToken: "ainas-token",
        },
      },
    },
  },
}
```

- **baseUrl**: AINAS API 根路径，格式 `http(s)://{nas_ip}:{port}/api/v1`
- **accessToken**: Bearer 认证令牌（由 NAS 系统在初始化阶段提供），需提供接口，目前默认access_token已经获得。后续如果有接口可以再进行修改。

## 启用

```bash
openclaw plugins enable ainas
```

启用后重启 Gateway 使配置生效。

```bash
openclaw gataway restart
```

## 使用示例

启用插件后，Agent 可通过自然语言调用：

- “帮我搜索上周修改过的项目报告”
- “找去年夏天海边的视频，有狗和夕阳”
- “列出相册里的人物分类”

## 项目结构

```
extensions/ainas/
├── index.ts              # 插件入口，注册三个工具
├── openclaw.plugin.json  # 插件清单与配置 schema
├── package.json
├── README.md
└── src/
    ├── client.ts         # AINAS HTTP 客户端
    └── tools.ts          # search_files, search_media_by_prompt, list_album_categories
```

## 与 AINAS 联调

参见根目录 `开发文档` 中的联调说明。
