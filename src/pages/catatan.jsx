import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, FileText } from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";

const initialForm = {
  judul: "",
  isi: "",
};

export default function Catatan() {
  const [catatan, setCatatan] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.CATATAN);
    const sorted = [...data].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
    );
    setCatatan(sorted);
  };

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return catatan;

    return catatan.filter((item) => {
      const judul = (item.judul || "").toLowerCase();
      const isi = (item.isi || "").toLowerCase();
      return judul.includes(keyword) || isi.includes(keyword);
    });
  }, [catatan, search]);

  const resetForm = () => {
    setFormData(initialForm);
    setEditId(null);
    setShowModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.isi.trim()) {
      alert("Judul dan isi catatan harus diisi.");
      return;
    }

    const payload = {
      judul: formData.judul.trim(),
      isi: formData.isi.trim(),
      tanggal: new Date().toISOString().split("T")[0],
    };

    if (editId) {
      LocalStorageService.updateRow(SHEETS.CATATAN, editId, payload);
    } else {
      LocalStorageService.appendRow(SHEETS.CATATAN, payload);
    }

    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      judul: item.judul || "",
      isi: item.isi || "",
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (confirm(`Hapus catatan \"${item.judul}\"?`)) {
      LocalStorageService.deleteRow(SHEETS.CATATAN, item.id);
      loadData();
    }
  };

  const formatDateTime = (item) => {
    const raw = item.updatedAt || item.createdAt;
    if (!raw) return "-";
    return new Date(raw).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-sky-700/40 to-violet-700/40 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-white mb-2">
          <FileText size={18} className="text-blue-300" />
          <h2 className="font-semibold">Catatan Pribadi</h2>
        </div>
        <p className="text-xs text-slate-300">
          Simpan memo, rencana pembayaran, atau daftar hal penting keuangan kamu.
        </p>
      </div>

      <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul atau isi catatan..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="space-y-3">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((item) => (
            <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.judul}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Terakhir diubah: {formatDateTime(item)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
                    aria-label="Edit catatan"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/40"
                    aria-label="Hapus catatan"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{item.isi}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-slate-400 py-14 bg-slate-800/60 border border-slate-700 rounded-xl">
            {search ? "Catatan tidak ditemukan." : "Belum ada catatan. Tambah catatan baru dari tombol +."}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg z-40"
        aria-label="Tambah catatan"
      >
        <Plus size={22} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3" onClick={resetForm}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editId ? "Edit Catatan" : "Tambah Catatan"}</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Judul</label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Follow up piutang Budi"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Isi Catatan</label>
                <textarea
                  value={formData.isi}
                  onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows="8"
                  placeholder="Tulis catatan di sini..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2 flex items-center justify-center gap-2"
              >
                <Save size={16} /> {editId ? "Simpan Perubahan" : "Simpan Catatan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
