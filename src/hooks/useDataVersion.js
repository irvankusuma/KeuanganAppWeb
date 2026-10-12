import { useEffect, useState } from "react";

/**
 * Naik satu angka setiap data berubah (termasuk perubahan dari tab/sesi lain),
 * sehingga halaman yang memasukkannya ke dependency useEffect akan memuat ulang data.
 */
export default function useDataVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("kua:data-changed", bump);
    return () => window.removeEventListener("kua:data-changed", bump);
  }, []);

  return version;
}
