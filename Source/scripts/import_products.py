import argparse
import csv
import json
import os
import sys
from pathlib import Path

import requests


def eprint(*args):
    print(*args, file=sys.stderr)


def load_rows(path: Path):
    if path.suffix.lower() in [".json"]:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "products" in data:
            data = data["products"]
        if not isinstance(data, list):
            raise ValueError("JSON must be a list of products (or { products: [...] })")
        return data

    if path.suffix.lower() not in [".csv"]:
        raise ValueError("Only .csv or .json supported")

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def normalize_list(value):
    if value is None:
        return None
    if isinstance(value, list):
        return value
    s = str(value).strip()
    if not s:
        return None
    # Accept JSON array or pipe/comma separated.
    if s.startswith("[") and s.endswith("]"):
        try:
            arr = json.loads(s)
            if isinstance(arr, list):
                return [str(x).strip() for x in arr if str(x).strip()]
        except Exception:
            pass
    parts = [p.strip() for p in s.replace(";", ",").split(",")]
    parts = [p for p in parts if p]
    if not parts:
        # try pipe
        parts = [p.strip() for p in s.split("|") if p.strip()]
    return parts or None


def normalize_stock_by_size(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return {str(k): int(v) for k, v in value.items()}
    s = str(value).strip()
    if not s:
        return None
    # Accept JSON map or "S:10|M:5|L:0"
    if s.startswith("{") and s.endswith("}"):
        try:
            obj = json.loads(s)
            if isinstance(obj, dict):
                return {str(k): int(v) for k, v in obj.items()}
        except Exception:
            pass
    out = {}
    for token in s.split("|"):
        token = token.strip()
        if not token:
            continue
        if ":" not in token:
            continue
        k, v = token.split(":", 1)
        k = k.strip()
        v = v.strip()
        if not k or not v:
            continue
        try:
            out[k] = int(float(v))
        except Exception:
            continue
    return out or None


def backend_upload_image(base_url: str, token: str, image_path: Path) -> str:
    url = base_url.rstrip("/") + "/api/uploads"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with image_path.open("rb") as f:
        files = {"file": (image_path.name, f)}
        r = requests.post(url, headers=headers, files=files, timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"Upload failed ({r.status_code}): {r.text}")
    data = r.json()
    if not data or not data.get("url"):
        raise RuntimeError(f"Upload response missing url: {data}")
    return data["url"]


def backend_create_product(base_url: str, token: str, payload: dict) -> dict:
    url = base_url.rstrip("/") + "/api/products"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"Create product failed ({r.status_code}): {r.text}")
    return r.json()


def main():
    ap = argparse.ArgumentParser(
        description="Import products into IS207 backend (optionally upload local images)."
    )
    ap.add_argument("--base-url", required=True, help="Backend base URL, e.g. https://xxx.up.railway.app")
    ap.add_argument("--token", default=os.getenv("ADMIN_TOKEN", ""), help="Admin JWT token (or set ADMIN_TOKEN env)")
    ap.add_argument("--input", required=True, help="CSV/JSON file path")
    ap.add_argument("--images-dir", default="", help="Folder containing images referenced by image_file")
    ap.add_argument(
        "--upload-images",
        action="store_true",
        help="If set, upload images via POST /api/uploads (note: not persistent on many hosts).",
    )
    args = ap.parse_args()

    base_url = args.base_url.strip().rstrip("/")
    token = (args.token or "").strip()
    if not token:
        eprint("ERROR: missing admin token. Provide --token or set ADMIN_TOKEN env.")
        eprint("Tip: login admin in browser, then copy token from localStorage key 'admin_access_token'.")
        return 2

    input_path = Path(args.input).resolve()
    rows = load_rows(input_path)
    images_dir = Path(args.images_dir).resolve() if args.images_dir else None

    ok = 0
    fail = 0
    for i, row in enumerate(rows, start=1):
        try:
            # Accept both CSV strings and JSON objects
            name = (row.get("name") or "").strip()
            category = (row.get("category") or "").strip()
            sku = (row.get("sku") or "").strip()
            price_raw = row.get("price", 0)
            price = int(float(price_raw)) if str(price_raw).strip() else 0
            brand = (row.get("brand") or "").strip() or None
            material = (row.get("material") or "").strip() or None

            image = (row.get("image_url") or row.get("image") or "").strip() or None
            image_file = (row.get("image_file") or "").strip()
            if args.upload_images and image_file:
                if not images_dir:
                    raise ValueError("images-dir is required when upload-images is enabled")
                img_path = (images_dir / image_file).resolve()
                if not img_path.exists():
                    raise FileNotFoundError(f"Image not found: {img_path}")
                image = backend_upload_image(base_url, token, img_path)
            elif image_file and not image:
                # If user only provides image_file but doesn't want uploads,
                # we keep it as-is to avoid broken URLs.
                pass

            colors = normalize_list(row.get("colors"))
            sizes = normalize_list(row.get("sizes"))
            stock_by_size = normalize_stock_by_size(row.get("stockBySize") or row.get("stock_by_size"))

            payload = {
                "name": name,
                "category": category,
                "sku": sku,
                "price": price,
                "brand": brand,
                "material": material,
                "colors": colors,
                "sizes": sizes,
                "stockBySize": stock_by_size,
                "image": image,
            }

            # Remove nulls so backend validation is clearer
            payload = {k: v for k, v in payload.items() if v is not None}

            if not payload.get("name") or not payload.get("category") or not payload.get("sku"):
                raise ValueError("Missing required fields: name/category/sku")

            created = backend_create_product(base_url, token, payload)
            ok += 1
            print(f"[{i}] OK: {created.get('id')} {payload.get('sku')} - {payload.get('name')}")
        except Exception as ex:
            fail += 1
            eprint(f"[{i}] FAIL: {row.get('sku') or ''} {row.get('name') or ''}")
            eprint(f"      {type(ex).__name__}: {ex}")

    print(f"Done. ok={ok} fail={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

