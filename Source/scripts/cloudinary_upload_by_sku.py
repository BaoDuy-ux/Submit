import argparse
import csv
import os
import sys
from pathlib import Path

import requests


def eprint(*args):
    print(*args, file=sys.stderr)


def build_image_index(images_dir: Path) -> dict[str, Path]:
    """Map lowercase filename -> absolute path (search subfolders)."""
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    index: dict[str, Path] = {}
    for p in images_dir.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            key = p.name.lower()
            if key not in index:
                index[key] = p
    return index


def find_image(images_dir: Path, image_file: str, index: dict[str, Path] | None = None) -> Path | None:
    name = (image_file or "").strip()
    if not name:
        return None
    direct = (images_dir / name).resolve()
    if direct.exists():
        return direct
    if index is None:
        index = build_image_index(images_dir)
    return index.get(name.lower())


def cloudinary_upload_unsigned(cloud_name: str, upload_preset: str, image_path: Path, public_id: str, folder: str):
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    data = {
        "upload_preset": upload_preset,
        "public_id": public_id,
        "folder": folder,
    }
    with image_path.open("rb") as f:
        files = {"file": f}
        r = requests.post(url, data=data, files=files, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"Cloudinary upload failed ({r.status_code}): {r.text}")
    j = r.json()
    secure_url = j.get("secure_url")
    if not secure_url:
        raise RuntimeError(f"Cloudinary response missing secure_url: {j}")
    return secure_url


def main():
    ap = argparse.ArgumentParser(description="Upload images to Cloudinary unsigned, using SKU as public_id.")
    ap.add_argument("--cloud-name", default=os.getenv("CLOUDINARY_CLOUD_NAME", ""), required=False)
    ap.add_argument("--upload-preset", default=os.getenv("CLOUDINARY_UPLOAD_PRESET", ""), required=False)
    ap.add_argument("--folder", default=os.getenv("CLOUDINARY_FOLDER", "is207-products"))
    ap.add_argument("--input-csv", required=True, help="scripts/import_products.csv")
    ap.add_argument("--images-dir", required=True, help="Folder that contains the mapped image_file names")
    ap.add_argument("--output-csv", required=True, help="Output CSV with image_url filled")
    args = ap.parse_args()

    cloud_name = (args.cloud_name or "").strip()
    upload_preset = (args.upload_preset or "").strip()
    if not cloud_name or not upload_preset:
        eprint("ERROR: missing Cloudinary config.")
        eprint("Provide --cloud-name and --upload-preset, or set env CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET.")
        eprint("Note: use an UNSIGNED upload preset (Settings → Upload → Upload presets).")
        return 2

    input_csv = Path(args.input_csv).resolve()
    images_dir = Path(args.images_dir).resolve()
    output_csv = Path(args.output_csv).resolve()
    output_csv.parent.mkdir(parents=True, exist_ok=True)

    with input_csv.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys()) if rows else []

    if "image_url" not in fieldnames:
        fieldnames.append("image_url")

    image_index = build_image_index(images_dir)
    print(f"Found {len(image_index)} image file(s) under {images_dir}")

    ok = 0
    fail = 0
    for r in rows:
        sku = (r.get("sku") or "").strip()
        image_file = (r.get("image_file") or "").strip()
        if not sku or not image_file:
            r["image_url"] = ""
            fail += 1
            eprint(f"SKIP {sku or '?'}: missing sku or image_file")
            continue

        img_path = find_image(images_dir, image_file, image_index)
        if not img_path:
            r["image_url"] = ""
            fail += 1
            eprint(f"SKIP {sku}: file not found: {image_file}")
            continue

        try:
            secure_url = cloudinary_upload_unsigned(
                cloud_name=cloud_name,
                upload_preset=upload_preset,
                image_path=img_path,
                public_id=sku,
                folder=args.folder,
            )
            r["image_url"] = secure_url
            ok += 1
            print(f"OK {sku} -> {secure_url}")
        except Exception as ex:
            r["image_url"] = ""
            fail += 1
            eprint(f"FAIL {sku}: {type(ex).__name__}: {ex}")

    with output_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    print(f"Wrote: {output_csv}")
    print(f"Done. ok={ok} fail={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

