"""
ai-nas 伪服务端：接收 OpenClaw 的请求，按《NAS能力接口规范_v1.0》返回标准响应。
用于在无真实 NAS 时供 OpenClaw 调用与联调。

认证：采用 Bearer Token。默认假定已完成初始化，有效访问令牌为 ainas-token；
所有请求需在请求头携带 Authorization: Bearer ainas-token。
"""
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# 默认有效访问令牌（假定初始化已完成，不再提供预共享密钥换 token 的接口）
ACCESS_TOKEN = "ainas-token"


def make_response(code: int, message: str, data=None, request_id: str = None):
    """构造规范要求的统一响应格式。"""
    return jsonify({
        "code": code,
        "message": message,
        "data": data if data is not None else {},
        "requestId": request_id or str(uuid.uuid4()),
    })


def _get_bearer_token():
    """从请求头解析 Authorization: Bearer {access_token}，未携带或格式错误返回 None。"""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth[7:].strip() or None


@app.before_request
def require_bearer_token():
    """所有 /api/v1/ 请求必须携带有效 Bearer Token（ainas-token），否则 401。"""
    if not request.path.startswith("/api/v1/"):
        return None

    # 收到 API 请求时打印请求头
    print(f"[API] {request.method} {request.path} - 请求头:")
    for name, value in request.headers:
        print(f"  {name}: {value}")

    token = _get_bearer_token()
    if not token:
        return make_response(401, "认证失败：未携带访问令牌", {}, str(uuid.uuid4()))
    if token != ACCESS_TOKEN:
        return make_response(401, "认证失败：令牌无效或已过期", {}, str(uuid.uuid4()))
    return None


# ---------- 3.1.1 智能文件搜索 POST /api/v1/files/search ----------
@app.route("/api/v1/files/search", methods=["POST"])
def files_search():
    body = request.get_json(silent=True) or {}
    query = body.get("query")
    if not query:
        return make_response(400, "请求参数错误：query 必填", {}, str(uuid.uuid4()))

    page = body.get("page", 1)
    size = body.get("size", 20)

    # 伪代码：根据请求体返回符合规范的 data
    data = {
        "items": [
            {
                "id": "file_123456",
                "name": "Q3项目总结.pptx",
                "path": "/我的空间/工作/项目报告/Q3项目总结.pptx",
                "spaceType": body.get("spaceType", "personal"),
                "type": "presentation",
                "size": 2048576,
                "lastModified": "2023-10-25T15:30:00Z",
                "downloadUrl": "https://nas.example/download?token=xxx",
            }
        ],
        "pagination": {
            "page": page,
            "size": size,
            "total": 150,
        },
    }
    return make_response(200, "OK", data)


# ---------- 3.1.2 执行文件操作 POST /api/v1/files/actions ----------
@app.route("/api/v1/files/actions", methods=["POST"])
def files_actions():
    body = request.get_json(silent=True) or {}
    action = body.get("action")
    if not action:
        return make_response(400, "请求参数错误：action 必填", {}, str(uuid.uuid4()))

    valid_actions = ("move", "copy", "rename", "delete", "create_folder")
    if action not in valid_actions:
        return make_response(400, f"action 取值不合法，应为 {valid_actions}", {}, str(uuid.uuid4()))

    # 伪代码：按 action 做简单必填校验后直接返回成功
    if action in ("delete", "rename", "move", "copy") and not body.get("sourceFileIds"):
        return make_response(400, "请求参数错误：sourceFileIds 必填", {}, str(uuid.uuid4()))
    if action in ("move", "copy", "create_folder") and not body.get("targetFolderId"):
        return make_response(400, "请求参数错误：targetFolderId 必填", {}, str(uuid.uuid4()))
    if action in ("rename", "create_folder") and not body.get("newName"):
        return make_response(400, "请求参数错误：newName 必填", {}, str(uuid.uuid4()))

    data = {
        "successCount": len(body.get("sourceFileIds", [1])),
        "failCount": 0,
        "failedItems": [],
        "operationId": f"op_{uuid.uuid4().hex[:12]}",
    }
    return make_response(200, "OK", data)


# ---------- 3.2.1 AI相册语义搜索 POST /api/v1/media/ai-search ----------
@app.route("/api/v1/media/ai-search", methods=["POST"])
def media_ai_search():
    body = request.get_json(silent=True) or {}
    query = body.get("query")
    if not query:
        return make_response(400, "请求参数错误：query 必填", {}, str(uuid.uuid4()))

    page = body.get("page", 1)
    size = body.get("size", 20)
    media_type = body.get("mediaType", "all")

    data = {
        "items": [
            {
                "id": "media_987654",
                "type": "video" if media_type == "video" else "photo",
                "thumbnailUrl": "https://nas.example/thumbnail?token=xxx",
                "previewUrl": "https://nas.example/preview?token=xxx",
                "originalFile": {
                    "fileId": "file_135790",
                    "name": "IMG_20220715_183045.mp4",
                    "path": "/我的空间/相册/2022夏天/IMG_20220715_183045.mp4",
                },
                "aiMetadata": {
                    "scenes": ["海滩", "日落"],
                    "objects": ["狗", "人"],
                    "colors": ["橙色", "蓝色"],
                    "estimatedTime": "2022-07-15T18:30:00Z",
                },
            }
        ],
        "pagination": {
            "page": page,
            "size": size,
            "total": 150,
        },
    }
    return make_response(200, "OK", data)


# ---------- 3.2.2 获取相册分类列表 GET /api/v1/media/albums/categories ----------
@app.route("/api/v1/media/albums/categories", methods=["GET"])
def media_albums_categories():
    # 可选查询参数 type: person / pet / scene / location
    category_type = request.args.get("type")

    categories = [
        {"id": "cat_person_1", "name": "小明", "type": "person", "coverMediaId": "media_987654", "mediaCount": 42},
        {"id": "cat_scene_1", "name": "海滩", "type": "scene", "coverMediaId": "media_123456", "mediaCount": 15},
        {"id": "cat_pet_1", "name": "狗狗", "type": "pet", "coverMediaId": "media_111222", "mediaCount": 8},
        {"id": "cat_location_1", "name": "北京", "type": "location", "coverMediaId": "media_333444", "mediaCount": 23},
    ]
    if category_type:
        categories = [c for c in categories if c["type"] == category_type]

    data = {"categories": categories}
    return make_response(200, "OK", data)


# ---------- 3.3.1 获取实时系统状态 GET /api/v1/system/status ----------
@app.route("/api/v1/system/status", methods=["GET"])
def system_status():
    data = {
        "storage": {
            "total": 42949672960,
            "used": 21474836480,
            "usagePercentage": 50,
        },
        "memory": {
            "total": 4096,
            "used": 2048,
            "usagePercentage": 50,
        },
        "cpu": {
            "usagePercentage": 15.5,
        },
        "uptime": 1234567,
    }
    return make_response(200, "OK", data)


# ---------- 3.4.1 验证操作权限 POST /api/v1/auth/check-permission ----------
@app.route("/api/v1/auth/check-permission", methods=["POST"])
def auth_check_permission():
    body = request.get_json(silent=True) or {}
    action = body.get("action")
    resource_type = body.get("resourceType")
    resource_id = body.get("resourceId")

    if not action or not resource_type or not resource_id:
        return make_response(400, "请求参数错误：action / resourceType / resourceId 必填", {}, str(uuid.uuid4()))

    # 伪代码：例如 delete 且 resourceId 以 file_system_ 开头则拒绝，其余通过
    granted = True
    if action == "delete" and resource_id.startswith("file_system_"):
        granted = False

    data = {"granted": granted}
    return make_response(200, "OK", data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
