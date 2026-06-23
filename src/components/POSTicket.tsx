import { useState, useEffect } from 'react';

type Precio = {
  id: number;
  tipo: string;
  nombre: string;
  desde: number | null;
  hasta: number | null;
  precio: number;
  doble_cara: number;
};

type Producto = {
  id: number;
  nombre: string;
  precio: number;
};

type Item = {
  key: string;
  tipo: 'byn_carta' | 'byn_oficio' | 'byn_media_carta' | 'color' | 'producto' | 'servicio';
  descripcion: string;
  cantidad: number;
  precio_unit: number;
  subtotal: number;
  hojas?: number;
  doble_cara?: number;
  papel_especial?: string;
};

type Tab = 'byn' | 'color' | 'producto' | 'servicio';

const PAPELES_CARTA = [
  { valor: 'Couché',          label: 'Couché (+$1.50)' },
  { valor: 'Opalina delgada', label: 'Opalina delgada (+$2)' },
  { valor: 'Opalina gruesa',  label: 'Opalina gruesa (+$3)' },
  { valor: 'Adhesivo',        label: 'Adhesivo (+$4)' },
  { valor: 'Carolina',        label: 'Carolina (+$6)' },
  { valor: 'Fotográfico',     label: 'Fotográfico (+$7)' },
  { valor: 'Vinil',           label: 'Vinil (+$15)' },
];

const PAPELES_TABLOIDE = [
  { valor: 'Couché',    label: 'Couché (+$3)' },
  { valor: 'Carolina',  label: 'Carolina (+$9)' },
  { valor: 'Sulfatado', label: 'Sulfatado (+$7)' },
];

function calcularPrecioImpresion(
  tipo: 'byn_carta' | 'byn_oficio' | 'byn_media_carta',
  hojas: number,
  dobleCara: boolean,
  precios: Precio[],
): number {
  const dc = dobleCara ? 1 : 0;
  // Busca bracket con doble_cara exacto; si no existe, usa el de un solo lado
  const bracket =
    precios.find(
      (p) =>
        p.tipo === tipo &&
        p.doble_cara === dc &&
        (p.desde === null || hojas >= p.desde) &&
        (p.hasta === null || hojas <= p.hasta),
    ) ??
    precios.find(
      (p) =>
        p.tipo === tipo &&
        p.doble_cara === 0 &&
        (p.desde === null || hojas >= p.desde) &&
        (p.hasta === null || hojas <= p.hasta),
    );
  if (!bracket) return 0;
  return hojas * bracket.precio;
}

function calcularSurcharge(
  papelNombre: string,
  tipoPapel: string,
  hojas: number,
  precios: Precio[],
): number {
  const p = precios.find(
    (pr) => pr.tipo === tipoPapel && pr.nombre === papelNombre,
  );
  if (!p) return 0;
  return hojas * p.precio;
}

export default function POSTicket() {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [metodoPago, setMetodoPago] = useState('');
  const [tab, setTab] = useState<Tab>('byn');
  const [loading, setLoading] = useState(false);
  const [ultimoFolio, setUltimoFolio] = useState<string | null>(null);

  // B/N form
  const [bynTipo, setBynTipo] = useState<'byn_carta' | 'byn_oficio' | 'byn_media_carta'>('byn_carta');
  const [bynHojas, setBynHojas] = useState('');
  const [bynDobleCara, setBynDobleCara] = useState(false);

  // Color form
  const [colorTipo, setColorTipo] = useState<'color_carta' | 'color_tabloide'>('color_carta');
  const [colorHojas, setColorHojas] = useState('');
  const [colorPrecio, setColorPrecio] = useState('2');
  const [colorPapel, setColorPapel] = useState('');

  // Producto form
  const [prodId, setProdId] = useState('');
  const [prodCantidad, setProdCantidad] = useState('1');

  // Servicio form
  const [svcDesc, setSvcDesc] = useState('');
  const [svcMonto, setSvcMonto] = useState('');

  useEffect(() => {
    fetch('/api/pos/precios').then((r) => r.json()).then(setPrecios);
    fetch('/api/pos/productos').then((r) => r.json()).then(setProductos);
  }, []);

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const bynPreview = (() => {
    const h = parseInt(bynHojas);
    if (!h || h <= 0) return null;
    return calcularPrecioImpresion(bynTipo, h, bynDobleCara, precios);
  })();

  const colorPreview = (() => {
    const h = parseInt(colorHojas);
    const pu = parseFloat(colorPrecio);
    if (!h || !pu) return null;
    const tipoPapel = colorTipo === 'color_carta' ? 'papel_especial_carta' : 'papel_especial_tabloide';
    let p = h * pu;
    if (colorPapel) p += calcularSurcharge(colorPapel, tipoPapel, h, precios);
    return p;
  })();

  function addItem(item: Omit<Item, 'key'>) {
    setItems((prev) => [...prev, { ...item, key: crypto.randomUUID() }]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function handleAgregarByn() {
    const h = parseInt(bynHojas);
    if (!h || h <= 0) return;
    const subtotal = calcularPrecioImpresion(bynTipo, h, bynDobleCara, precios);
    const precio_unit = subtotal / h;

    const tipoLabel = bynTipo === 'byn_carta' ? 'Carta' : bynTipo === 'byn_oficio' ? 'Oficio' : 'Media carta';
    const dcLabel = bynDobleCara ? ' doble cara' : '';
    const desc = `Impresión B/N ${tipoLabel}${dcLabel} (${h} páginas)`;

    addItem({
      tipo: bynTipo,
      descripcion: desc,
      cantidad: h,
      precio_unit,
      subtotal,
      hojas: h,
      doble_cara: bynDobleCara ? 1 : 0,
      papel_especial: bynPapel || undefined,
    });

    setBynHojas('');
    setBynDobleCara(false);
  }

  function handleAgregarColor() {
    const h = parseInt(colorHojas);
    const pu = parseFloat(colorPrecio);
    if (!h || !pu) return;
    const tipoPapel = colorTipo === 'color_carta' ? 'papel_especial_carta' : 'papel_especial_tabloide';
    const surcharge = colorPapel ? calcularSurcharge(colorPapel, tipoPapel, h, precios) : 0;
    const subtotal = h * pu + surcharge;
    const tipoLabel = colorTipo === 'color_carta' ? 'Carta' : 'Tabloide';
    const papelLabel = colorPapel ? ` + ${colorPapel}` : '';
    const desc = `Impresión Color ${tipoLabel}${papelLabel} (${h} páginas @ $${pu}/pág)`;

    addItem({
      tipo: 'color',
      descripcion: desc,
      cantidad: h,
      precio_unit: pu,
      subtotal,
      hojas: h,
      papel_especial: colorPapel || undefined,
    });

    setColorTipo('color_carta');
    setColorHojas('');
    setColorPapel('');
  }

  function handleAgregarProducto() {
    const prod = productos.find((p) => p.id === parseInt(prodId));
    if (!prod) return;
    const cant = parseInt(prodCantidad) || 1;

    addItem({
      tipo: 'producto',
      descripcion: prod.nombre,
      cantidad: cant,
      precio_unit: prod.precio,
      subtotal: prod.precio * cant,
    });

    setProdId('');
    setProdCantidad('1');
  }

  function handleAgregarServicio() {
    const monto = parseFloat(svcMonto);
    if (!svcDesc.trim() || !monto) return;

    addItem({
      tipo: 'servicio',
      descripcion: svcDesc.trim(),
      cantidad: 1,
      precio_unit: monto,
      subtotal: monto,
    });

    setSvcDesc('');
    setSvcMonto('');
  }

  async function handleCobrar() {
    if (!items.length || !metodoPago) return;
    setLoading(true);
    try {
      const res = await fetch('/api/pos/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ key, ...i }) => i),
          metodo_pago: metodoPago,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUltimoFolio(data.folio);
        setItems([]);
        setMetodoPago('');
      } else {
        alert('Error al guardar la venta: ' + (data.error ?? 'desconocido'));
      }
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (t: Tab) =>
    `flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
      tab === t ? 'bg-white shadow text-[#1D70B7]' : 'text-gray-500 hover:text-gray-700'
    }`;

  const btnPrimary =
    'w-full bg-marca-azul hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-opacity';

  const inputClass =
    'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D70B7]';

  const previewBox = 'rounded-lg px-3 py-2 text-sm font-medium bg-[#FFF8EC] text-[#7a4f00] border border-marca-naranja';

  return (
    <div className="flex gap-4 h-full">
      {/* LEFT — Agregar ítems */}
      <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {(['byn', 'color', 'producto', 'servicio'] as Tab[]).map((t) => (
            <button type="button" key={t} onClick={() => setTab(t)} className={tabClass(t)}>
              {t === 'byn' ? 'B/N' : t === 'color' ? 'Color' : t === 'producto' ? 'Producto' : 'Servicio'}
            </button>
          ))}
        </div>

        {/* B/N */}
        {tab === 'byn' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Tamaño</label>
              <div className="flex gap-2 mt-1">
                {(['byn_carta', 'byn_oficio', 'byn_media_carta'] as const).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setBynTipo(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      bynTipo === v
                        ? 'bg-marca-azul text-white border-marca-azul'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-marca-azul'
                    }`}
                  >
                    {v === 'byn_carta' ? 'Carta' : v === 'byn_oficio' ? 'Oficio' : 'Media carta'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Número de páginas</label>
              <input
                type="number"
                min="1"
                value={bynHojas}
                onChange={(e) => setBynHojas(e.target.value)}
                placeholder="ej: 50"
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bynDobleCara}
                onChange={(e) => setBynDobleCara(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Doble cara</span>
            </label>

            {bynPreview !== null && (
              <div className={previewBox}>Precio: ${bynPreview.toFixed(2)}</div>
            )}

            <button
              type="button"
              onClick={handleAgregarByn}
              disabled={!bynHojas || parseInt(bynHojas) <= 0}
              className={btnPrimary}
            >
              Agregar al ticket
            </button>
          </div>
        )}

        {/* Color */}
        {tab === 'color' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Tamaño</label>
              <div className="flex gap-2 mt-1">
                {(['color_carta', 'color_tabloide'] as const).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => { setColorTipo(v); setColorPapel(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      colorTipo === v
                        ? 'bg-marca-azul text-white border-marca-azul'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-marca-azul'
                    }`}
                  >
                    {v === 'color_carta' ? 'Carta' : 'Tabloide'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Número de páginas</label>
              <input
                type="number"
                min="1"
                value={colorHojas}
                onChange={(e) => setColorHojas(e.target.value)}
                placeholder="ej: 10"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Precio por hoja</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setColorPrecio(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      colorPrecio === p
                        ? 'bg-marca-azul text-white border-marca-azul'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-marca-azul'
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Papel especial</label>
              <select
                title="Papel especial"
                value={colorPapel}
                onChange={(e) => setColorPapel(e.target.value)}
                className={inputClass}
              >
                <option value="">Papel normal</option>
                {(colorTipo === 'color_carta' ? PAPELES_CARTA : PAPELES_TABLOIDE).map((p) => (
                  <option key={p.valor} value={p.valor}>{p.label}</option>
                ))}
              </select>
            </div>

            {colorPreview !== null && (
              <div className={previewBox}>Precio: ${colorPreview.toFixed(2)}</div>
            )}

            <button
              type="button"
              onClick={handleAgregarColor}
              disabled={!colorHojas || parseInt(colorHojas) <= 0}
              className={btnPrimary}
            >
              Agregar al ticket
            </button>
          </div>
        )}

        {/* Producto */}
        {tab === 'producto' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Producto</label>
              <select
                title="Producto"
                value={prodId}
                onChange={(e) => setProdId(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${p.precio.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Cantidad</label>
              <input
                type="number"
                min="1"
                value={prodCantidad}
                onChange={(e) => setProdCantidad(e.target.value)}
                placeholder="1"
                className={inputClass}
              />
            </div>

            {prodId && (
              <div className={previewBox}>
                Subtotal: ${(
                  (productos.find((p) => p.id === parseInt(prodId))?.precio ?? 0) *
                  (parseInt(prodCantidad) || 1)
                ).toFixed(2)}
              </div>
            )}

            <button
              type="button"
              onClick={handleAgregarProducto}
              disabled={!prodId}
              className={btnPrimary}
            >
              Agregar al ticket
            </button>

            {productos.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                No hay productos registrados. Agrega desde Admin → Productos.
              </p>
            )}
          </div>
        )}

        {/* Servicio */}
        {tab === 'servicio' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Descripción</label>
              <input
                type="text"
                value={svcDesc}
                onChange={(e) => setSvcDesc(e.target.value)}
                placeholder="ej: Diseño de tarjetas"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Monto ($)</label>
              <input
                type="number"
                min="0"
                step="0.50"
                value={svcMonto}
                onChange={(e) => setSvcMonto(e.target.value)}
                placeholder="ej: 150.00"
                className={inputClass}
              />
            </div>

            <button
              type="button"
              onClick={handleAgregarServicio}
              disabled={!svcDesc.trim() || !svcMonto}
              className={btnPrimary}
            >
              Agregar al ticket
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — Ticket */}
      <div className="w-80 flex flex-col">
        <div className="bg-white rounded-xl shadow p-4 flex flex-col h-full">
          <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
            Ticket
          </h2>

          {/* Folio del último cobro */}
          {ultimoFolio && (
            <div className="mb-3 bg-[#FFF8EC] border border-marca-naranja rounded-lg px-3 py-2 text-sm text-[#7a4f00]">
              Venta registrada: <strong>{ultimoFolio}</strong>
              <button
                type="button"
                onClick={() => setUltimoFolio(null)}
                className="ml-2 underline text-xs opacity-70 hover:opacity-100"
              >
                cerrar
              </button>
            </div>
          )}

          {/* Lista de ítems */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">El ticket está vacío</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 leading-tight wrap-break-word">{item.descripcion}</p>
                      <p className="text-gray-400 text-xs">
                        ${item.precio_unit.toFixed(2)} × {item.cantidad}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-gray-800">${item.subtotal.toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-marca-rojo hover:opacity-70 text-xs font-medium"
                      >
                        quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + pago + cobrar */}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 mb-3">
              {(
                [
                  ['efectivo', 'Efectivo'],
                  ['tarjeta', 'Tarjeta'],
                  ['transferencia', 'Transf.'],
                ] as [string, string][]
              ).map(([v, l]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setMetodoPago(v)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    metodoPago === v
                      ? 'bg-marca-naranja text-white border-marca-naranja'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-marca-naranja'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCobrar}
              disabled={!items.length || !metodoPago || loading}
              className="w-full bg-marca-naranja hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-lg px-4 py-3 text-sm transition-opacity"
            >
              {loading ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
