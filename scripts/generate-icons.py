#!/usr/bin/env python3
"""Generate simple PNG icons for the PWA using only stdlib."""
import struct
import zlib
import os

def create_png(size: int, output_path: str) -> None:
    """Create a PNG icon: dark background with a red play triangle."""
    # Build raw RGBA pixel data
    bg = (10, 10, 10, 255)       # #0a0a0a
    play = (220, 38, 38, 255)    # red-600

    # Compute a centred play triangle
    cx, cy = size / 2, size / 2
    tri_r = size * 0.28  # radius of bounding circle

    # Three vertices of right-pointing triangle
    v = [
        (cx - tri_r * 0.5, cy - tri_r),
        (cx - tri_r * 0.5, cy + tri_r),
        (cx + tri_r,        cy),
    ]

    def in_triangle(px: float, py: float) -> bool:
        def sign(ax, ay, bx, by, qx, qy):
            return (qx - bx) * (ay - by) - (ax - bx) * (qy - by)
        d1 = sign(*v[0], *v[1], px, py)
        d2 = sign(*v[1], *v[2], px, py)
        d3 = sign(*v[2], *v[0], px, py)
        has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
        has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
        return not (has_neg and has_pos)

    rows: list[bytes] = []
    for y in range(size):
        row = bytearray()
        row.append(0)  # filter type: None
        for x in range(size):
            color = play if in_triangle(x + 0.5, y + 0.5) else bg
            row.extend(color)
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(ctype: bytes, data: bytes) -> bytes:
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    # bit depth=8, color type=2 (RGB) — use RGB not RGBA for compat
    # Actually let's use RGBA (color type 6)
    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr_data)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(png)
    print(f"  wrote {output_path} ({size}x{size})")


if __name__ == "__main__":
    base = os.path.join(os.path.dirname(__file__), "..", "public")
    create_png(192, os.path.join(base, "icon-192.png"))
    create_png(512, os.path.join(base, "icon-512.png"))
    print("Done.")
