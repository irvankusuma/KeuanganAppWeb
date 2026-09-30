import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './context/ToastContext.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary menangkap error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#0a0f1a',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#0e1523',
            border: '1px solid #1e2d45',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Terjadi kesalahan
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.6 }}>
            Aplikasi gagal menampilkan halaman ini. Data Anda tetap aman tersimpan di perangkat.
            Muat ulang untuk melanjutkan.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            Muat Ulang Aplikasi
          </button>
          <details style={{ textAlign: 'left', fontSize: '11px', color: '#64748b' }}>
            <summary style={{ cursor: 'pointer' }}>Detail teknis (untuk developer)</summary>
            <pre
              style={{
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: '#0a0f1a',
                border: '1px solid #1e2d45',
                borderRadius: '8px',
                padding: '8px',
                maxHeight: '160px',
                overflow: 'auto',
              }}
            >
              {this.state.error?.stack || String(this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Service worker hanya didaftarkan pada build produksi agar dev server tidak kena cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) => console.warn('Gagal mendaftarkan service worker:', error));
  });
}
