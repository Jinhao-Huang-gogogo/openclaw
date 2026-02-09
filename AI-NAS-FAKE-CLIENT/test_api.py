#!/usr/bin/env python3
"""
ai-nas 伪服务端 API 测试脚本。
请先启动 app.py，再运行本脚本：python test_api.py
"""
import sys
import argparse

try:
    import requests
except ImportError:
    print("请先安装 requests: pip install requests")
    sys.exit(1)

# 默认配置：与 app.py 一致
BASE_URL = "http://172.26.13.70:5000"
ACCESS_TOKEN = "ainas-token"

# 统一请求头（带 Token）
AUTH_HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json",
}


def ok(name: str, res: requests.Response, expect_code: int = 200) -> bool:
    """检查响应是否为 expect_code，并打印结果。"""
    try:
        data = res.json()
    except Exception:
        print(f"  [FAIL] {name}: 响应非 JSON")
        return False
    code = data.get("code")
    msg = data.get("message", "")
    if code == expect_code:
        print(f"  [OK]   {name} (code={code})")
        return True
    print(f"  [FAIL] {name}: 期望 code={expect_code}, 实际 code={code}, message={msg}")
    return False


def has_keys(obj: dict, keys: list) -> bool:
    """检查 obj 是否包含所有 keys。"""
    return all(k in obj for k in keys)


def run_tests(base_url: str) -> int:
    base = base_url.rstrip("/")
    failed = 0

    print("=" * 60)
    print("ai-nas API 测试")
    print(f"BASE_URL = {base}")
    print("=" * 60)

    # --- 1. 认证：无 Token 应返回 401 ---
    print("\n1. 认证（无 Token 应 401）")
    res = requests.get(f"{base}/api/v1/system/status")
    if not ok("GET /api/v1/system/status 无 Token → 401", res, 401):
        failed += 1

    # --- 2. 智能文件搜索 ---
    print("\n2. 智能文件搜索 POST /api/v1/files/search")
    res = requests.post(
        f"{base}/api/v1/files/search",
        headers=AUTH_HEADERS,
        json={"query": "项目报告", "page": 1, "size": 20},
    )
    if not ok("文件搜索（带 query）", res):
        failed += 1
    else:
        data = res.json().get("data", {})
        if not (has_keys(data, ["items", "pagination"]) and isinstance(data["items"], list)):
            print(f"  [FAIL] 响应 data 缺少 items/pagination 或 items 非数组")
            failed += 1

    # --- 3. 执行文件操作 ---
    print("\n3. 执行文件操作 POST /api/v1/files/actions")
    # 3.1 move
    res = requests.post(
        f"{base}/api/v1/files/actions",
        headers=AUTH_HEADERS,
        json={
            "action": "move",
            "sourceFileIds": ["file_123"],
            "targetFolderId": "folder_456",
        },
    )
    if not ok("文件操作 move", res):
        failed += 1
    else:
        d = res.json().get("data", {})
        if not has_keys(d, ["successCount", "operationId"]):
            print(f"  [FAIL] data 缺少 successCount/operationId")
            failed += 1
    # 3.2 delete
    res = requests.post(
        f"{base}/api/v1/files/actions",
        headers=AUTH_HEADERS,
        json={"action": "delete", "sourceFileIds": ["file_789"]},
    )
    if not ok("文件操作 delete", res):
        failed += 1
    # 3.3 create_folder
    res = requests.post(
        f"{base}/api/v1/files/actions",
        headers=AUTH_HEADERS,
        json={
            "action": "create_folder",
            "targetFolderId": "folder_000",
            "newName": "新文件夹",
        },
    )
    if not ok("文件操作 create_folder", res):
        failed += 1

    # --- 4. AI 相册语义搜索 ---
    print("\n4. AI 相册语义搜索 POST /api/v1/media/ai-search")
    res = requests.post(
        f"{base}/api/v1/media/ai-search",
        headers=AUTH_HEADERS,
        json={"query": "海边夕阳", "mediaType": "video", "page": 1, "size": 20},
    )
    if not ok("媒体语义搜索", res):
        failed += 1
    else:
        data = res.json().get("data", {})
        if not (has_keys(data, ["items", "pagination"]) and isinstance(data["items"], list)):
            print(f"  [FAIL] 响应 data 缺少 items/pagination")
            failed += 1

    # --- 5. 获取相册分类列表 ---
    print("\n5. 获取相册分类列表 GET /api/v1/media/albums/categories")
    res = requests.get(f"{base}/api/v1/media/albums/categories", headers=AUTH_HEADERS)
    if not ok("相册分类（全部）", res):
        failed += 1
    else:
        data = res.json().get("data", {})
        if "categories" not in data or not isinstance(data["categories"], list):
            print(f"  [FAIL] data.categories 缺失或非数组")
            failed += 1
    res = requests.get(
        f"{base}/api/v1/media/albums/categories?type=person",
        headers=AUTH_HEADERS,
    )
    if not ok("相册分类 type=person", res):
        failed += 1

    # --- 6. 获取系统状态 ---
    print("\n6. 获取系统状态 GET /api/v1/system/status")
    res = requests.get(f"{base}/api/v1/system/status", headers=AUTH_HEADERS)
    if not ok("系统状态", res):
        failed += 1
    else:
        data = res.json().get("data", {})
        if not has_keys(data, ["storage", "memory", "cpu", "uptime"]):
            print(f"  [FAIL] data 缺少 storage/memory/cpu/uptime")
            failed += 1

    # --- 7. 验证操作权限 ---
    print("\n7. 验证操作权限 POST /api/v1/auth/check-permission")
    res = requests.post(
        f"{base}/api/v1/auth/check-permission",
        headers=AUTH_HEADERS,
        json={
            "action": "delete",
            "resourceType": "file",
            "resourceId": "file_123456",
        },
    )
    if not ok("权限校验", res):
        failed += 1
    else:
        data = res.json().get("data", {})
        if "granted" not in data:
            print(f"  [FAIL] data 缺少 granted")
            failed += 1

    # --- 8. 错误参数（期望 400）---
    print("\n8. 错误参数（期望 400）")
    res = requests.post(
        f"{base}/api/v1/files/search",
        headers=AUTH_HEADERS,
        json={},
    )
    if not ok("文件搜索无 query → 400", res, 400):
        failed += 1

    res = requests.post(
        f"{base}/api/v1/files/actions",
        headers=AUTH_HEADERS,
        json={"action": "move"},  # 缺 sourceFileIds、targetFolderId
    )
    if not ok("文件操作缺参数 → 400", res, 400):
        failed += 1

    print("\n" + "=" * 60)
    if failed == 0:
        print("全部通过")
    else:
        print(f"失败数: {failed}")
    print("=" * 60)
    return failed


def main():
    parser = argparse.ArgumentParser(description="ai-nas 伪服务端 API 测试")
    parser.add_argument(
        "-u", "--url",
        default=BASE_URL,
        help=f"服务根地址，默认 {BASE_URL}",
    )
    args = parser.parse_args()
    sys.exit(run_tests(args.url))


if __name__ == "__main__":
    main()
