const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const HISTORY_API_URL = import.meta.env.VITE_HISTORY_API_URL || 'http://localhost:3001';

/**
 * Manejador estándar de peticiones HTTP con extracción amigable de errores de NestJS
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (Array.isArray(errorJson.message)) {
        errorDetail = errorJson.message.join(', ');
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {
      // Ignora error de parseo JSON si no vino JSON
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const transactionApi = {
  /**
   * Obtiene la lista de transacciones registradas
   */
  async getTransactions() {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`);
      return await handleResponse(res);
    } catch (err) {
      // Intenta leer desde el History API si Transaction API no estuviese disponible
      try {
        const historyRes = await fetch(`${HISTORY_API_URL}/history/transactions`);
        return await handleResponse(historyRes);
      } catch {
        throw err;
      }
    }
  },

  /**
   * Obtiene el estado reconstruido de una transacción por ID
   */
  async getTransaction(id) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}`);
    return handleResponse(res);
  },

  /**
   * Obtiene el historial cronológico e inmutable de eventos para una transacción
   */
  async getTransactionEvents(id) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/events`);
    return handleResponse(res);
  },

  /**
   * Comando: Iniciar / Crear una transacción (versión 1)
   */
  async createTransaction({ amount, currency = 'CRC', customerId }) {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(amount),
        currency: currency.toUpperCase().trim(),
        customerId: customerId.trim(),
      }),
    });
    return handleResponse(res);
  },

  /**
   * Comando: Solicitar Cobro (requiere CREATED)
   */
  async requestPayment(id, { expectedVersion, amount }) {
    const payload = { expectedVersion };
    if (amount !== undefined && amount !== null && amount !== '') {
      payload.amount = Number(amount);
    }
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/request-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  /**
   * Comando: Rechazar Pago (requiere PAYMENT_PENDING)
   */
  async rejectPayment(id, { reason, expectedVersion }) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/reject-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: reason.trim(),
        expectedVersion,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Comando: Reintentar Pago (requiere PAYMENT_REJECTED)
   */
  async retryPayment(id, { expectedVersion }) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/retry-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedVersion,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Comando: Aprobar Pago (requiere PAYMENT_PENDING)
   */
  async approvePayment(id, { approvalCode, expectedVersion }) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/approve-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalCode: approvalCode.trim(),
        expectedVersion,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Comando: Completar Transacción (requiere PAYMENT_APPROVED)
   */
  async completeTransaction(id, { expectedVersion }) {
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedVersion,
      }),
    });
    return handleResponse(res);
  },
};
