import { useState, useEffect, useCallback } from 'react';
import { Calendar, Timer, Settings, X, Receipt, Banknote, ArrowRight, Layers, Printer } from 'lucide-react';

type Status = 'tomado' | 'en_curso' | 'finalizado';
type EstadoPago = 'pendiente' | 'anticipo' | 'pagado';
type MetodoPago = 'efectivo' | 'transferencia';

type Pendiente = {
  id: number;
  folio: string;
  whatsapp: string;
  nombre: string | null;
  instrucciones_adicionales: string | null;
  fecha_entrega: string | null;
  tipo_trabajo: string | null;
  juegos: number | null;
  copias_total: number | null;
  monto: number | null;
  monto_anticipo: number | null;
  metodo_pago_pendiente: MetodoPago | null;
  factura: number;
  estado_pago: EstadoPago;
  status: Status;
  tomado_por: string | null;
  hecho_por: string | null;
  created_at: string;
};

const TIPOS_TRABAJO = [
  { value: 'byn_carta',  label: 'B/N Carta' },
  { value: 'byn_oficio', label: 'B/N Oficio' },
  { value: 'color',      label: 'Color' },
  { value: 'inyeccion',  label: 'Inyección de tinta' },
];

const COLUMNAS: { status: Status; label: string; color: string }[] = [
  { status: 'tomado',     label: 'Tomado',     color: 'border-t-marca-gris'    },
  { status: 'en_curso',   label: 'En curso',   color: 'border-t-marca-naranja' },
  { status: 'finalizado', label: 'Finalizado', color: 'border-t-marca-verde'   },
];

function getCountdown(fecha: string | null): { texto: string; color: string } | null {
  if (!fecha) return null;
  const diff = new Date(fecha).getTime() - Date.now();
  if (diff < 0) return { texto: 'Vencido', color: 'text-marca-rojo' };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const texto = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const color = diff < 10800000 ? 'text-marca-rojo' : diff < 86400000 ? 'text-marca-naranja' : 'text-green-600';
  return { texto, color };
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marca-azul';

// Estado vacío para los formularios
const emptyForm = {
  whatsapp: '', nombre: '', instrucciones_adicionales: '', fecha_entrega: '',
  tipos: [] as string[], juegos: '', copias_total: '',
  monto: '', monto_anticipo: '', metodo_pago_pendiente: '' as MetodoPago | '',
  factura: false, estado_pago: 'pendiente' as EstadoPago,
};

function tiposToString(tipos: string[]) { return tipos.join(','); }
function stringToTipos(s: string | null) { return s ? s.split(',').filter(Boolean) : []; }

export default function PendientesBoard({ username }: { username: string }) {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Pendiente | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [eForm, setEForm] = useState({ ...emptyForm });

  const cargar = useCallback(async () => {
    const res = await fetch('/api/pendientes');
    if (res.ok) setPendientes(await res.json());
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function setF(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  function setE(field: string, value: any) {
    setEForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTipo(tipos: string[], t: string): string[] {
    return tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t];
  }

  function abrirEditar(p: Pendiente) {
    setEditando(p);
    setEForm({
      whatsapp: p.whatsapp,
      nombre: p.nombre ?? '',
      instrucciones_adicionales: p.instrucciones_adicionales ?? '',
      fecha_entrega: p.fecha_entrega ?? '',
      tipos: stringToTipos(p.tipo_trabajo),
      juegos: p.juegos != null ? String(p.juegos) : '',
      copias_total: p.copias_total != null ? String(p.copias_total) : '',
      monto: p.monto != null ? String(p.monto) : '',
      monto_anticipo: p.monto_anticipo != null ? String(p.monto_anticipo) : '',
      metodo_pago_pendiente: p.metodo_pago_pendiente ?? '',
      factura: p.factura === 1,
      estado_pago: p.estado_pago,
    });
  }

  async function avanzar(p: Pendiente) {
    const next: Record<Status, Status | null> = { tomado: 'en_curso', en_curso: 'finalizado', finalizado: null };
    if (!next[p.status]) return;
    const body: any = { status: next[p.status] };
    if (next[p.status] === 'finalizado') body.hecho_por = username;
    await fetch(`/api/pendientes/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    cargar();
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este pendiente?')) return;
    await fetch(`/api/pendientes/${id}`, { method: 'DELETE' });
    cargar();
  }

  function buildPayload(f: typeof emptyForm) {
    return {
      whatsapp: f.whatsapp.trim(),
      nombre: f.nombre.trim() || null,
      instrucciones_adicionales: f.instrucciones_adicionales.trim() || null,
      fecha_entrega: f.fecha_entrega || null,
      tipo_trabajo: f.tipos.length ? tiposToString(f.tipos) : null,
      juegos: f.juegos ? parseInt(f.juegos) : null,
      copias_total: f.copias_total ? parseInt(f.copias_total) : null,
      monto: f.monto ? parseFloat(f.monto) : null,
      monto_anticipo: f.monto_anticipo ? parseFloat(f.monto_anticipo) : null,
      metodo_pago_pendiente: f.metodo_pago_pendiente || null,
      factura: f.factura,
      estado_pago: f.estado_pago,
    };
  }

  async function handleCrear(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/pendientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ ...emptyForm });
    cargar();
  }

  async function handleGuardarEdicion(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editando) return;
    setSaving(true);
    await fetch(`/api/pendientes/${editando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(eForm)),
    });
    setSaving(false);
    setEditando(null);
    cargar();
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-gray-800 text-lg">Trabajos pendientes</h1>
        <button type="button" onClick={() => setShowForm(true)}
          className="bg-marca-azul hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-opacity">
          + Nuevo pendiente
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {COLUMNAS.map(({ status, label, color }) => {
          const tarjetas = pendientes.filter((p) => p.status === status);
          return (
            <div key={status} className="flex flex-col gap-2 overflow-hidden">
              <div className={`bg-white rounded-xl border-t-4 ${color} shadow p-3`}>
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tarjetas.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                {tarjetas.map((p) => (
                  <Tarjeta key={p.id} p={p}
                    onAvanzar={() => avanzar(p)}
                    onEditar={() => abrirEditar(p)}
                    onEliminar={() => eliminar(p.id)} />
                ))}
                {tarjetas.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-6">Sin trabajos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal — Nuevo */}
      {showForm && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-800 text-base mb-4">Nuevo pendiente</h2>
            <PendienteForm f={form} setF={setF} toggleTipo={(t) => setF('tipos', toggleTipo(form.tipos, t))}
              onSubmit={handleCrear} onCancel={() => setShowForm(false)} saving={saving} />
          </div>
        </div>
      )}

      {/* Modal — Editar */}
      {editando && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-800 text-base mb-1">Editar pendiente</h2>
            <p className="text-xs text-gray-400 mb-4">{editando.folio}</p>
            <PendienteForm f={eForm} setF={setE} toggleTipo={(t) => setE('tipos', toggleTipo(eForm.tipos, t))}
              onSubmit={handleGuardarEdicion} onCancel={() => setEditando(null)} saving={saving} showEstadoPago />
          </div>
        </div>
      )}
    </div>
  );
}

// Formulario reutilizable para crear y editar
function PendienteForm({
  f, setF, toggleTipo, onSubmit, onCancel, saving, showEstadoPago = false,
}: {
  f: ReturnType<typeof Object.assign<typeof emptyForm, {}>>;
  setF: (field: string, value: any) => void;
  toggleTipo: (t: string) => void;
  onSubmit: (e: { preventDefault(): void }) => void;
  onCancel: () => void;
  saving: boolean;
  showEstadoPago?: boolean;
}) {
  const restante =
    f.monto && f.monto_anticipo
      ? parseFloat(f.monto) - parseFloat(f.monto_anticipo)
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* WhatsApp + Nombre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">WhatsApp *</label>
          <input type="tel" required title="WhatsApp" inputMode="numeric" maxLength={10} pattern="\d{10}"
            value={f.whatsapp} onChange={(e) => setF('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="6183006203" className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Nombre (opcional)</label>
          <input type="text" title="Nombre" value={f.nombre} onChange={(e) => setF('nombre', e.target.value)}
            placeholder="Juan Pérez" className={`mt-1 ${inputCls}`} />
        </div>
      </div>

      {/* Tipo de trabajo */}
      <div>
        <label className="text-xs font-medium text-gray-600">Tipo de trabajo</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TIPOS_TRABAJO.map((t) => (
            <button key={t.value} type="button" onClick={() => toggleTipo(t.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                f.tipos.includes(t.value)
                  ? 'bg-marca-azul border-marca-azul text-white'
                  : 'border-gray-300 text-gray-600 hover:border-marca-azul'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Juegos + Copias */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Juegos</label>
          <input type="number" min="1" title="Juegos" value={f.juegos} onChange={(e) => setF('juegos', e.target.value)}
            placeholder="ej: 3" className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Copias aprox.</label>
          <input type="number" min="1" title="Copias totales" value={f.copias_total} onChange={(e) => setF('copias_total', e.target.value)}
            placeholder="ej: 150" className={`mt-1 ${inputCls}`} />
        </div>
      </div>

      {/* Fecha de entrega */}
      <div>
        <label className="text-xs font-medium text-gray-600">Fecha y hora de entrega</label>
        <input type="datetime-local" title="Fecha y hora de entrega" value={f.fecha_entrega}
          onChange={(e) => setF('fecha_entrega', e.target.value)} className={`mt-1 ${inputCls}`} />
      </div>

      {/* Monto + Anticipo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Monto total ($)</label>
          <input type="number" min="0" step="0.50" title="Monto total" value={f.monto}
            onChange={(e) => setF('monto', e.target.value)} placeholder="opcional" className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Anticipo ($)</label>
          <input type="number" min="0" step="0.50" title="Anticipo" value={f.monto_anticipo}
            onChange={(e) => setF('monto_anticipo', e.target.value)} placeholder="opcional" className={`mt-1 ${inputCls}`} />
        </div>
      </div>
      {restante !== null && (
        <p className="text-xs font-medium text-gray-600">
          Restante: <span className={restante < 0 ? 'text-marca-rojo' : 'text-green-600'}>${restante.toFixed(2)}</span>
        </p>
      )}

      {/* Método de pago */}
      <div>
        <label className="text-xs font-medium text-gray-600">Método de pago</label>
        <div className="flex gap-2 mt-1">
          {(['efectivo', 'transferencia'] as MetodoPago[]).map((m) => (
            <button key={m} type="button" onClick={() => setF('metodo_pago_pendiente', f.metodo_pago_pendiente === m ? '' : m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                f.metodo_pago_pendiente === m
                  ? 'bg-marca-azul border-marca-azul text-white'
                  : 'border-gray-300 text-gray-600 hover:border-marca-azul'
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Factura + Estado pago */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.factura} onChange={(e) => setF('factura', e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">Factura</span>
        </label>
      </div>

      {/* Estado de pago — solo en edición */}
      {showEstadoPago && (
        <div>
          <label className="text-xs font-medium text-gray-600">Estado de pago</label>
          <div className="flex gap-2 mt-1">
            {(['pendiente', 'anticipo', 'pagado'] as EstadoPago[]).map((ep) => (
              <button key={ep} type="button" onClick={() => setF('estado_pago', ep)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  f.estado_pago === ep
                    ? ep === 'pagado' ? 'bg-green-500 border-green-500 text-white'
                      : ep === 'anticipo' ? 'bg-marca-naranja border-marca-naranja text-white'
                      : 'bg-gray-400 border-gray-400 text-white'
                    : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }`}>
                {ep === 'pendiente' ? 'Sin pagar' : ep === 'anticipo' ? 'Anticipo' : 'Pagado'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones adicionales */}
      <div>
        <label className="text-xs font-medium text-gray-600">Instrucciones adicionales</label>
        <textarea title="Instrucciones adicionales" value={f.instrucciones_adicionales}
          onChange={(e) => setF('instrucciones_adicionales', e.target.value)}
          placeholder="Notas extra, detalles especiales..." rows={2}
          className={`mt-1 ${inputCls} resize-none`} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-marca-azul hover:opacity-90 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-opacity">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function Tarjeta({ p, onAvanzar, onEditar, onEliminar }: {
  p: Pendiente; onAvanzar: () => void; onEditar: () => void; onEliminar: () => void;
}) {
  const siguiente = ({ tomado: 'Iniciar', en_curso: 'Finalizar', finalizado: null } as Record<Status, string | null>)[p.status];
  const countdown = p.status !== 'finalizado' ? getCountdown(p.fecha_entrega) : null;
  const tipos = stringToTipos(p.tipo_trabajo);
  const restante = p.monto != null && p.monto_anticipo != null ? p.monto - p.monto_anticipo : null;

  const barColor = {
    tomado:     'bg-marca-gris',
    en_curso:   'bg-marca-naranja',
    finalizado: 'bg-marca-verde',
  }[p.status];

  const estadoBadge = {
    pendiente: 'border-gray-300 text-gray-500',
    anticipo: 'bg-marca-naranja border-marca-naranja text-white',
    pagado: 'bg-green-500 border-green-500 text-white',
  }[p.estado_pago];
  const estadoLabel = { pendiente: 'Sin pagar', anticipo: 'Anticipo', pagado: 'Pagado' }[p.estado_pago];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Barra de color */}
      <div className={`${barColor} flex items-center justify-between px-3 py-1.5`}>
        <span className="text-white text-xs font-bold tracking-wide">{p.folio}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEditar} title="Editar"
            className="text-white/70 hover:text-white transition-colors">
            <Settings size={15} />
          </button>
          <button type="button" onClick={onEliminar} title="Eliminar"
            className="text-white/70 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-2.5">
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 text-base leading-tight">{p.whatsapp}</p>
        {p.nombre && <p className="text-sm text-gray-500">{p.nombre}</p>}
      </div>

      {/* Tipos de trabajo */}
      {tipos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tipos.map((t) => (
            <span key={t} className="text-sm bg-gray-100 text-gray-600 rounded px-2 py-0.5">
              {TIPOS_TRABAJO.find((x) => x.value === t)?.label ?? t}
            </span>
          ))}
        </div>
      )}

      {/* Detalles */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        {p.fecha_entrega && (
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            Fecha de entrega: {new Date(p.fecha_entrega).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {p.juegos != null && <span className="flex items-center gap-1.5"><Layers size={14} />{p.juegos} juego{p.juegos !== 1 ? 's' : ''}</span>}
        {p.copias_total != null && <span className="flex items-center gap-1.5"><Printer size={14} />~{p.copias_total} impresiones aprox.</span>}
        {p.metodo_pago_pendiente && (
          <span className="flex items-center gap-1.5 capitalize">
            <Banknote size={14} />
            {p.metodo_pago_pendiente}
          </span>
        )}
        {p.factura === 1 && (
          <span className="flex items-center gap-1.5 font-medium text-marca-azul">
            <Receipt size={14} />
            Factura
          </span>
        )}
      </div>

      {/* Instrucciones adicionales */}
      {p.instrucciones_adicionales && (
        <p className="text-sm text-gray-600 leading-snug italic">{p.instrucciones_adicionales}</p>
      )}

      {/* Countdown */}
      {countdown && (
        <p className={`text-sm font-semibold flex items-center gap-1.5 ${countdown.color}`}>
          <Timer size={14} /> {countdown.texto}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-0.5 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium px-2 py-0.5 rounded-md border ${estadoBadge}`}>{estadoLabel}</span>
          {p.estado_pago === 'anticipo' && restante !== null && (
            <span className="text-xs text-gray-500">Resta: <strong>${restante.toFixed(2)}</strong></span>
          )}
          {p.monto != null && p.estado_pago === 'pendiente' && (
            <span className="text-xs font-medium text-gray-700">${p.monto.toFixed(2)}</span>
          )}
          {p.estado_pago === 'pagado' && p.monto != null && (
            <span className="text-xs font-medium text-gray-700">${p.monto.toFixed(2)}</span>
          )}
        </div>
        {siguiente && (
          <button type="button" onClick={onAvanzar}
            className="text-xs font-semibold text-marca-azul hover:opacity-70">
            <span className="flex items-center gap-1">{siguiente} <ArrowRight size={12} /></span>
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
