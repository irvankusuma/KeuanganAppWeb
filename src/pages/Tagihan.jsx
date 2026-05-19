import { useEffect, useMemo, useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Receipt, History,
  Pin, Filter, Search, CreditCard, CheckCircle,
  Clock, ChevronDown, ChevronUp
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";

const KATEGORI = ["Listrik","Air","Pulsa/Data","Wifi/Internet","Langganan","Lainnya"];

const emptyForm = {
  nama: "", nominal: "",
  bulan: new Date().toISOString().slice(0,7),
  kategori: "Listrik", catatan: ""
};

const fmtC = (n) => n ? "Rp " + Number(n).toLocaleString("id-ID") : "Rp 0";

const nextMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

const fmtBulan = (ym) => {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  return new Date(y, m-1).toLocaleDateString("id-ID",{month:"long",year:"numeric"});
};

export default function Tagihan() {
  const [tagihan, setTagihan] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [historyId, setHistoryId] = useState(null);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterKat, setFilterKat] = useState("all");
  const [confirm, setConfirm] = useState({ visible:false, title:"", message:"", onConfirm:null });
  const [shareData, setShareData] = useState({ isOpen:false, cardRef:null, title:"", caption:"" });

  const cardRefs = useRef({});
  const { showToast } = useToast();

  useEffect(() => { load(); }, []);
  const load = () => {
    setTagihan(LocalStorageService.readSheet(SHEETS.TAGIHAN));
    setRiwayat(LocalStorageService.readSheet(SHEETS.PEMBAYARAN_TAGIHAN));
  };

  const resetForm = () => { setModal(false); setEditMode(false); setEditId(null); setForm(emptyForm); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama || !form.nominal) { showToast("Nama dan nominal harus diisi","error"); return; }
    
    const amt = parseFloat(form.nominal) || 0;
    const payload = { nama:form.nama.trim(), nominal:amt, bulan:form.bulan, kategori:form.kategori, catatan:form.catatan.trim(), isPaid:true, tanggalBayar:new Date().toISOString().split("T")[0], jumlahBayar:amt };
    
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.TAGIHAN, editId, payload);
      showToast("Tagihan diperbarui","success");
    } else {
      const savedItem = LocalStorageService.appendRow(SHEETS.TAGIHAN, payload);
      
      const savedHist = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_TAGIHAN, {
        tagihanId:savedItem.id, namaTagihan:savedItem.nama, bulan:savedItem.bulan,
        jumlah:amt, tanggal:new Date().toISOString().split("T")[0], catatan:savedItem.catatan
      });

      LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
        nama:`Tagihan: ${savedItem.nama}`, kategori:"Tagihan", jumlah:amt,
        tanggal:new Date().toISOString().split("T")[0],
        catatan:savedItem.catatan || `Pembayaran ${savedItem.nama} ${fmtBulan(savedItem.bulan)}`,
        sourceRef:savedHist.id, sourceType:"tagihan_bayar"
      });
      showToast("Tagihan otomatis tercatat di Pengeluaran","success");
    }
    resetForm(); load();
  };

  const handleEdit = (item) => {
    setEditMode(true); setEditId(item.id);
    setForm({ nama:item.nama, nominal:item.nominal, bulan:item.bulan||new Date().toISOString().slice(0,7), kategori:item.kategori||"Listrik", catatan:item.catatan||"" });
    setModal(true);
  };

  const handleDelete = (item) => {
    setConfirm({ visible:true, title:"Hapus Tagihan", message:`Hapus tagihan "${item.nama}"?`,
      onConfirm:() => {
        LocalStorageService.deleteRow(SHEETS.TAGIHAN, item.id);
        load(); showToast("Tagihan dihapus","success");
        setConfirm(p=>({...p,visible:false}));
      }
    });
  };

  const handlePin = (id) => {
    const r = LocalStorageService.togglePin(SHEETS.TAGIHAN, id);
    if (r.success) load(); else showToast(r.message,"warning");
  };

  const handleBuatBulanBerikutnya = (item) => {
    setEditMode(false);
    setEditId(null);
    setForm({
      nama: item.nama,
      nominal: item.nominal,
      bulan: nextMonth(item.bulan||new Date().toISOString().slice(0,7)),
      kategori: item.kategori,
      catatan: item.catatan || ""
    });
    setModal(true);
  };

  const getHistory = (nama) =>
    riwayat.filter(r=>r.namaTagihan?.toLowerCase()===nama?.toLowerCase())
      .sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return [...tagihan]
      .filter(item => {
        if (kw && !item.nama.toLowerCase().includes(kw) && !(item.catatan||"").toLowerCase().includes(kw) && !(item.kategori||"").toLowerCase().includes(kw)) return false;
        if (filterKat!=="all" && item.kategori!==filterKat) return false;
        return true;
      })
      .sort((a,b) => {
        if (a.isPinned!==b.isPinned) return a.isPinned?-1:1;
        return (b.bulan||"").localeCompare(a.bulan||"");
      });
  }, [tagihan, search, filterKat]);

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0,7);
    const paidThisMonth = riwayat
      .filter(r=>r.bulan===thisMonth)
      .reduce((s,r)=>s+(parseFloat(r.jumlah)||0),0);
    const totalAllTime = riwayat.reduce((s,r)=>s+(parseFloat(r.jumlah)||0),0);
    return {
      totalCount: tagihan.length,
      totalAllTime,
      paidThisMonth
    };
  }, [tagihan, riwayat]);

  const renderCard = (item) => {
    const hist = getHistory(item.nama);
    const caption = `*TAGIHAN KEUANGAN*\nNama: ${item.nama}\nKategori: ${item.kategori}\nNominal: ${fmtC(item.nominal)}\nBulan: ${fmtBulan(item.bulan)}\nStatus: TERCATAT\n${item.catatan?`Catatan: ${item.catatan}\n`:""}\n---\nDikelola dengan KeuanganApp`;

    return (
      <div
        key={item.id}
        ref={el=>cardRefs.current[item.id]=el}
        className={`bg-[#0c1220] rounded-2xl p-4 border border-[#1e2d45] border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col`}
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white truncate">{item.nama}</h3>
              {item.isPinned && <Pin size={10} className="text-blue-400 fill-current shrink-0"/>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-slate-800 border border-slate-700/50 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wide">{item.kategori}</span>
              <span className="text-[10px] text-slate-500">{fmtBulan(item.bulan)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle size={10}/>Tercatat
            </span>
            <CardActionMenu
              item={item}
              onTogglePin={handlePin}
              onShare={(ref,t,cap)=>setShareData({isOpen:true,cardRef:ref,title:t,caption:cap})}
              cardRef={{current:cardRefs.current[item.id]}}
              title={`Tagihan: ${item.nama}`}
              caption={caption}
              dataString={`${item.nama} - ${fmtC(item.nominal)} - ${fmtBulan(item.bulan)}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5 border-t border-b border-[#1e2d45]/50 mb-3">
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Nominal</div>
            <div className="text-base font-bold text-emerald-400">{fmtC(item.nominal)}</div>
          </div>
        </div>

        {item.catatan && <p className="text-xs text-slate-500 italic mb-2 leading-relaxed">{item.catatan}</p>}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap no-export mt-auto">
          <button onClick={()=>handleBuatBulanBerikutnya(item)} className="btn-action-compact btn-action-emerald shrink-0">
            <Plus size={12}/><span>Bulan Depan</span>
          </button>
          <button onClick={()=>setHistoryId(historyId===item.id?null:item.id)} className="btn-action-compact btn-action-indigo shrink-0">
            <History size={12}/><span>Histori{hist.length>0?` (${hist.length})`:""}</span>
          </button>
          <button onClick={()=>handleEdit(item)} className="btn-action-compact btn-action-blue shrink-0">
            <Pencil size={12}/><span>Edit</span>
          </button>
          <button onClick={()=>handleDelete(item)} className="btn-action-compact btn-action-red shrink-0">
            <Trash2 size={12}/><span>Hapus</span>
          </button>
        </div>

        {/* History */}
        {historyId===item.id && (
          <div className="mt-3 bg-[#0a0f1a] rounded-xl p-3 border border-[#1e2d45] no-export">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Riwayat Pembayaran</div>
            {hist.length>0 ? hist.map((h,i)=>(
              <div key={h.id||i} className="flex justify-between items-center py-1.5 border-b border-[#1e2d45]/50 last:border-0 text-xs">
                <div>
                  <div className="text-slate-300 font-medium">{fmtBulan(h.bulan)}</div>
                  <div className="text-slate-600 text-[10px]">{h.tanggal}</div>
                  {h.catatan && <div className="text-slate-500 italic text-[10px]">"{h.catatan}"</div>}
                </div>
                <span className="font-bold text-emerald-400">{fmtC(h.jumlah)}</span>
              </div>
            )) : (
              <p className="text-xs text-slate-600 italic text-center py-2">Belum ada riwayat.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-28 md:pb-6">
      {/* FAB */}
      <button onClick={()=>setModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Tagihan">
        <Plus size={28}/>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-600/80 to-indigo-600/80 rounded-2xl p-4 border border-blue-500/20 text-white">
          <div className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1">Total Pengeluaran (Semua)</div>
          <div className="text-2xl font-bold">{fmtC(stats.totalAllTime)}</div>
          <div className="text-xs text-blue-200 mt-1">{stats.totalCount} catatan tagihan</div>
        </div>
        <div className="bg-gradient-to-r from-emerald-600/80 to-teal-600/80 rounded-2xl p-4 border border-emerald-500/20 text-white">
          <div className="text-[10px] text-emerald-100 uppercase font-bold tracking-wider mb-1">Tagihan Bulan Ini</div>
          <div className="text-2xl font-bold">{fmtC(stats.paidThisMonth)}</div>
          <div className="text-xs text-emerald-200 mt-1">Otomatis tercatat di pengeluaran</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3 text-slate-500"/>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Cari nama tagihan, kategori..." 
          className="w-full bg-[#0c1220] border border-[#1e2d45] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-colors"/>
      </div>

      {/* Filter */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/40 transition-colors" onClick={()=>setShowFilter(!showFilter)}>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-blue-400 shrink-0"/>
            <span className="text-xs font-bold text-white uppercase tracking-tight">Filter</span>
            {(filterKat!=="all") && (
              <span className="text-[10px] text-blue-400 font-semibold">• Aktif</span>
            )}
          </div>
          {showFilter ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
        </div>
        {showFilter && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Kategori</div>
              <div className="flex flex-wrap gap-1.5">
                {["all",...KATEGORI].map(c=>(
                  <button key={c} onClick={()=>setFilterKat(c)}
                    className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-all ${filterKat===c?"bg-blue-600 text-white":"bg-slate-700/60 text-slate-300 hover:bg-slate-700"}`}>
                    {c==="all"?"Semua":c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="card-grid-responsive">
        {filtered.length>0 ? filtered.map(item=>renderCard(item)) : (
          <div className="text-center py-14 bg-[#0c1220]/50 border border-dashed border-[#1e2d45] rounded-2xl col-span-full">
            <Receipt size={28} className="mx-auto text-slate-600 mb-2"/>
            <p className="text-slate-400 text-sm font-medium">Tidak ada tagihan.</p>
            <p className="text-slate-500 text-xs mt-1">Tambah tagihan baru dengan tombol + di bawah.</p>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={resetForm}>
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">{editMode?"Edit Tagihan":"Tambah Tagihan"}</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X size={18} className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nama Tagihan <span className="text-red-500">*</span></label>
                <input type="text" value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})} required
                  placeholder="Contoh: Tagihan Wifi, Listrik PLN"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"/>
              </div>
              <NumericInput label="Nominal / Estimasi" value={form.nominal} onChange={v=>setForm({...form,nominal:v?Number(v):""})} required/>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Bulan</label>
                  <input type="month" value={form.bulan} onChange={e=>setForm({...form,bulan:e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Kategori</label>
                  <select value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                    {KATEGORI.map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Catatan (opsional)</label>
                <textarea value={form.catatan} onChange={e=>setForm({...form,catatan:e.target.value})} rows={2}
                  placeholder="No. pelanggan, keterangan, dll..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors resize-none"/>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                {editMode?"Simpan Perubahan":"Tambah Tagihan"}
              </button>
            </form>
          </div>
        </div>
      )}



      <ConfirmModal visible={confirm.visible} title={confirm.title} message={confirm.message}
        onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(p=>({...p,visible:false}))}/>

      <ShareDialog isOpen={shareData.isOpen} onClose={()=>setShareData(p=>({...p,isOpen:false}))}
        cardRef={shareData.cardRef} title={shareData.title} caption={shareData.caption}/>
    </div>
  );
}
