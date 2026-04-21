import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { ConfirmProvider } from './components/ConfirmModal';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfirmProvider>
      <App />
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 3200,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: '#0f172a',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#ecfdf5' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
          },
        }}
      />
    </ConfirmProvider>
  </React.StrictMode>
);

reportWebVitals();
