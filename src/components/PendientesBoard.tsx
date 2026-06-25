import { useState, useEffect, useCallback } from 'react';
import { Calendar, Timer, Settings, X, Receipt, Banknote, ArrowRight, Layers, Printer, GripVertical } from 'lucide-react';
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensors, useSensor,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';

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
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/pendientes');
      if (res.ok) setPendientes(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 4000);
    return () => clearInterval(intervalo);
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

  async function moverA(p: Pendiente, targetStatus: Status) {
    if (p.status === targetStatus) return;
    const body: any = { status: targetStatus };
    if (targetStatus === 'finalizado') body.hecho_por = username;
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

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const p = pendientes.find((x) => x.id === active.id);
    if (!p) return;
    const targetStatus = over.id as Status;
    if (p.status !== targetStatus) moverA(p, targetStatus);
  }

  const draggingPendiente = draggingId != null ? pendientes.find((p) => p.id === draggingId) ?? null : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-gray-800 text-lg">Trabajos pendientes</h1>
        <button type="button" onClick={() => setShowForm(true)}
          className="bg-marca-azul hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-opacity">
          + Nuevo pendiente
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {COLUMNAS.map(({ status, label, color }) => {
          const tarjetas = pendientes.filter((p) => p.status === status);
          return (
            <DroppableColumn key={status} status={status} label={label} color={color} count={tarjetas.length}>
              <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                {tarjetas.map((p) => (
                  <DraggableTarjeta key={p.id} p={p}
                    onAvanzar={() => avanzar(p)}
                    onEditar={() => abrirEditar(p)}
                    onEliminar={() => eliminar(p.id)} />
                ))}
                {tarjetas.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-6">Sin trabajos</p>
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingPendiente ? (
          <div className="rotate-1 opacity-90 shadow-2xl">
            <Tarjeta p={draggingPendiente}
              onAvanzar={() => {}} onEditar={() => {}} onEliminar={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

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

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1119.76 216.34" style="width:180px;height:auto;display:inline-block;"><defs><style>.t1{fill:#1d71b8}.t2{fill:#fff;stroke:#1d71b8;stroke-miterlimit:10;stroke-width:3px}.t3{fill:#fff}</style></defs><g transform="translate(0 -8.21)"><path class="t1" d="M108.17,8.21A108.17,108.17,0,1,0,216.34,116.38,108.17,108.17,0,0,0,108.17,8.21ZM11,95.18C22,42.69,77.31-4.22,148.52,25.94c23.53,10,40.82,27.43,51.64,50.89a49.07,49.07,0,0,1,4.71,21.51c-2.59-1.21-4.61-2-6.47-3Q174.67,81.75,151,68.11c-12.81-7.35-26-13.67-40.87-15.63-15.45-2-29.14,2-41,12C55.51,76,47.36,90.91,42.35,107.81c-.92,3.11.91,3.83,2.95,4.83q35,17.25,69.93,34.54c.88.43,1.71,1,2.86,1.63-15.36,16.58-33.89,24-56,21.17C24.65,165.19,3,133.69,11,95.18Zm58.29,113A23.33,23.33,0,0,1,59,204.91c-19.28-11.71-33.06-28.43-42.9-48.59a10.2,10.2,0,0,1-.25-2.2A76.46,76.46,0,0,0,62.19,176.2c22.3,2.51,41.6-4.29,57-20.79,10.42-11.17,14.73-24.73,11.92-40-2.25-12.22-12.26-20.21-25.12-20.83-11.84-.58-24.06,7.59-27.24,18.2C96,99.52,105.47,98.18,116.31,107.5c8.61,7.42,10.58,20.57,4.58,31.79L52.48,106.17c7-30.21,38.26-53.41,69.41-42,12.16,4.46,20.8,13,27,24.22C172.1,130.18,153.32,182,108,201.3A85.1,85.1,0,0,1,69.33,208.13Zm62.15,5.68c-11.94,3.2-23.27,3.33-38.31.28,30.71-5.9,50.82-24.36,64.69-50.34,14.39-27,10.13-54.13-.94-81.67a21.19,21.19,0,0,1,3.08,1c14.67,8.07,29.37,16.1,43.94,24.36a6.54,6.54,0,0,1,3,4.58C208.35,160,177.46,201.53,131.48,213.81Z"/><path class="t2" d="M131.48,213.81c-11.94,3.2-23.27,3.33-38.31.28,30.71-5.9,50.82-24.36,64.69-50.34,14.39-27,10.13-54.13-.94-81.67a21.19,21.19,0,0,1,3.08,1c14.67,8.07,29.37,16.1,43.94,24.36a6.54,6.54,0,0,1,3,4.58C208.35,160,177.46,201.53,131.48,213.81Z"/><path class="t2" d="M108,201.3a85.1,85.1,0,0,1-38.7,6.83A23.33,23.33,0,0,1,59,204.91c-19.28-11.71-33.06-28.43-42.9-48.59a10.2,10.2,0,0,1-.25-2.2A76.46,76.46,0,0,0,62.19,176.2c22.3,2.51,41.6-4.29,57-20.79,10.42-11.17,14.73-24.73,11.92-40-2.25-12.22-12.26-20.21-25.12-20.83-11.84-.58-24.06,7.59-27.24,18.2C96,99.52,105.47,98.18,116.31,107.5c8.61,7.42,10.58,20.57,4.58,31.79L52.48,106.17c7-30.21,38.26-53.41,69.41-42,12.16,4.46,20.8,13,27,24.22C172.1,130.18,153.32,182,108,201.3Z"/><path class="t3" d="M204.87,98.34c-2.59-1.21-4.61-2-6.47-3Q174.67,81.75,151,68.11c-12.81-7.35-26-13.67-40.87-15.63-15.45-2-29.14,2-41,12C55.51,76,47.36,90.91,42.35,107.81c-.92,3.11.91,3.83,2.95,4.83q35,17.25,69.93,34.54c.88.43,1.71,1,2.86,1.63-15.36,16.58-33.89,24-56,21.17C24.65,165.19,3,133.69,11,95.18,22,42.69,77.31-4.22,148.52,25.94c23.53,10,40.82,27.43,51.64,50.89A49.07,49.07,0,0,1,204.87,98.34Z"/><path class="t3" d="M301.47,61.2a73.68,73.68,0,0,1,20,2.41Q330,66,334.68,70.33a13.54,13.54,0,0,1,4.71,10.34A13,13,0,0,1,337,88.19a8,8,0,0,1-7,3.51,13.64,13.64,0,0,1-5.32-.9,13.83,13.83,0,0,1-3.71-2.31,21.36,21.36,0,0,0-3.81-2.61A18.49,18.49,0,0,0,311,84a40.46,40.46,0,0,0-6.12-.71q-10.23,0-17.36,4.42a29.38,29.38,0,0,0-10.94,11.94A37.88,37.88,0,0,0,272.77,117a36.74,36.74,0,0,0,3.91,17.16,30.57,30.57,0,0,0,10.84,11.94,29.06,29.06,0,0,0,16,4.42,53.38,53.38,0,0,0,8.63-.61,21.37,21.37,0,0,0,6-1.8,37.6,37.6,0,0,0,5-3.41q2.21-1.81,6.62-1.81c3.48,0,6.15,1.1,8,3.31a12.16,12.16,0,0,1,2.81,8.13q0,5-5.62,9.13a45.23,45.23,0,0,1-14.75,6.62,74.53,74.53,0,0,1-19.77,2.51q-15.85,0-27.49-7.33a48.94,48.94,0,0,1-18-20,62.45,62.45,0,0,1-6.32-28.3q0-16.44,6.72-29a49.88,49.88,0,0,1,18.67-19.67Q286,61.21,301.47,61.2Z"/><path class="t3" d="M462.19,117q0,16.47-7.32,29a52.57,52.57,0,0,1-19.66,19.56,57.67,57.67,0,0,1-55.19,0A52.57,52.57,0,0,1,360.36,146Q353,133.44,353,117t7.33-29A53.38,53.38,0,0,1,380,68.32a57,57,0,0,1,55.19,0A53.38,53.38,0,0,1,454.87,88Q462.19,100.53,462.19,117Zm-24.07,0A36.45,36.45,0,0,0,434,99.23a30.61,30.61,0,0,0-11-11.74,30,30,0,0,0-30.71,0,30.61,30.61,0,0,0-11,11.74A36.34,36.34,0,0,0,377.11,117a35.91,35.91,0,0,0,4.12,17.56,30.61,30.61,0,0,0,11,11.74,30,30,0,0,0,30.71,0,30.61,30.61,0,0,0,11-11.74A36,36,0,0,0,438.12,117Z"/><path class="t3" d="M538.85,61.2A45.79,45.79,0,0,1,564,68.32a50.66,50.66,0,0,1,17.66,19.57q6.51,12.44,6.52,28.89t-6.52,29a50.92,50.92,0,0,1-17.46,19.66,44,44,0,0,1-24.58,7.13,42.85,42.85,0,0,1-15-2.61,48,48,0,0,1-12.34-6.62,38,38,0,0,1-8.23-8.13q-2.91-4.11-2.91-6.92l6.22-2.61v52.77a12,12,0,0,1-3.41,8.73,11.52,11.52,0,0,1-8.63,3.51,11.68,11.68,0,0,1-8.63-3.41,11.94,11.94,0,0,1-3.41-8.83v-123a12,12,0,0,1,3.41-8.73,12.36,12.36,0,0,1,17.26,0,12,12,0,0,1,3.41,8.73v9.83l-3.41-1.81q0-2.59,2.81-6.32a40.72,40.72,0,0,1,7.63-7.42,43.13,43.13,0,0,1,11.13-6.12A37.09,37.09,0,0,1,538.85,61.2Zm-3,22.07a27.21,27.21,0,0,0-15.45,4.42,29.93,29.93,0,0,0-10.34,11.94,38.16,38.16,0,0,0-3.71,17.15,39,39,0,0,0,3.71,17.16,29.66,29.66,0,0,0,10.34,12.14,27.21,27.21,0,0,0,15.45,4.42,26.77,26.77,0,0,0,15.35-4.42,30,30,0,0,0,10.23-12.14,39,39,0,0,0,3.71-17.16,38.16,38.16,0,0,0-3.71-17.15,30.3,30.3,0,0,0-10.23-11.94A26.77,26.77,0,0,0,535.84,83.27Z"/><path class="t3" d="M688.94,63.21a11.53,11.53,0,0,1,8.63,3.51A12,12,0,0,1,701,75.45v85.28q0,18.47-6.92,29.4a39.42,39.42,0,0,1-18.56,15.75,67.68,67.68,0,0,1-26.09,4.81,99.32,99.32,0,0,1-13.65-1,45.86,45.86,0,0,1-11.83-3q-6-2.61-8.33-6.52a9.86,9.86,0,0,1-.91-8.33q1.81-5.82,5.82-7.92a10,10,0,0,1,8.43-.51q3.21,1,8.43,3.11a31.87,31.87,0,0,0,12,2.11q9.23,0,15.35-2.51a17.71,17.71,0,0,0,9.23-8.43q3.1-5.91,3.11-16.15V148.09l4.21,4.81a35,35,0,0,1-8.52,10.94,34.67,34.67,0,0,1-12.14,6.52,53.66,53.66,0,0,1-16.06,2.21A34.46,34.46,0,0,1,626,167.65,33.37,33.37,0,0,1,613.69,154a43.7,43.7,0,0,1-4.41-20V75.45a12,12,0,0,1,3.41-8.73,12.35,12.35,0,0,1,17.25,0,12,12,0,0,1,3.42,8.73v51.37q0,13,5.72,18.36T655,150.5a23.91,23.91,0,0,0,11.84-2.71,18,18,0,0,0,7.42-8,29.15,29.15,0,0,0,2.61-12.94V75.45a12,12,0,0,1,3.41-8.73A11.52,11.52,0,0,1,688.94,63.21Z"/><path class="t3" d="M783.45,61.2q16,0,23.68,7.73t10,20l-3.41-1.8,1.61-3.21a45.94,45.94,0,0,1,7.42-9.94,45.39,45.39,0,0,1,12.14-9,34,34,0,0,1,16-3.71q14.45,0,22,6.22A31.62,31.62,0,0,1,883.18,84,87.6,87.6,0,0,1,886,107v51.37a12,12,0,0,1-3.41,8.73,12.36,12.36,0,0,1-17.26,0,12,12,0,0,1-3.41-8.73V107A41.31,41.31,0,0,0,860.3,95a16.38,16.38,0,0,0-5.82-8.53c-2.8-2.13-6.82-3.21-12-3.21a25.24,25.24,0,0,0-13,3.21A20.82,20.82,0,0,0,821.27,95a26,26,0,0,0-2.7,11.94v51.37a12,12,0,0,1-3.42,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.41-8.73V107A41.31,41.31,0,0,0,792.88,95a16.38,16.38,0,0,0-5.82-8.53c-2.81-2.13-6.82-3.21-12-3.21a25.24,25.24,0,0,0-13,3.21A20.82,20.82,0,0,0,753.85,95,26,26,0,0,0,751.14,107v51.37a12,12,0,0,1-3.41,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.42-8.73V75.45a12,12,0,0,1,3.42-8.73,12.35,12.35,0,0,1,17.25,0,12,12,0,0,1,3.41,8.73v8.63l-3-.61a45.59,45.59,0,0,1,5-7.32A43.14,43.14,0,0,1,761,68.83a41.25,41.25,0,0,1,10.23-5.52A34.47,34.47,0,0,1,783.45,61.2Z"/><path class="t3" d="M1000,61.2a11.7,11.7,0,0,1,8.62,3.41,11.94,11.94,0,0,1,3.41,8.83v84.88a12,12,0,0,1-3.41,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.41-8.73v-9.83l4.41,1.8c0,1.75-.94,3.85-2.81,6.33a38.32,38.32,0,0,1-7.62,7.32,46.94,46.94,0,0,1-11.34,6.12,39.17,39.17,0,0,1-14.15,2.51,45.86,45.86,0,0,1-25.08-7.13,50.07,50.07,0,0,1-17.76-19.66q-6.52-12.54-6.52-28.8,0-16.44,6.52-29a50.7,50.7,0,0,1,17.56-19.67,44.23,44.23,0,0,1,24.48-7.12,46.36,46.36,0,0,1,15.85,2.61A47.4,47.4,0,0,1,984,70.43a38,38,0,0,1,8.23,8.13q2.91,4.11,2.91,6.92l-7.22,2.61V73.44a12,12,0,0,1,3.41-8.73A11.5,11.5,0,0,1,1000,61.2Zm-40.54,89.3a27.21,27.21,0,0,0,15.45-4.42,29.76,29.76,0,0,0,10.34-12A38.51,38.51,0,0,0,988.93,117a39,39,0,0,0-3.71-17.25,29.82,29.82,0,0,0-10.34-12,27.21,27.21,0,0,0-15.45-4.42,26.9,26.9,0,0,0-15.25,4.42,29.8,29.8,0,0,0-10.33,12A38.81,38.81,0,0,0,930.13,117,38.38,38.38,0,0,0,933.85,134a29.74,29.74,0,0,0,10.33,12A26.9,26.9,0,0,0,959.43,150.5Z"/><path class="t3" d="M1040.3,63.21a12.18,12.18,0,0,1,9.83,5l67,83.28a11.16,11.16,0,0,1,2.61,7.22,11.48,11.48,0,0,1-3.81,8.63,12,12,0,0,1-8.43,3.61q-5.82,0-9.83-5.21l-67-83.28a11.63,11.63,0,0,1,1.11-15.85A12.21,12.21,0,0,1,1040.3,63.21Zm.2,107.55a12.65,12.65,0,0,1-7.93-3.11,9.31,9.31,0,0,1-3.91-7.52,11.74,11.74,0,0,1,3-7.63l30.7-37.52,12,20.06-24.28,30.71A11.63,11.63,0,0,1,1040.5,170.76Zm66.82-107.55a11,11,0,0,1,8.12,3.31,10.36,10.36,0,0,1,3.32,7.52,13.67,13.67,0,0,1-.61,4,10.11,10.11,0,0,1-2.2,3.81l-30.3,36.92L1073,101.33l24.69-32.71Q1101.69,63.21,1107.32,63.21Z"/></g></svg>`;

function imprimirPendiente(p: Pendiente) {
  const tipos = stringToTipos(p.tipo_trabajo)
    .map((t) => TIPOS_TRABAJO.find((x) => x.value === t)?.label ?? t)
    .join(', ');
  const fechaRegistro = new Date(p.created_at + 'Z').toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  const fechaEntrega = p.fecha_entrega
    ? new Date(p.fecha_entrega).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
  const estadoPagoLabel = { pendiente: 'Sin pagar', anticipo: 'Anticipo', pagado: 'Pagado' }[p.estado_pago];
  const restante = p.monto != null && p.monto_anticipo != null ? p.monto - p.monto_anticipo : null;

  const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Orden ${p.folio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; width: 5.5in; padding: 0.4in; }
    .logo { text-align: center; margin-bottom: 6px; }
    .titulo { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
    .folio { text-align: center; font-size: 13px; margin-bottom: 2px; }
    .fecha-reg { text-align: center; font-size: 11px; color: #555; margin-bottom: 8px; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
    .label { color: #555; flex-shrink: 0; margin-right: 8px; }
    .value { font-weight: bold; text-align: right; }
    .instrucciones { font-size: 12px; margin-top: 4px; padding: 6px; border: 1px dashed #aaa; }
    .instrucciones-label { font-size: 11px; color: #555; margin-bottom: 3px; }
    .footer { text-align: center; font-size: 11px; margin-top: 14px; color: #555; }
    @media print { @page { size: 5.5in 8.5in; margin: 0; } body { padding: 0.4in; } }
  </style></head><body>
  <div class="logo">${LOGO_SVG}</div>
  <div class="titulo">ORDEN DE TRABAJO</div>
  <div class="folio">${p.folio}</div>
  <div class="fecha-reg">Registrado: ${fechaRegistro}</div>
  <hr/>
  <div class="row"><span class="label">Cliente:</span><span class="value">${p.nombre ?? '—'}</span></div>
  <div class="row"><span class="label">WhatsApp:</span><span class="value">${p.whatsapp}</span></div>
  ${tipos ? `<div class="row"><span class="label">Tipo de trabajo:</span><span class="value">${tipos}</span></div>` : ''}
  ${p.juegos != null ? `<div class="row"><span class="label">Juegos:</span><span class="value">${p.juegos}</span></div>` : ''}
  ${p.copias_total != null ? `<div class="row"><span class="label">Copias aprox.:</span><span class="value">${p.copias_total}</span></div>` : ''}
  <div class="row"><span class="label">Fecha de entrega:</span><span class="value">${fechaEntrega}</span></div>
  <hr/>
  ${p.monto != null ? `<div class="row"><span class="label">Monto total:</span><span class="value">$${p.monto.toFixed(2)}</span></div>` : ''}
  ${p.monto_anticipo != null ? `<div class="row"><span class="label">Anticipo:</span><span class="value">$${p.monto_anticipo.toFixed(2)}</span></div>` : ''}
  ${restante != null ? `<div class="row"><span class="label">Restante:</span><span class="value">$${restante.toFixed(2)}</span></div>` : ''}
  ${p.metodo_pago_pendiente ? `<div class="row"><span class="label">Método de pago:</span><span class="value" style="text-transform:capitalize">${p.metodo_pago_pendiente}</span></div>` : ''}
  <div class="row"><span class="label">Estado de pago:</span><span class="value">${estadoPagoLabel}</span></div>
  ${p.factura === 1 ? `<div class="row"><span class="label">Factura:</span><span class="value">Sí</span></div>` : ''}
  ${p.instrucciones_adicionales ? `<hr/><div class="instrucciones-label">Instrucciones adicionales:</div><div class="instrucciones">${p.instrucciones_adicionales}</div>` : ''}
  <hr/>
  <div class="footer">¡Gracias por tu preferencia!</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=620,height=700');
  if (win) { win.document.write(html); win.document.close(); }
}

function DroppableColumn({ status, label, color, count, children }: {
  status: Status; label: string; color: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`flex flex-col gap-2 overflow-hidden rounded-xl transition-colors ${isOver ? 'ring-2 ring-marca-azul ring-offset-2' : ''}`}>
      <div className={`bg-white rounded-xl border-t-4 ${color} shadow p-3`}>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {children}
    </div>
  );
}

function DraggableTarjeta({ p, onAvanzar, onEditar, onEliminar }: {
  p: Pendiente; onAvanzar: () => void; onEditar: () => void; onEliminar: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: p.id,
    data: { p },
  });
  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-30' : ''}>
      <Tarjeta p={p} onAvanzar={onAvanzar} onEditar={onEditar} onEliminar={onEliminar}
        dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function Tarjeta({ p, onAvanzar, onEditar, onEliminar, dragHandleProps }: {
  p: Pendiente; onAvanzar: () => void; onEditar: () => void; onEliminar: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
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
        <div className="flex items-center gap-1.5">
          {dragHandleProps && (
            <span {...dragHandleProps} className="text-white/50 hover:text-white/80 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={14} />
            </span>
          )}
          <span className="text-white text-xs font-bold tracking-wide">{p.folio}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => imprimirPendiente(p)} title="Imprimir orden"
            className="text-white/70 hover:text-white transition-colors">
            <Printer size={15} />
          </button>
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
