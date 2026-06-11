"""
Backup MySQL database (cấu trúc + data) ra 1 file .sql.

Dùng cho đồ án IS207 — kết nối tới Railway MySQL (public URL) hoặc MySQL local.

Cách dùng (PowerShell):
    # Cách 1: truyền nguyên connection URL (lấy ở Railway -> MySQL -> Connect -> Public Network)
    python scripts/backup_db.py --url "mysql://root:MATKHAU@host.proxy.rlwy.net:12345/railway"

    # Cách 2: truyền từng tham số
    python scripts/backup_db.py --host host.proxy.rlwy.net --port 12345 --user root --password MATKHAU --database railway

Kết quả: file scripts/backup/web_is207_backup.sql (mặc định) — import lại bằng:
    mysql -u root -p web_is207 < web_is207_backup.sql
hoặc dùng MySQL Workbench / phpMyAdmin -> Import.
"""

from __future__ import annotations

import argparse
import datetime as _dt
from pathlib import Path
from urllib.parse import unquote, urlparse

import pymysql


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Dump MySQL database to a .sql file.")
    p.add_argument("--url", help="mysql://user:pass@host:port/dbname")
    p.add_argument("--host")
    p.add_argument("--port", type=int, default=3306)
    p.add_argument("--user")
    p.add_argument("--password")
    p.add_argument("--database")
    p.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent / "backup" / "web_is207_backup.sql"),
        help="Đường dẫn file .sql xuất ra.",
    )
    return p.parse_args()


def resolve_conn(args: argparse.Namespace) -> dict:
    if args.url:
        u = urlparse(args.url)
        if u.scheme not in ("mysql", "mysql+pymysql"):
            raise SystemExit(f"URL phải bắt đầu bằng mysql:// — nhận được: {u.scheme}")
        return {
            "host": u.hostname,
            "port": u.port or 3306,
            "user": unquote(u.username or ""),
            "password": unquote(u.password or ""),
            "database": (u.path or "/").lstrip("/"),
        }
    missing = [k for k in ("host", "user", "database") if not getattr(args, k)]
    if missing:
        raise SystemExit(f"Thiếu tham số: {', '.join(missing)} (hoặc dùng --url).")
    return {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password or "",
        "database": args.database,
    }


def q_ident(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def sql_value(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (bytes, bytearray)):
        return "0x" + v.hex() if v else "''"
    if isinstance(v, (_dt.datetime, _dt.date, _dt.time)):
        return "'" + str(v) + "'"
    s = str(v)
    s = (
        s.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\x00", "\\0")
    )
    return "'" + s + "'"


def dump(conn_info: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    conn = pymysql.connect(
        host=conn_info["host"],
        port=conn_info["port"],
        user=conn_info["user"],
        password=conn_info["password"],
        database=conn_info["database"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.Cursor,
    )
    dbname = conn_info["database"]
    now = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with conn.cursor() as cur, output.open("w", encoding="utf-8") as f:
        f.write(f"-- IS207 database backup\n")
        f.write(f"-- Database: {dbname}\n")
        f.write(f"-- Generated: {now}\n")
        f.write("-- Charset: utf8mb4\n\n")
        f.write("SET NAMES utf8mb4;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        cur.execute("SHOW TABLES")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Tìm thấy {len(tables)} bảng: {', '.join(tables) or '(trống)'}")

        for t in tables:
            f.write(f"-- ----------------------------\n")
            f.write(f"-- Table structure for `{t}`\n")
            f.write(f"-- ----------------------------\n")
            f.write(f"DROP TABLE IF EXISTS {q_ident(t)};\n")
            cur.execute(f"SHOW CREATE TABLE {q_ident(t)}")
            create_sql = cur.fetchone()[1]
            f.write(create_sql + ";\n\n")

            cur.execute(f"SELECT * FROM {q_ident(t)}")
            rows = cur.fetchall()
            if not rows:
                f.write(f"-- (Bảng `{t}` không có dữ liệu)\n\n")
                continue
            cols = [d[0] for d in cur.description]
            col_list = ", ".join(q_ident(c) for c in cols)
            f.write(f"-- Data for `{t}` ({len(rows)} dòng)\n")
            for row in rows:
                vals = ", ".join(sql_value(v) for v in row)
                f.write(f"INSERT INTO {q_ident(t)} ({col_list}) VALUES ({vals});\n")
            f.write("\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    size_kb = output.stat().st_size / 1024
    print(f"Xong. Ghi file: {output} ({size_kb:.1f} KB)")


def main() -> None:
    args = parse_args()
    conn_info = resolve_conn(args)
    safe = dict(conn_info)
    safe["password"] = "***"
    print(f"Kết nối: {safe}")
    dump(conn_info, Path(args.output))


if __name__ == "__main__":
    main()
