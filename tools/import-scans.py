#!/usr/bin/env python3
"""Turn phone photos of the hand-filled forms into the final print files.

    python3 -I tools/import-scans.py            (every doc that has a scan)
    python3 -I tools/import-scans.py doc1

Input:  scans/doc1.jpg, scans/doc3.jpg, scans/doc4.jpg  (photo or scan of the filled
        form printed from print/templates/docN-blank.pdf; any angle, the whole page in view)
Output: print/docN.png (300 DPI), print/docN.pdf, img/docN.jpg, and for doc1 the measured
        positions of each handwritten piece (js/docs/doc1.layout.js).

How: the photo is matched to the blank form (SIFT features + RANSAC homography) and
warped flat. Uneven lighting is removed, then everything that is darker than the printed
form at that spot is treated as ink. The ink (with its real colour) is laid over the clean
digital form, so printed parts stay sharp and the handwriting is real.
Needs: opencv-python-headless, numpy (pip install opencv-python-headless).
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
W, H = 2480, 3508            # A4 at 300 DPI
PX_PER_MM = W / 210
DOCS = ['doc1', 'doc3', 'doc4']  # doc3 only if scans/doc3.jpg exists


def register(scan, blank):
    """Warp the photo onto the blank form's pixel grid."""
    def prep(img, width):
        k = width / img.shape[1]
        small = cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
        return cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), k
    g1, k1 = prep(blank, 1240)
    g2, k2 = prep(scan, 1600)
    sift = cv2.SIFT_create(nfeatures=8000)
    kp1, d1 = sift.detectAndCompute(g1, None)
    kp2, d2 = sift.detectAndCompute(g2, None)
    matches = cv2.BFMatcher().knnMatch(d2, d1, k=2)
    good = [m for m, n in (p for p in matches if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 40:
        raise SystemExit(f'Could not match the photo to the form ({len(good)} matches). Is the whole page in view and in focus?')
    src = np.float32([kp2[m.queryIdx].pt for m in good]) / k2
    dst = np.float32([kp1[m.trainIdx].pt for m in good]) / k1
    Hm, inliers = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    n_in = int(inliers.sum())
    if Hm is None or n_in < 30:
        raise SystemExit(f'Could not line the photo up with the form ({n_in} consistent matches).')
    warped = cv2.warpPerspective(scan, Hm, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    # refine: small residual alignment on the grey images (ECC, affine)
    try:
        a = cv2.cvtColor(cv2.resize(blank, (W // 2, H // 2)), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        b = cv2.cvtColor(cv2.resize(warped, (W // 2, H // 2)), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        warp = np.eye(2, 3, dtype=np.float32)
        _, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-5), None, 5)
        warp[:, 2] *= 2
        warped = cv2.warpAffine(warped, warp, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderValue=(255, 255, 255))
    except cv2.error:
        pass
    return warped, n_in, len(good)


def flatten_light(img):
    """Divide out uneven lighting so the paper becomes white everywhere."""
    out = np.empty_like(img, dtype=np.float32)
    for c in range(3):
        ch = img[:, :, c].astype(np.float32)
        bg = cv2.dilate(ch, np.ones((25, 25), np.uint8))       # remove dark strokes
        bg = cv2.GaussianBlur(bg, (0, 0), 40)
        out[:, :, c] = np.clip(ch / np.maximum(bg, 1) * 255, 0, 255)
    return out


def pen_colour_weight(warped):
    """0..1 per pixel: how clearly coloured (blue or red pen) it is.

    Printed parts are grey, especially when the form was printed in black and white, while
    ballpoint ink is clearly blue (or red). Returns None for a black pen (then only darkness
    is used).
    """
    w = cv2.GaussianBlur(warped.astype(np.float32), (0, 0), 1.0)
    b, g, r = w[:, :, 0], w[:, :, 1], w[:, :, 2]
    chroma = np.maximum(b - np.maximum(r, g), r - np.maximum(g, b))
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    dark = gray < 150
    if dark.sum() == 0 or (chroma[dark] > 15).mean() < 0.02:
        return None  # looks like black ink
    weight = np.clip((chroma - 6) / 10, 0, 1)
    # stroke edges are less saturated than their cores: grow the coloured areas slightly
    return cv2.dilate(weight, np.ones((5, 5), np.uint8))


def extract_ink(flat, blank, colour=None):
    """Alpha mask of handwriting: darker than the printed form at the same spot
    (and, when the pen is coloured, clearly blue or red)."""
    gray = cv2.cvtColor(flat.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    bgray = cv2.cvtColor(blank, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    # how dark the printed form is around each pixel (tolerates slight misalignment)
    bdark = cv2.dilate(1 - bgray, np.ones((9, 9), np.uint8))
    ink = (1 - gray) - bdark
    alpha = np.clip((ink - 0.10) / 0.30, 0, 1)
    if colour is not None:
        alpha = alpha * colour
    # drop specks (dust, noise) smaller than ~0.4 mm², and fragments that lie almost
    # entirely on printed lines (leftovers of the printed form, not handwriting)
    mask = (alpha > 0.25).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    printed = cv2.dilate(((1 - bgray) > 0.25).astype(np.uint8), np.ones((11, 11), np.uint8)).astype(bool)
    on_print = np.bincount(labels[printed].ravel(), minlength=n) / np.maximum(stats[:, cv2.CC_STAT_AREA], 1)
    keep = np.zeros(n, bool)
    keep[1:] = (stats[1:, cv2.CC_STAT_AREA] >= 40) & (on_print[1:] < 0.85)
    alpha = alpha * keep[labels]
    return cv2.GaussianBlur(alpha, (0, 0), 0.7)


def composite(blank, flat, alpha):
    ink_rgb = flat.copy()
    # pens look a little faded in photos; deepen the colour slightly
    ink_rgb = np.clip(ink_rgb * 0.82, 0, 255)
    a = alpha[:, :, None]
    return (blank.astype(np.float32) * (1 - a) + ink_rgb * a).astype(np.uint8)


def pieces_from_ink(alpha, fields):
    """For doc1: where each handwritten piece really is (mm boxes).

    Ink is grouped into word-sized blobs; each blob goes to the expected field (from the
    filled example) whose centre line is closest, among fields whose slightly enlarged box
    contains the blob's centre. A piece's box is the union of its blobs. This copes with
    handwriting that is bigger, smaller or a little off the line.
    """
    mask = (alpha > 0.3).astype(np.uint8)
    blobs = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5)))
    n, labels, stats, cents = cv2.connectedComponentsWithStats(blobs, 8)
    boxes = {}
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 60:
            continue
        cx, cy = cents[i] / PX_PER_MM
        best, best_d = None, 1e9
        for pid, (fx, fy, fw, fh) in fields.items():
            if fx - 4 <= cx <= fx + fw + 4 and fy - 2 <= cy <= fy + fh + 2:
                d = abs(cy - (fy + fh / 2)) + 0.1 * abs(cx - (fx + fw / 2))
                if d < best_d:
                    best, best_d = pid, d
        if best is None:
            continue
        # tight box of the real ink inside this blob
        ys, xs = np.nonzero((labels[y:y + h, x:x + w] == i) & (mask[y:y + h, x:x + w] > 0))
        if len(xs) == 0:
            continue
        bx0, by0, bx1, by1 = x + xs.min(), y + ys.min(), x + xs.max(), y + ys.max()
        if best in boxes:
            o = boxes[best]; boxes[best] = [min(o[0], bx0), min(o[1], by0), max(o[2], bx1), max(o[3], by1)]
        else:
            boxes[best] = [bx0, by0, bx1, by1]
    out = {}
    m = 1.2  # margin in mm
    for pid, f in fields.items():
        if pid not in boxes:
            out[pid] = f  # nothing written there: keep the expected box
            continue
        x0, y0, x1, y1 = (v / PX_PER_MM for v in boxes[pid])
        out[pid] = [round(x0 - m, 2), round(y0 - m, 2), round(x1 - x0 + 2 * m, 2), round(y1 - y0 + 2 * m, 2)]
    return out


def import_doc(doc):
    scan_path = next((p for p in [ROOT / 'scans' / f'{doc}{e}' for e in ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')] if p.exists()), None)
    if not scan_path:
        print(f'{doc}: no scan in scans/, keeping the generated version')
        return
    blank = cv2.imread(str(ROOT / 'print' / 'templates' / f'{doc}-blank.png'))
    scan = cv2.imread(str(scan_path))
    warped, n_in, n_good = register(scan, blank)
    flat = flatten_light(warped)
    alpha = extract_ink(flat, blank, pen_colour_weight(warped))
    out = composite(blank, flat, alpha)
    (ROOT / 'tools' / 'build').mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(ROOT / 'tools' / 'build' / f'{doc}-aligned.jpg'), warped, [cv2.IMWRITE_JPEG_QUALITY, 85])
    png = ROOT / 'print' / f'{doc}.png'
    cv2.imwrite(str(png), out)
    subprocess.run(['convert', str(png), '-units', 'PixelsPerInch', '-density', '300', str(png)], check=True)
    subprocess.run(['convert', str(png), '-quality', '92', '-units', 'PixelsPerInch', '-density', '300', str(ROOT / 'print' / f'{doc}.pdf')], check=True)
    web = cv2.resize(out, (1240, 1754), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(ROOT / 'img' / f'{doc}.jpg'), web, [cv2.IMWRITE_JPEG_QUALITY, 84])
    (ROOT / 'print' / f'{doc}.svg').unlink(missing_ok=True)  # the SVG no longer matches the print
    msg = f'{doc}: imported {scan_path.name} ({n_in}/{n_good} matching points used)'
    if doc == 'doc1':
        fields = json.loads((ROOT / 'print' / 'templates' / 'doc1-fields.json').read_text())
        pieces = pieces_from_ink(alpha, fields)
        lines = '\n'.join(f'  {k}: [{", ".join(str(v) for v in b)}],' for k, b in pieces.items())
        (ROOT / 'js' / 'docs' / 'doc1.layout.js').write_text(
            '// GENERATED by tools/import-scans.py from scans/doc1 (real handwriting). Do not edit by hand.\n'
            '// Bounding boxes [x, y, w, h] in mm of each handwritten piece on the printed page.\n'
            f'export const PIECES = {{\n{lines}\n}};\n')
        msg += f', {len(pieces)} handwritten pieces located'
    print(msg)


if __name__ == '__main__':
    for d in (sys.argv[1:] or DOCS):
        import_doc(d)
