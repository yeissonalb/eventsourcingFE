import { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  RotateCw, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  History, 
  Check, 
  X, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Copy
} from 'lucide-react';
import { transactionApi } from './services/api';
import './App.css';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [currentTx, setCurrentTx] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form states
  const [newTxForm, setNewTxForm] = useState({
    amount: '15000',
    currency: 'CRC',
    customerId: 'cliente-' + Math.floor(100 + Math.random() * 900),
  });
  const [approvalCode, setApprovalCode] = useState('AUTH-' + Math.floor(100000 + Math.random() * 900000));
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes');

  // Cargar lista de transacciones
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await transactionApi.getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
      setServerOnline(true);
      return data;
    } catch (err) {
      setServerOnline(false);
      setErrorMessage(`No se pudo conectar con el Backend (Transaction API): ${err.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar detalle y eventos de la transacción seleccionada
  const loadTransactionDetail = useCallback(async (id) => {
    if (!id) return;
    setErrorMessage('');
    try {
      const [txState, txEvents] = await Promise.all([
        transactionApi.getTransaction(id),
        transactionApi.getTransactionEvents(id),
      ]);
      setCurrentTx(txState);
      setEvents(txEvents);
    } catch (err) {
      setErrorMessage(`Error cargando detalles: ${err.message}`);
    }
  }, []);

  // Efecto inicial
  useEffect(() => {
    fetchTransactions().then((list) => {
      if (list && list.length > 0 && !selectedId) {
        setSelectedId(list[0].transactionId);
      }
    });
  }, [fetchTransactions]);

  // Efecto cuando cambia la transacción seleccionada
  useEffect(() => {
    if (selectedId) {
      loadTransactionDetail(selectedId);
    }
  }, [selectedId, loadTransactionDetail]);

  // Acciones de ciclo de vida
  const handleAction = async (actionFn, successMsg) => {
    setErrorMessage('');
    setActionSuccess('');
    try {
      const result = await actionFn();
      setActionSuccess(successMsg);
      await fetchTransactions();
      if (selectedId) {
        await loadTransactionDetail(selectedId);
      }
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // 1. Crear Transacción
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await transactionApi.createTransaction(newTxForm);
      setShowCreateModal(false);
      await fetchTransactions();
      const newId = res?.state?.transactionId || res?.event?.transactionId;
      if (newId) {
        setSelectedId(newId);
      }
      setActionSuccess('Transacción creada exitosamente (Versión 1)');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // 2. Solicitar Cobro
  const handleRequestPayment = () => {
    if (!currentTx) return;
    handleAction(
      () => transactionApi.requestPayment(currentTx.transactionId, {
        expectedVersion: currentTx.version,
        amount: currentTx.amount
      }),
      'Cobro solicitado (Estado: PAYMENT_PENDING)'
    );
  };

  // 3. Aprobar Pago
  const handleApproveSubmit = (e) => {
    e.preventDefault();
    if (!currentTx) return;
    setShowApproveModal(false);
    handleAction(
      () => transactionApi.approvePayment(currentTx.transactionId, {
        approvalCode,
        expectedVersion: currentTx.version
      }),
      'Pago aprobado con código ' + approvalCode
    );
  };

  // 4. Rechazar Pago
  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!currentTx) return;
    setShowRejectModal(false);
    handleAction(
      () => transactionApi.rejectPayment(currentTx.transactionId, {
        reason: rejectionReason,
        expectedVersion: currentTx.version
      }),
      'Pago rechazado: ' + rejectionReason
    );
  };

  // 5. Reintentar Pago
  const handleRetryPayment = () => {
    if (!currentTx) return;
    handleAction(
      () => transactionApi.retryPayment(currentTx.transactionId, {
        expectedVersion: currentTx.version
      }),
      'Reintento de pago registrado (Nuevo intento)'
    );
  };

  // 6. Completar Transacción
  const handleCompleteTransaction = () => {
    if (!currentTx) return;
    handleAction(
      () => transactionApi.completeTransaction(currentTx.transactionId, {
        expectedVersion: currentTx.version
      }),
      'Transacción completada y finalizada exitosamente'
    );
  };

  // Copiar ID al portapapeles
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtrado de transacciones
  const filteredTransactions = transactions.filter((tx) => {
    const search = searchTerm.toLowerCase();
    return (
      (tx.transactionId || '').toLowerCase().includes(search) ||
      (tx.customerId || '').toLowerCase().includes(search) ||
      (tx.status || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div>
            <div className="brand-title">Event Sourcing Ledger</div>
            <div className="brand-subtitle">Historial Auditable Append-Only & Control de Estados</div>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="status-badge-server">
            <span className={`dot-indicator ${serverOnline ? 'online' : serverOnline === false ? 'offline' : ''}`}></span>
            <span>{serverOnline ? 'Backend Conectado (3000)' : serverOnline === false ? 'Backend Desconectado' : 'Conectando...'}</span>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={fetchTransactions}
            title="Refrescar lista"
          >
            <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-layout">
        {/* Left Sidebar: Transactions Feed */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <span className="sidebar-title">Transacciones ({transactions.length})</span>
            </div>
            <div className="search-input-wrap">
              <Search size={15} />
              <input 
                type="text" 
                className="search-input"
                placeholder="Buscar por ID, cliente, estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="tx-list">
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                {transactions.length === 0 ? (
                  <>
                    <History size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.85rem' }}>No hay transacciones registradas en el event-store.</p>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={() => setShowCreateModal(true)}
                    >
                      Crear la primera
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem' }}>Ninguna transacción coincide con el filtro.</p>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isSelected = tx.transactionId === selectedId;
                return (
                  <div
                    key={tx.transactionId}
                    className={`tx-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedId(tx.transactionId)}
                  >
                    <div className="tx-card-header">
                      <span className="tx-card-id">{tx.transactionId?.substring(0, 14)}...</span>
                      <span className={`badge-status ${tx.status}`}>{tx.status}</span>
                    </div>

                    <div className="tx-card-amount">
                      {tx.currency} {Number(tx.amount || 0).toLocaleString()}
                    </div>

                    <div className="tx-card-footer">
                      <span>{tx.customerId || 'Cliente'}</span>
                      <span className="badge-version">v{tx.version}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Detail & Action Area */}
        <main className="detail-area">
          {errorMessage && (
            <div className="alert-banner error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="alert-banner" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
              <CheckCircle2 size={18} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {!currentTx ? (
            <div className="detail-empty">
              <CreditCard size={56} style={{ opacity: 0.3 }} />
              <h3>Selecciona una transacción para ver su historial</h3>
              <p style={{ fontSize: '0.85rem' }}>O crea una nueva transacción para comenzar a registrar eventos inmutables.</p>
            </div>
          ) : (
            <>
              {/* Header Card / Reconstructed State */}
              <div className="detail-header-card">
                <div className="detail-title-row">
                  <div className="detail-id-wrap">
                    <span className="detail-id-text">{currentTx.transactionId}</span>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.6rem' }}
                      onClick={() => handleCopyId(currentTx.transactionId)}
                      title="Copiar ID"
                    >
                      {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge-status ${currentTx.status}`}>{currentTx.status}</span>
                    <span className="badge-version">Versión actual: {currentTx.version}</span>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Monto Total</span>
                    <span className="stat-value">{currentTx.currency} {Number(currentTx.amount || 0).toLocaleString()}</span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-label">Identificador Cliente</span>
                    <span className="stat-value" style={{ fontSize: '0.95rem' }}>{currentTx.customerId}</span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-label">Intentos de Pago</span>
                    <span className="stat-value">{currentTx.attemptCount ?? 0}</span>
                  </div>

                  {currentTx.approvalCode && (
                    <div className="stat-box">
                      <span className="stat-label">Código Aprobación</span>
                      <span className="stat-value" style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                        {currentTx.approvalCode}
                      </span>
                    </div>
                  )}

                  {currentTx.rejectionReason && (
                    <div className="stat-box">
                      <span className="stat-label">Motivo Rechazo</span>
                      <span className="stat-value" style={{ color: 'var(--accent-rose)', fontSize: '0.95rem' }}>
                        {currentTx.rejectionReason}
                      </span>
                    </div>
                  )}

                  {currentTx.completedAt && (
                    <div className="stat-box">
                      <span className="stat-label">Completada En</span>
                      <span className="stat-value" style={{ fontSize: '0.8rem' }}>
                        {new Date(currentTx.completedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action / Commands Bar */}
              <div className="actions-card">
                <div className="actions-header">
                  <span className="actions-title">
                    <ShieldCheck size={18} color="var(--accent-primary)" />
                    Comandos de Dominio Disponibles
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Requiere versión esperada: <code>{currentTx.version}</code>
                  </span>
                </div>

                <div className="actions-buttons-row">
                  {currentTx.status === 'CREATED' && (
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleRequestPayment}
                    >
                      <ArrowRight size={16} />
                      Solicitar Pago (PaymentRequested)
                    </button>
                  )}

                  {currentTx.status === 'PAYMENT_PENDING' && (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-success"
                        onClick={() => {
                          setApprovalCode('AUTH-' + Math.floor(100000 + Math.random() * 900000));
                          setShowApproveModal(true);
                        }}
                      >
                        <Check size={16} />
                        Aprobar Pago (PaymentApproved)
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-danger"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <X size={16} />
                        Rechazar Pago (PaymentRejected)
                      </button>
                    </>
                  )}

                  {currentTx.status === 'PAYMENT_REJECTED' && (
                    <button 
                      type="button" 
                      className="btn btn-warning"
                      onClick={handleRetryPayment}
                    >
                      <RotateCw size={16} />
                      Reintentar Pago (PaymentRetried - Intento {(currentTx.attemptCount || 1) + 1})
                    </button>
                  )}

                  {currentTx.status === 'PAYMENT_APPROVED' && (
                    <button 
                      type="button" 
                      className="btn btn-purple"
                      onClick={handleCompleteTransaction}
                    >
                      <ShieldCheck size={16} />
                      Completar Transacción (TransactionCompleted)
                    </button>
                  )}

                  {currentTx.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-completed-text)', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={18} />
                      <span>Transacción en estado terminal. Su historial es inmutable y no acepta más modificaciones.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Sourcing Chronological Timeline */}
              <div className="timeline-card">
                <div className="timeline-header">
                  <span className="timeline-title">
                    <History size={18} color="var(--accent-cyan)" />
                    Historial Inmutable de Eventos ({events.length} eventos registrados)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Almacenamiento Append-Only (event-store.jsonl)
                  </span>
                </div>

                <div className="timeline-list">
                  {events.map((evt, idx) => (
                    <div key={evt.id || `${evt.type}-${evt.version || idx}`} className="timeline-item">
                      <div className="timeline-marker">
                        {idx + 1}
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-item-header">
                          <span className="timeline-event-name">{evt.type}</span>
                          <div className="timeline-meta">
                            <span className="badge-version">v{evt.version}</span>
                            <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <div className="timeline-payload">
                          <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal: Crear Transacción */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Iniciar Nueva Transacción</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.5rem' }}
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  required
                  value={newTxForm.amount}
                  onChange={(e) => setNewTxForm({ ...newTxForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select 
                  className="form-input"
                  value={newTxForm.currency}
                  onChange={(e) => setNewTxForm({ ...newTxForm, currency: e.target.value })}
                >
                  <option value="CRC">CRC (Colones)</option>
                  <option value="USD">USD (Dólares)</option>
                  <option value="EUR">EUR (Euros)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ID de Cliente</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={newTxForm.customerId}
                  onChange={(e) => setNewTxForm({ ...newTxForm, customerId: e.target.value })}
                />
                <span className="form-hint">Registra el evento append-only TransactionCreated (versión 1).</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aprobar Pago */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Aprobar Pago</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.5rem' }}
                onClick={() => setShowApproveModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Código de Aprobación Bancaria</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={approvalCode}
                  onChange={(e) => setApprovalCode(e.target.value)}
                />
                <span className="form-hint">Se agregará el evento append-only PaymentApproved.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Confirmar Aprobación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rechazar Pago */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Rechazar Pago</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.5rem' }}
                onClick={() => setShowRejectModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Motivo del Rechazo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <span className="form-hint">Registra el evento PaymentRejected para auditoría. Podrá reintentarse después.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger">
                  Registrar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
