# ai-nas 伪服务端使用说明

本服务是 **OpenClaw NAS 能力接口** 的伪实现：接收请求后按《OpenClaw_NAS智能中枢系统-NAS能力接口规范\_v1.0》返回标准 JSON 响应，不连接真实 NAS。用于 OpenClaw 智能家庭中枢的联调与测试。

---

## 一、环境与依赖

- **Python**：3.7+
- **依赖**：Flask（见 `requirements.txt`）

---

## 二、安装与运行

### 安装依赖

```bash
cd /data/jinhao.huang/ai-nas-fake
pip install -r requirements.txt
```

### 启动服务

```bash
python app.py
```

默认监听 **`http://0.0.0.0:5000`**，即本机 5000 端口，局域网内可通过 `http://<本机IP>:5000` 访问。

### 自定义端口（可选）

修改 `app.py` 最后一行：

```python
app.run(host="0.0.0.0", port=8080, debug=True)  # 例如改为 8080
```

---

## 三、认证说明

本服务假定 **初始化已完成**，不再提供「预共享密钥换取 access_token」的接口。  
有效访问令牌固定为：**`ainas-token`**。

所有 `/api/v1/` 下的请求必须在请求头携带：

```
Authorization: Bearer ainas-token
```

未携带或 Token 错误的请求将返回 **401**，且不会执行业务逻辑。

---

## 四、API 列表与用法

**基础路径**：`http://<NAS_IP>:<port>/api/v1`  
以下示例假设服务在 `http://localhost:5000`，即基础路径为 `http://localhost:5000/api/v1`。  
**所有接口均需在请求头携带** `Authorization: Bearer ainas-token`。

### 4.1 文件与空间管理

| 方法 | 路径                    | 说明                                             |
| ---- | ----------------------- | ------------------------------------------------ |
| POST | `/api/v1/files/search`  | 智能文件搜索                                     |
| POST | `/api/v1/files/actions` | 执行文件操作（移动/复制/重命名/删除/创建文件夹） |

**智能文件搜索** 请求体示例：

```json
{
  "query": "上周修改过的项目报告PPT",
  "spaceType": "personal",
  "fileTypes": ["document", "presentation"],
  "dateRange": { "start": "2023-10-20T00:00:00Z", "end": "2023-10-27T23:59:59Z" },
  "page": 1,
  "size": 20
}
```

必填：`query`。其余可选。

**执行文件操作** 请求体示例：

- 移动/复制：`action`、`sourceFileIds`、`targetFolderId`
- 重命名：`action`、`sourceFileIds`、`newName`
- 删除：`action`、`sourceFileIds`
- 创建文件夹：`action`、`targetFolderId`、`newName`

---

### 4.2 相册与媒体

| 方法 | 路径                              | 说明             |
| ---- | --------------------------------- | ---------------- |
| POST | `/api/v1/media/ai-search`         | AI 相册语义搜索  |
| GET  | `/api/v1/media/albums/categories` | 获取相册分类列表 |

**AI 相册语义搜索** 请求体：必填 `query`；可选 `mediaType`（photo/video/all）、`dateRange`、`tags`、`page`、`size`。

**相册分类** 查询参数：`type`（可选，person/pet/scene/location），不传则返回所有类型。

---

### 4.3 系统状态

| 方法 | 路径                    | 说明                                       |
| ---- | ----------------------- | ------------------------------------------ |
| GET  | `/api/v1/system/status` | 获取实时系统状态（存储/内存/CPU/运行时间） |

无请求参数。

---

### 4.4 权限校验

| 方法 | 路径                            | 说明                           |
| ---- | ------------------------------- | ------------------------------ |
| POST | `/api/v1/auth/check-permission` | 验证是否具备对某资源的操作权限 |

**请求体**：

```json
{
  "action": "delete",
  "resourceType": "file",
  "resourceId": "file_123456"
}
```

`action`：read / write / delete / admin；`resourceType`：file / space / system。

---

## 五、统一响应格式与错误码

所有接口均返回如下结构的 JSON：

```json
{
  "code": 200,
  "message": "OK",
  "data": {},
  "requestId": "uuid"
}
```

- **code**：业务状态码
  - `200` 成功
  - `400` 请求参数错误
  - `401` 认证失败（未携带或无效 token）
  - `403` 权限不足
  - `404` 资源不存在
  - `500` 服务器内部错误
- **message**：描述信息，失败时说明原因。
- **data**：成功时为业务数据，失败时可为空。
- **requestId**：本次请求唯一标识，便于排查。

---

## 六、调用示例（curl）

固定使用 Token：`ainas-token`。

```bash
# 智能文件搜索
curl -X POST http://localhost:5000/api/v1/files/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ainas-token" \
  -d '{"query": "项目报告", "page": 1, "size": 20}'

# 获取系统状态
curl -X GET http://localhost:5000/api/v1/system/status \
  -H "Authorization: Bearer ainas-token"

# 获取相册分类（仅人物）
curl -X GET "http://localhost:5000/api/v1/media/albums/categories?type=person" \
  -H "Authorization: Bearer ainas-token"
```

未带 Token 或 Token 错误时会返回 401，例如：

```bash
curl -X GET http://localhost:5000/api/v1/system/status
# 返回 code: 401, message: "认证失败：未携带访问令牌"
```

---

## 七、与 OpenClaw 的对接方式

1. 将 OpenClaw 中「NAS 服务地址」配置为：`http://<运行本服务的机器IP>:5000`（若改过端口则对应修改）。
2. 将「访问令牌」配置为：**`ainas-token`**（本服务假定初始化已完成，不再提供换 token 接口）。
3. 所有请求头设置：`Authorization: Bearer ainas-token`。

本服务仅返回规范中的伪数据，不持久化、不连真实 NAS。

---

## 八、OpenClaw Skills API 测试工具 (test_skills_api.py)

`test_skills_api.py` 是一个 Python 客户端脚本，用于测试 OpenClaw Gateway 的技能管理接口 (`/assistant/skills`)。

### 8.1 环境与依赖

- **Python**: 3.x
- **依赖**: `requests`

```bash
pip install requests
```

### 8.2 配置与运行

该脚本支持通过环境变量进行配置：

| 环境变量             | 默认值                   | 说明                                            |
| :------------------- | :----------------------- | :---------------------------------------------- |
| `OPENCLAW_API_URL`   | `http://localhost:18789` | OpenClaw Gateway 的 API 地址                    |
| `AINAS_ACCESS_TOKEN` | `ainas-token`            | 用于认证的 Bearer Token (需与 Gateway 配置一致) |

**运行示例**：

```bash
# 使用默认配置运行 (假设 Gateway 在 localhost:18789，且 Token 为 ainas-token)
python test_skills_api.py

# 指定 Gateway 地址和 Token 运行
export OPENCLAW_API_URL=http://localhost:19001
export AINAS_ACCESS_TOKEN=your-secret-token
python test_skills_api.py
```

### 8.3 等效 curl 命令

您也可以使用 `curl` 直接调用这些接口进行测试。

**获取技能列表 (GET)**

```bash
curl -X GET http://localhost:18789/assistant/skills \
  -H "Authorization: Bearer ainas-token"
```

**启用/禁用技能 (PATCH)**

```bash
# 禁用 id 为 "1password" 的技能
curl -X PATCH http://localhost:18789/assistant/skills/1password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ainas-token" \
  -d '{"enabled": false}'

# 启用 id 为 "1password" 的技能
curl -X PATCH http://localhost:18789/assistant/skills/1password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ainas-token" \
  -d '{"enabled": true}'
```
