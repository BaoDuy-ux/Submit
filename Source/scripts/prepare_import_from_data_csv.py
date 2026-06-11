import argparse
import csv
import re
from pathlib import Path


def list_image_index(images_dir: Path):
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [p for p in images_dir.rglob("*") if p.is_file() and p.suffix.lower() in exts]
    by_lower = {p.name.lower(): p for p in files}
    # also group by leading token (SKU)
    by_sku = {}
    for p in files:
        stem = p.stem.strip()
        sku_key = re.split(r"[\s_\-\.]+", stem)[0].upper()
        if sku_key:
            by_sku.setdefault(sku_key, []).append(p)
    return by_lower, by_sku


def pick_image_for_sku(sku: str, by_lower: dict, by_sku: dict):
    sku_u = (sku or "").strip().upper()
    if not sku_u:
        return ""
    # Exact filename match first
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        key = f"{sku_u}{ext}".lower()
        if key in by_lower:
            return by_lower[key].name
    # Otherwise any file that starts with SKU in stem (handles ASC051c.jpg)
    candidates = by_sku.get(sku_u, [])
    if not candidates:
        # try prefix match among keys
        for k, arr in by_sku.items():
            if k.startswith(sku_u) or sku_u.startswith(k):
                candidates = arr
                break
    if not candidates:
        return ""
    # Prefer jpg, then largest file (often higher quality)
    def score(p: Path):
        ext_rank = {".jpg": 0, ".jpeg": 1, ".png": 2, ".webp": 3}.get(p.suffix.lower(), 9)
        return (ext_rank, -p.stat().st_size)

    candidates = sorted(candidates, key=score)
    return candidates[0].name


def main():
    ap = argparse.ArgumentParser(description="Convert data.csv into import_products.csv with image_file mapped by SKU.")
    ap.add_argument("--input", required=True, help="Path to data.csv")
    ap.add_argument("--images-dir", required=True, help="Folder containing extracted images")
    ap.add_argument("--output", required=True, help="Output CSV path for import_products.py")
    args = ap.parse_args()

    input_path = Path(args.input).resolve()
    images_dir = Path(args.images_dir).resolve()
    output_path = Path(args.output).resolve()

    by_lower, by_sku = list_image_index(images_dir)

    rows = None
    last_err = None
    for enc in ["utf-8-sig", "utf-8", "cp1258", "cp1252", "latin-1"]:
        try:
            with input_path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            last_err = None
            break
        except UnicodeDecodeError as ex:
            last_err = ex
    if rows is None:
        raise last_err or RuntimeError("Failed to read CSV with supported encodings")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "name",
        "category",
        "sku",
        "price",
        "brand",
        "material",
        "colors",
        "sizes",
        "stock_by_size",
        "image_url",
        "image_file",
    ]

    missing = 0
    with output_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            sku = (r.get("sku") or "").strip()
            image_file = pick_image_for_sku(sku, by_lower, by_sku)
            if not image_file:
                missing += 1
            w.writerow(
                {
                    "name": (r.get("name") or "").strip(),
                    "category": (r.get("category") or "").strip(),
                    "sku": sku,
                    "price": (r.get("price") or "").strip(),
                    "brand": (r.get("brand") or "").strip(),
                    "material": (r.get("material") or "").strip(),
                    # input uses ';' separator, import script accepts comma/semicolon/pipe
                    "colors": (r.get("colors") or "").strip(),
                    "sizes": (r.get("sizes") or "").strip(),
                    # input uses 'stockBySize' with ';' separators like M:7;L:9
                    "stock_by_size": (r.get("stockBySize") or "").strip().replace(";", "|"),
                    "image_url": "",
                    "image_file": image_file,
                }
            )

    print(f"Wrote: {output_path}")
    if missing:
        print(f"WARNING: missing images for {missing} SKU(s).")


if __name__ == "__main__":
    main()

