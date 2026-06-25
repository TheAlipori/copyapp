import { useState, useEffect } from 'react';
import { Trash2, UserPlus } from 'lucide-react';

type Cliente = { id: number; nombre: string; rfc: string; created_at: string };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marca-azul';

export default function ClientesManager() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nombre, setNombre] = useState('');
  const [rfc, setRfc] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.ok ? r.json() : []).then(setClientes).catch(() => {});
  }, []);

  async function handleAgregar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError(null);
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), rfc: rfc.trim() || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setClientes((prev) => [data, ...prev].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNombre('');
      setRfc('');
    } else {
      setError(data.error ?? 'Error al guardar');
    }
    setGuardando(false);
  }

  async function handleEliminar(id: number) {
    if (!confirm('¿Eliminar este cliente?')) return;
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (res.ok) setClientes((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Formulario agregar */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
          <UserPlus size={16} /> Nuevo cliente
        </h2>
        <form onSubmit={handleAgregar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre o empresa"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">RFC (opcional)</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={13}
                className={`mt-1 ${inputCls} font-mono`}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando || !nombre.trim()}
            className="bg-marca-azul hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-opacity"
          >
            {guardando ? 'Guardando...' : 'Agregar cliente'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Clientes registrados</h2>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{clientes.length}</span>
        </div>

        {clientes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sin clientes registrados</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {clientes.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.nombre}</p>
                  <p className="text-xs font-mono text-gray-400">{c.rfc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEliminar(c.id)}
                  title="Eliminar"
                  className="text-gray-300 hover:text-marca-rojo transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
