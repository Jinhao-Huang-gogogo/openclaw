---
name: ainas
description: Search files, AI media, and album categories on AINAS NAS.
metadata:
  {
    "openclaw":
      {
        "emoji": "🗄️",
        "skillKey": "ainas",
        "requires":
          {
            "config":
              ["plugins.entries.ainas.config.baseUrl", "plugins.entries.ainas.config.accessToken"],
          },
      },
  }
---

# AINAS

通过自然语言控制 AINAS 的媒体搜索、文件搜索和相册分类。

## 工具

- **search_files**：按关键词或自然语言搜索文件
- **search_media_by_prompt**：按自然语言搜索图片/视频（AI 语义）
- **list_album_categories**：列出相册分类（人物、宠物、场景、地点等）

## 前置配置

在 `plugins.entries.ainas.config` 下配置 `baseUrl` 和 `accessToken`，并启用插件。
