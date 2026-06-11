import argparse
import csv
import re
from pathlib import Path


# Ordered longest-first replacements for corrupted tokens in g:\data.csv
REPLACEMENTS = [
    ("Qu?n jean ?ng r?ng nam", "Quần jean ống rộng nam"),
    ("Qu?n kaki ?ng su?ng", "Quần kaki ống suông"),
    ("Qu?n t?y ?ng d?ng nam", "Quần tây ống đứng nam"),
    ("Qu?n short n? th? thao", "Quần short nữ thể thao"),
    ("Qu?n jogger t?i h?p", "Quần jogger túi hộp"),
    ("Qu?n kaki t?i h?p nam", "Quần kaki túi hộp nam"),
    ("Qu?n n? bo g?u nam", "Quần nỉ bo gấu nam"),
    ("Qu?n jean n? l?ng", "Quần jean nữ lót"),
    ("Qu?n ?ng r?ng n?", "Quần ống rộng nữ"),
    ("Qu?n baggy jean r?ch", "Quần baggy jean rách"),
    ("Qu?n baggy v?i n?", "Quần baggy vải nữ"),
    ("Qu?n short th? thao", "Quần short thể thao"),
    ("Qu?n th? thao n?", "Quần thể thao nữ"),
    ("Qu?n d?i thun nam", "Quần dài thun nam"),
    ("Qu?n legging d?i n?", "Quần legging dài nữ"),
    ("Qu?n short jean n?", "Quần short jean nữ"),
    ("Qu?n short thun n?", "Quần short thun nữ"),
    ("Qu?n jogger thun n?", "Quần jogger thun nữ"),
    ("Qu?n jean skinny n?", "Quần jean skinny nữ"),
    ("Qu?n jean r?ch nam", "Quần jean rách nam"),
    ("Qu?n l?ng kaki n?", "Quần lót kaki nữ"),
    ("Qu?n culottes n?", "Quần culottes nữ"),
    ("Qu?n t?y baggy n?", "Quần tây baggy nữ"),
    ("Qu?n short kaki nam", "Quần short kaki nam"),
    ("Qu?n baggy jean", "Quần baggy jean"),
    ("Qu?n jogger nam", "Quần jogger nam"),
    ("Qu?n kaki d?i", "Quần kaki dài"),
    ("Qu?n t?y nam", "Quần tây nam"),
    ("Qu?n legging n?", "Quần legging nữ"),
    ("Qu?n boi nam co gi?n", "Quần bơi nam co giãn"),
    ("Ch?n v?y d?i x?p ly", "Chân váy dài xếp ly"),
    ("Ch?n v?y jean ng?n", "Chân váy jean ngắn"),
    ("Ch?n v?y ch? A", "Chân váy chữ A"),
    ("V?y du?i c? ti?u thu", "Váy duôi cá tiểu thu"),
    ("V?y maxi tr? vai", "Váy maxi trễ vai"),
    ("V?y midi x?p ly", "Váy midi xếp ly"),
    ("V?y hoa n?", "Váy hoa nữ"),
    ("?o kho?c gi? th? thao", "Áo khoác gió thể thao"),
    ("?o kho?c gi? m?ng", "Áo khoác gió mỏng"),
    ("?o kho?c d? d?ng d?i", "Áo khoác dạ dáng dài"),
    ("?o kho?c d? tweed", "Áo khoác dạ tweed"),
    ("?o blazer d?ng ng?n", "Áo blazer dáng ngắn"),
    ("?o so mi c? ch?n th?", "Áo so mi cổ chân thuyền"),
    ("?o so mi h?a ti?t bi?n", "Áo so mi họa tiết biển"),
    ("?o so mi l?a c?ng s?", "Áo so mi lụa công sở"),
    ("?o so mi tay ng?n nam", "Áo so mi tay ngắn nam"),
    ("?o so mi tr?ng", "Áo so mi trắng"),
    ("?o so mi c? tr?", "Áo so mi cổ trụ"),
    ("?o thun unisex ph?n quang", "Áo thun unisex phản quang"),
    ("?o thun c? tim nam", "Áo thun cổ tim nam"),
    ("?o thun c? s?u nam", "Áo thun cá sấu nam"),
    ("?o thun polo n?", "Áo thun polo nữ"),
    ("?o sweater n? ch?n cua", "Áo sweater nữ chân cua"),
    ("?o tanktop d?ng r?ng", "Áo tanktop dáng rộng"),
    ("?o tr? vai n?", "Áo trễ vai nữ"),
    ("?o gi? nhi?t nam", "Áo giữ nhiệt nam"),
    ("?o d?y l?a n?", "Áo dây lụa nữ"),
    ("Áo len c? l?", "Áo len cổ lọ"),
    ("Áo len c? tr?n", "Áo len cổ tròn"),
    ("Áo so mi c? tr?", "Áo so mi cổ trụ"),
    ("Áo so mi c? ch?n th?", "Áo so mi cổ chân thuyền"),
    ("Áo gi? nhi?t nam", "Áo giữ nhiệt nam"),
    ("Áo so mi l?a công s?", "Áo so mi lụa công sở"),
    ("?o len g?n n?", "Áo len gân nữ"),
    ("?o polo ph?i bo", "Áo polo phối bo"),
    ("?o croptop n?", "Áo croptop nữ"),
    ("?o cardigan n?", "Áo cardigan nữ"),
    ("?o blazer n?", "Áo blazer nữ"),
    ("Đ?m body hai d?y", "Đầm body hai dây"),
    ("Đ?m công s?", "Đầm công sở"),
    ("Đ?m len body", "Đầm len body"),
    ("Đ?m maxi di bi?n", "Đầm maxi đi biển"),
    ("Đ?m su?ng ch? A", "Đầm suông chữ A"),
    ("Đ?m voan to d?ng d?i", "Đầm voan tơ dáng dài"),
    ("B? suit c?ng s? n?", "Bộ suit công sở nữ"),
    ("Y?m jean d?ng d?i", "Yếm jean dáng dài"),
    ("h?a", "họa"),
    ("hĐa", "họa"),
    ("Tr?ng;Xanh nh?t", "Trắng;Xanh nhạt"),
    ("Tr?ng;X?m", "Trắng;Xám"),
    ("Tr?ng;T?m", "Trắng;Tím"),
    ("Tr?ng;H?ng", "Trắng;Hồng"),
    ("Tr?ng;Xanh", "Trắng;Xanh"),
    ("Tr?ng;?en", "Trắng;Đen"),
    ("V?ng;Tr?ng", "Vàng;Trắng"),
    ("X?m;H?ng", "Xám;Hồng"),
    ("X?m;Tr?ng", "Xám;Trắng"),
    ("X?m nh?t", "Xám nhạt"),
    ("X?m d?m", "Xám đậm"),
    ("Xám chu?t", "Xám chuột"),
    ("Xanh nh?t", "Xanh nhạt"),
    ("Xanh d?m", "Xanh đậm"),
    ("Xanh ng?c", "Xanh ngọc"),
    ("Xanh b?c", "Xanh bạc"),
    ("Xanh;?en", "Xanh;Đen"),
    ("Xanh;? ?", "Xanh;Đỏ"),
    ("?en;H?ng", "Đen;Hồng"),
    ("?en;Tr?ng", "Đen;Trắng"),
    ("Đen;Đ?", "Đen;Đỏ"),
    ("Xanh;Đ?", "Xanh;Đỏ"),
    ("Đ? den;Xanh den", "Đỏ đen;Xanh den"),
    ("Đ? d?;Kem", "Đỏ đô;Kem"),
    ("Đa s?c", "Đa sắc"),
    ("H?ng pastel", "Hồng pastel"),
    ("Thun l?nh", "Thun lạnh"),
    ("Tuy?t mua", "Tuyết mua"),
    ("D? Tweed", "Dạ Tweed"),
    ("Qu?n", "Quần"),
    ("th? thao", "thể thao"),
    ("th? ", "thể "),
    (" n?", " nữ"),
    ("Áo so mi tr?ng", "Áo so mi trắng"),
    ("Áo khoác d? dáng dài", "Áo khoác dạ dáng dài"),
    ("Áo so mi h?a tiết biển", "Áo so mi họa tiết biển"),
    ("Áo khoác d? tweed", "Áo khoác dạ tweed"),
    ("Áo thun in hình", "Áo thun in hình"),
    ("Áo len cổ tròn", "Áo len cổ tròn"),
    ("tr?ng", "trắng"),
    ("Tr?ng", "Trắng"),
    ("dĐdáng", "dạ dáng"),
    ("hĐa", "họa"),
    ("dĐtweed", "dạ tweed"),
    ("tṛn", "tròn"),
    ("h́nh", "hình"),
    ("H?ng", "Hồng"),
    ("Tuy?t", "Tuyết"),
    ("nh?t", "nhạt"),
    ("ng?n", "ngắn"),
    ("ng?c", "ngọc"),
    ("d?m", "đậm"),
    ("d?i", "dài"),
    ("d?ng", "dáng"),
    ("x?p", "xếp"),
    ("h?p", "hộp"),
    ("r?ng", "rộng"),
    ("?ng ", "ống "),
    ("?ng;", "ống;"),
    ("l?a", "lụa"),
    ("l?ng", "lót"),
    ("c? ", "cổ "),
    ("c?;", "cổ;"),
    ("g?u", "gấu"),
    ("gi? ", "giữ "),
    ("m?ng", "mỏng"),
    ("ph?i ", "phối "),
    ("ph?n ", "phản "),
    ("bi?n", "biển"),
    ("ti?u ", "tiểu "),
    ("ti?t ", "tiết "),
    ("s?u", "sấu"),
    ("ch? ", "chữ "),
    ("tr? ", "trễ "),
    ("tr?n", "tròn"),
    ("c?ng s?", "công sở"),
    ("N?", "Nỉ"),
    ("D?", "Dạ"),
    ("L?a", "Lụa"),
    ("B?", "Bộ"),
    ("Y?m", "Yếm"),
    ("Đ?m", "Đầm"),
    ("công s?", "công sở"),
    ("nhi?t", "nhiệt"),
    ("c? l?", "cổ lọ"),
    ("c? tr?", "cổ trụ"),
    ("c? ch?n th?", "cổ chân thuyền"),
    ("chu?t", "chuột"),
    ("s?c", "sắc"),
    ("Đ?", "Đỏ"),
    ("v?i ", "vải "),
    ("r?ch", "rách"),
    ("gi?n", "giãn"),
]

# Fix names starting with corrupted Áo (?o / missing Á)
AO_PREFIX_FIXES = [
    (re.compile(r"^\?o\b"), "Áo"),
    (re.compile(r"^\?m\b"), "Đầm"),
]


def read_source_csv(path: Path):
    with path.open("r", encoding="cp1258", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []
    return fieldnames, rows


def fix_text(text: str) -> str:
    if not text:
        return text
    s = text.replace("Ð", "Đ").replace("ð", "đ")
    for old, new in REPLACEMENTS:
        s = s.replace(old, new)
    for pat, repl in AO_PREFIX_FIXES:
        s = pat.sub(repl, s)
    return s


def fix_row(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        out[k] = fix_text(v) if isinstance(v, str) else v
    return out


def main():
    ap = argparse.ArgumentParser(description="Fix Vietnamese Unicode in g:\\data.csv and write UTF-8 CSV.")
    ap.add_argument("--input", default=r"g:\data.csv")
    ap.add_argument("--output", default=r"g:\data_fixed.csv")
    args = ap.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    fieldnames, rows = read_source_csv(input_path)
    fixed_rows = [fix_row(r) for r in rows]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(fixed_rows)

    remaining = 0
    samples = []
    for r in fixed_rows:
        for k, v in r.items():
            if isinstance(v, str) and "?" in v:
                remaining += 1
                if len(samples) < 10:
                    samples.append(f"{k}: {v}")

    print(f"Wrote: {output_path}")
    print(f"Rows: {len(fixed_rows)}")
    print(f"Fields still containing '?': {remaining}")
    if samples:
        print("Samples needing manual review:")
        for s in samples:
            print(" -", s)


if __name__ == "__main__":
    main()
