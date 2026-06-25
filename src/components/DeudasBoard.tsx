import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

type Deuda = {
  id: number;
  cliente: string;
  concepto: string;
  monto: number;
  pagado: number;
  created_at: string;
};

type Cliente = { id: number; nombre: string };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marca-azul';

export default function DeudasBoard() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarPagadas, setMostrarPagadas] = useState(false);

  // Formulario
  const [clienteId, setClienteId] = useState('');
  const [clienteManual, setClienteManual] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esManual = clienteId === '__manual__';
  const nombreCliente = esManual
    ? clienteManual.trim()
    : clientes.find((c) => c.id === parseInt(clienteId))?.nombre ?? '';

  useEffect(() => {
    fetch('/api/deudas').then((r) => r.ok ? r.json() : []).then(setDeudas).catch(() => {});
    fetch('/api/clientes').then((r) => r.ok ? r.json() : []).then(setClientes).catch(() => {});
  }, []);

  async function handleAgregar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!nombreCliente || !monto) return;
    setGuardando(true);
    setError(null);

    const res = await fetch('/api/deudas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: nombreCliente,
        concepto: concepto.trim() || undefined,
        monto: parseFloat(monto),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setDeudas((prev) => [data, ...prev]);
      setClienteId('');
      setClienteManual('');
      setConcepto('');
      setMonto('');
    } else {
      setError(data.error ?? 'Error al guardar');
    }
    setGuardando(false);
  }

  async function marcarPagada(id: number) {
    const res = await fetch(`/api/deudas/${id}`, { method: 'PATCH' });
    if (res.ok) {
      const updated = await res.json();
      setDeudas((prev) => prev.map((d) => (d.id === id ? updated : d)));
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    const res = await fetch(`/api/deudas/${id}`, { method: 'DELETE' });
    if (res.ok) setDeudas((prev) => prev.filter((d) => d.id !== id));
  }

  const pendientes = deudas.filter((d) => !d.pagado);
  const pagadas = deudas.filter((d) => d.pagado);
  const totalPendiente = pendientes.reduce((s, d) => s + d.monto, 0);

  function formatFecha(raw: string) {
    return new Date(raw + 'Z').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
          <Plus size={15} /> Registrar deuda
        </h2>
        <form onSubmit={handleAgregar} className="space-y-3">
          {/* Selector de cliente */}
          <div>
            <label className="text-xs font-medium text-gray-600">Cliente *</label>
            <select
              title="Cliente"
              value={clienteId}
              onChange={(e) => { setClienteId(e.target.value); setClienteManual(''); }}
              required
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
              <option value="__manual__">— Ingresar manualmente</option>
            </select>
          </div>

          {esManual && (
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre del cliente *</label>
              <input
                type="text"
                required
                value={clienteManual}
                onChange={(e) => setClienteManual(e.target.value)}
                placeholder="Nombre completo"
                className={`mt-1 ${inputCls}`}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Concepto</label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="ej: Impresiones"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Monto *</label>
              <input
                type="number"
                required
                min="0.50"
                step="0.50"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="$0.00"
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={guardando || !nombreCliente || !monto}
            className="bg-marca-azul hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-opacity"
          >
            {guardando ? 'Guardando...' : 'Registrar deuda'}
          </button>
        </form>
      </div>

      {/* Deudas pendientes */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Por cobrar</h2>
            <span className="text-xs bg-marca-rojo/10 text-marca-rojo font-semibold rounded-full px-2 py-0.5">
              {pendientes.length}
            </span>
          </div>
          {pendientes.length > 0 && (
            <span className="text-sm font-bold text-gray-800">${totalPendiente.toFixed(2)}</span>
          )}
        </div>

        {pendientes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Sin deudas pendientes</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {pendientes.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{d.cliente}</p>
                  <p className="text-xs text-gray-400">{d.concepto} · {formatFecha(d.created_at)}</p>
                </div>
                <span className="font-bold text-gray-900 text-sm shrink-0">${d.monto.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => marcarPagada(d.id)}
                  title="Marcar como pagada"
                  className="text-gray-300 hover:text-marca-verde transition-colors p-1 shrink-0"
                >
                  <CheckCircle size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(d.id)}
                  title="Eliminar"
                  className="text-gray-300 hover:text-marca-rojo transition-colors p-1 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Deudas pagadas (colapsadas) */}
      {pagadas.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <button
            type="button"
            onClick={() => setMostrarPagadas((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 flex items-center gap-2">
              Cobradas
              <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5">{pagadas.length}</span>
            </span>
            {mostrarPagadas ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {mostrarPagadas && (
            <ul className="divide-y divide-gray-50 border-t border-gray-100">
              {pagadas.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 text-sm line-through">{d.cliente}</p>
                    <p className="text-xs text-gray-400">{d.concepto} · {formatFecha(d.created_at)}</p>
                  </div>
                  <span className="font-bold text-gray-500 text-sm shrink-0 line-through">${d.monto.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => eliminar(d.id)}
                    title="Eliminar"
                    className="text-gray-200 hover:text-marca-rojo transition-colors p-1 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
