import React, { createContext, useContext, useState, useEffect } from 'react';

type DialogType = 'alert' | 'confirm';

interface DialogState {
  isOpen: boolean;
  message: string;
  type: DialogType;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AlertContextProps {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    message: '',
    type: 'alert',
    onConfirm: () => {}
  });

  const [toast, setToast] = useState<ToastState | null>(null);

  // Auto close toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const showAlert = (message: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        message,
        type: 'alert',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        message,
        type: 'confirm',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      
      {/* Custom Alert & Confirm Dialog Modal UI */}
      {dialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11, 15, 25, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '340px',
            padding: '28px 24px',
            background: 'rgba(22, 31, 48, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)',
            borderRadius: '20px',
            textAlign: 'center',
            animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            margin: 0,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <style>{`
              @keyframes scaleIn {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>

            {/* Glowing Accent Circle in Modal */}
            <div style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              background: dialog.type === 'confirm'
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(109, 40, 217, 0.2) 100%)',
              marginBottom: '16px',
              color: dialog.type === 'confirm' ? '#3b82f6' : '#8b5cf6'
            }}>
              {dialog.type === 'confirm' ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>
            
            <p style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'white',
              lineHeight: '1.6',
              marginBottom: '28px',
              whiteSpace: 'pre-wrap'
            }}>
              {dialog.message}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              {dialog.type === 'confirm' && (
                <button
                  className="btn btn-secondary"
                  onClick={dialog.onCancel}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  취소
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={dialog.onConfirm}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: dialog.type === 'confirm'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  boxShadow: dialog.type === 'confirm'
                    ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                    : '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert UI */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '360px',
          padding: '14px 20px',
          borderRadius: '14px',
          color: 'white',
          fontWeight: 600,
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 
            toast.type === 'success' ? 'rgba(16, 185, 129, 0.85)' :
            toast.type === 'error' ? 'rgba(239, 68, 68, 0.85)' :
            'rgba(31, 41, 55, 0.85)',
          border: 
            toast.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' :
            toast.type === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' :
            '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <style>{`
            @keyframes slideDown {
              from { transform: translate(-50%, -20px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toast.type === 'success' && (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            {toast.message}
          </span>
          <button 
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              marginLeft: '12px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
