// LocalStorageService for Web Browser
// Uses localStorage API (built-in browser)

const SHEETS = {
  HUTANG: 'Hutang',
  PEMBAYARAN_HUTANG: 'PembayaranHutang',
  PIUTANG: 'Piutang',
  PEMBAYARAN_PIUTANG: 'PembayaranPiutang',
  PEMASUKAN: 'Pemasukan',
  PENGELUARAN: 'Pengeluaran',
  PERBAIKAN: 'Perbaikan',
  CATATAN: 'Catatan',
};

class LocalStorageService {
  // Read data from localStorage
  readSheet(sheetName) {
    try {
      const data = localStorage.getItem(`@${sheetName}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${sheetName}:`, error);
      return [];
    }
  }

  // Write data to localStorage
  writeSheet(sheetName, data) {
    try {
      localStorage.setItem(`@${sheetName}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error writing ${sheetName}:`, error);
      return false;
    }
  }

  // Append row
  appendRow(sheetName, rowData) {
    try {
      const existingData = this.readSheet(sheetName);
      
      // Generate ID
      if (!rowData.id) {
        const maxId = existingData.reduce((max, item) => {
          const id = parseInt(item.id) || 0;
          return id > max ? id : max;
        }, 0);
        rowData.id = (maxId + 1).toString();
      }

      // Add timestamp
      rowData.createdAt = new Date().toISOString();

      // Append
      const newData = [...existingData, rowData];
      this.writeSheet(sheetName, newData);

      return rowData;
    } catch (error) {
      console.error(`Error appending to ${sheetName}:`, error);
      throw error;
    }
  }

  // Update row
  updateRow(sheetName, id, updates) {
    try {
      const data = this.readSheet(sheetName);
      const index = data.findIndex(item => item.id === id.toString());
      
      if (index === -1) throw new Error('Item not found');

      data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
      this.writeSheet(sheetName, data);

      return data[index];
    } catch (error) {
      console.error(`Error updating ${sheetName}:`, error);
      throw error;
    }
  }

  // Delete row
  deleteRow(sheetName, id) {
    try {
      const data = this.readSheet(sheetName);
      const newData = data.filter(item => item.id !== id.toString());
      this.writeSheet(sheetName, newData);

      return true;
    } catch (error) {
      console.error(`Error deleting from ${sheetName}:`, error);
      throw error;
    }
  }

  // Export all data as JSON
  exportAllData() {
    try {
      const allData = {};
      
      for (const [key, sheetName] of Object.entries(SHEETS)) {
        const data = this.readSheet(sheetName);
        allData[sheetName] = data;
      }

      return {
        exportDate: new Date().toISOString(),
        version: '1.0',
        appName: 'KeuanganApp',
        data: allData,
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Import data from JSON
  importAllData(importData) {
    try {
      if (!importData.data) throw new Error('Invalid import data');

      for (const [sheetName, data] of Object.entries(importData.data)) {
        this.writeSheet(sheetName, data);
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Clear all data
  clearAllData() {
    try {
      for (const sheetName of Object.values(SHEETS)) {
        localStorage.removeItem(`@${sheetName}`);
      }
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Get all history
  getAllHistory() {
    try {
      const history = [];
      
      const hutang = this.readSheet(SHEETS.HUTANG);
      const piutang = this.readSheet(SHEETS.PIUTANG);
      const pemasukan = this.readSheet(SHEETS.PEMASUKAN);
      const pengeluaran = this.readSheet(SHEETS.PENGELUARAN);
      const perbaikan = this.readSheet(SHEETS.PERBAIKAN);

      hutang.forEach(item => {
        history.push({
          type: 'hutang',
          title: item.nama,
          amount: parseFloat(item.jumlah) || 0,
          date: item.tanggal,
          createdAt: item.createdAt,
        });
      });

      piutang.forEach(item => {
        history.push({
          type: 'piutang',
          title: item.namaOrang,
          amount: parseFloat(item.jumlah) || 0,
          date: item.tanggal,
          createdAt: item.createdAt,
        });
      });

      pemasukan.forEach(item => {
        history.push({
          type: 'pemasukan',
          title: item.sumber,
          amount: parseFloat(item.jumlah) || 0,
          date: item.tanggal,
          createdAt: item.createdAt,
        });
      });

      pengeluaran.forEach(item => {
        history.push({
          type: 'pengeluaran',
          title: item.kategori,
          amount: parseFloat(item.jumlah) || 0,
          date: item.tanggal,
          createdAt: item.createdAt,
        });
      });

      perbaikan.forEach(item => {
        history.push({
          type: 'perbaikan',
          title: item.nama,
          amount: parseFloat(item.biaya) || 0,
          date: item.tanggal,
          createdAt: item.createdAt,
        });
      });

      // Sort by createdAt (newest first)
      return history.sort((a, b) => 
        new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }
}

export default new LocalStorageService();
export { SHEETS };
