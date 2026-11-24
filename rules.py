# rules.py — aturan posisi tangan crochet.py
# ------------------------------------------------------------
# Ubah angka di bawah ini, lalu tekan RUN di halaman workshop.
#
# Setiap tangan berisi 21 titik landmark MediaPipe.
# Tiap titik = [x, y, z]; x dan y bernilai 0..1 (posisi di gambar).
#   0 = pergelangan     4 = ujung jempol     8 = ujung telunjuk
#   5, 6, 7 = ruas telunjuk                  9 = pangkal jari tengah
# ------------------------------------------------------------
import math

# === PARAMETER ===
# Jarak jempol (4) ke telunjuk (8), dibagi ukuran telapak (0 -> 9).
# Makin kecil angkanya, makin rapat jepitan yang diminta.
JARAK_MAKS = 0.45

# Tekukan telunjuk minimal, dalam derajat (0 = lurus).
SUDUT_MIN = 15

# Contoh angka di atas masih tebakan awal.
# Nanti disetel ulang pakai rekaman tangan teman yang jago crochet.
# === END PARAMETER ===


def jarak(a, b):
    """Jarak 2D antara dua titik."""
    return math.dist(a[:2], b[:2])


def ukuran_telapak(tangan):
    """Pergelangan (0) ke pangkal jari tengah (9), biar jarak nggak tergantung jauh-dekat kamera."""
    return jarak(tangan[0], tangan[9]) or 1e-6


def tekukan(a, b, c):
    """Seberapa menekuk sendi di titik b (0 = lurus)."""
    v1 = (a[0] - b[0], a[1] - b[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    n = math.hypot(*v1) * math.hypot(*v2) or 1e-6
    cos = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / n))
    return 180 - math.degrees(math.acos(cos))


def check_pose(level, tangan_list):
    """
    level       : 0 = HALO TANGAN, 1 = PEGANG HAKPEN, 2+ = level rajut
    tangan_list : daftar tangan, tangan utama paling depan
    Kembalikan  : (ok, pesan, titik_yang_dicek)
    """
    if level == 0:
        if len(tangan_list) >= 2:
            return True, "Dua tangan terdeteksi!", [0]
        return False, f"Angkat kedua tangan ke kamera ({len(tangan_list)}/2)", [0]

    if not tangan_list:
        return False, "Tangan belum terlihat di kamera", []

    t = tangan_list[0]
    rasio = jarak(t[4], t[8]) / ukuran_telapak(t)
    tekuk = tekukan(t[5], t[6], t[8])

    if rasio > JARAK_MAKS:
        return False, "Dekatkan jempol ke telunjuk, jepit hakpennya", [4, 8]
    if tekuk < SUDUT_MIN:
        return False, "Tekuk sedikit telunjukmu", [5, 6, 8]
    return True, "Posisi sesuai panduan!", [4, 8]
