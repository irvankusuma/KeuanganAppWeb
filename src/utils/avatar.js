const MAX_FILE_SIZE = 5 * 1024 * 1024;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File bukan gambar yang valid."));
    img.src = src;
  });

/**
 * Ubah file gambar jadi data URL JPEG berbentuk persegi (crop tengah)
 * agar hemat tempat saat disimpan di localStorage.
 */
export async function fileToAvatarDataUrl(file, size = 256) {
  if (!file?.type?.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Ukuran gambar maksimal 5 MB.");

  const img = await loadImage(await readAsDataUrl(file));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const side = Math.min(img.width, img.height);

  ctx.fillStyle = "#0c1220";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.82);
}

export const initialsOf = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase() || "?";
