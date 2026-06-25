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
type Cliente = { id: number; nombre: string; rfc: string };


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
  const [ultimoTicket, setUltimoTicket] = useState<{ items: Item[]; total: number; metodo_pago: string; cliente_nombre: string; cliente_rfc: string } | null>(null);
  const [modalCobro, setModalCobro] = useState(false);
  const [pagaCon, setPagaCon] = useState('');
  const [preciosLoaded, setPreciosLoaded] = useState(false);

  const [clienteNombre, setClienteNombre] = useState('Público General');
  const [clienteRfc, setClienteRfc] = useState('XAXX010101000');
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [modoSelector, setModoSelector] = useState<'cerrado' | 'lista' | 'manual'>('cerrado');

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
    fetch('/api/pos/precios')
      .then((r) => r.json())
      .then((data) => { setPrecios(data); setPreciosLoaded(true); });
    fetch('/api/pos/productos').then((r) => r.json()).then(setProductos);
    fetch('/api/clientes').then((r) => r.json()).then(setClientesGuardados);
  }, []);

  const papelesCarta = precios
    .filter((p) => p.tipo === 'papel_especial_carta')
    .map((p) => ({ valor: p.nombre, label: `${p.nombre} (+$${p.precio.toFixed(2)})` }));

  const papelesTabloide = precios
    .filter((p) => p.tipo === 'papel_especial_tabloide')
    .map((p) => ({ valor: p.nombre, label: `${p.nombre} (+$${p.precio.toFixed(2)})` }));

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const bynPreview = (() => {
    const h = parseInt(bynHojas);
    if (!h || h <= 0) return null;
    const precio = calcularPrecioImpresion(bynTipo, h, bynDobleCara, precios);
    return precio > 0 ? precio : 'sin_precio';
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
    if (bynPreview === 'sin_precio') return;

    const dc = bynDobleCara ? 1 : 0;
    const tipoLabel = bynTipo === 'byn_carta' ? 'Carta' : bynTipo === 'byn_oficio' ? 'Oficio' : 'Media carta';
    const dcLabel = bynDobleCara ? ' doble cara' : '';

    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.tipo === bynTipo && i.doble_cara === dc,
      );

      if (idx !== -1) {
        // Fusionar: recalcular con total de hojas
        const totalHojas = (prev[idx].hojas ?? 0) + h;
        const nuevoSubtotal = calcularPrecioImpresion(bynTipo, totalHojas, bynDobleCara, precios);
        const nuevoPrecioUnit = nuevoSubtotal / totalHojas;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          hojas: totalHojas,
          cantidad: totalHojas,
          precio_unit: nuevoPrecioUnit,
          subtotal: nuevoSubtotal,
          descripcion: `Impresión B/N ${tipoLabel}${dcLabel} (${totalHojas} páginas)`,
        };
        return updated;
      }

      // No existe: agregar nuevo
      const subtotal = calcularPrecioImpresion(bynTipo, h, bynDobleCara, precios);
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          tipo: bynTipo,
          descripcion: `Impresión B/N ${tipoLabel}${dcLabel} (${h} páginas)`,
          cantidad: h,
          precio_unit: subtotal / h,
          subtotal,
          hojas: h,
          doble_cara: dc,
        },
      ];
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
    const pagLabel = h === 1 ? 'página' : 'páginas';
    const precioEfectivo = subtotal / h;
    const desc = `Impresión Color ${tipoLabel}${papelLabel} (${h} ${pagLabel} @ $${precioEfectivo.toFixed(2)}/pág)`;

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

  function abrirModalCobro() {
    if (!items.length || !metodoPago) return;
    setPagaCon('');
    setModalCobro(true);
  }

  async function confirmarCobro() {
    setLoading(true);
    try {
      const res = await fetch('/api/pos/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ key, ...i }) => i),
          metodo_pago: metodoPago,
          cliente_nombre: clienteNombre,
          cliente_rfc: clienteRfc,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUltimoFolio(data.folio);
        setUltimoTicket({ items: [...items], total, metodo_pago: metodoPago, cliente_nombre: clienteNombre, cliente_rfc: clienteRfc });
        setItems([]);
        setMetodoPago('');
        setModalCobro(false);
        setPagaCon('');
        setClienteNombre('Público General');
        setClienteRfc('XAXX010101000');
        setEditandoCliente(false);
        setModoSelector('cerrado');
        setBusqueda('');
      } else {
        alert('Error al guardar la venta: ' + (data.error ?? 'desconocido'));
      }
    } finally {
      setLoading(false);
    }
  }

  const pagaConNum = parseFloat(pagaCon) || 0;
  const cambio = pagaConNum - total;

  function handleImprimir() {
    if (!ultimoTicket || !ultimoFolio) return;
    const { items: ticketItems, total: ticketTotal, metodo_pago, cliente_nombre: cNombre, cliente_rfc: cRfc } = ultimoTicket;
    const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const metodoLabel: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia' };
    const cambioStr = metodo_pago === 'efectivo' && pagaConNum > 0 ? `$${(pagaConNum - ticketTotal).toFixed(2)}` : '—';
    const pagaConStr = metodo_pago === 'efectivo' && pagaConNum > 0 ? `$${pagaConNum.toFixed(2)}` : '—';

    const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"/>
    <title>Ticket ${ultimoFolio}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 13px; width: 5.5in; padding: 0.4in; }
      .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 4px; }
      .folio { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 4px; }
      .fecha { text-align: center; font-size: 11px; margin-bottom: 10px; }
      hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
      .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
      .item-desc { flex: 1; padding-right: 8px; font-size: 12px; }
      .item-price { font-size: 12px; white-space: nowrap; }
      .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin: 6px 0; }
      .pago-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
      .footer { text-align: center; font-size: 11px; margin-top: 14px; color: #555; }
      @media print { @page { size: 5.5in 8.5in; margin: 0; } body { padding: 0.4in; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:6px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1119.76 216.34" style="width:160px;height:auto;display:inline-block;">
        <defs><style>.t1{fill:#1d71b8}.t2{fill:#fff;stroke:#1d71b8;stroke-miterlimit:10;stroke-width:3px}.t3{fill:#fff}</style></defs>
        <g transform="translate(0 -8.21)">
          <path class="t1" d="M108.17,8.21A108.17,108.17,0,1,0,216.34,116.38,108.17,108.17,0,0,0,108.17,8.21ZM11,95.18C22,42.69,77.31-4.22,148.52,25.94c23.53,10,40.82,27.43,51.64,50.89a49.07,49.07,0,0,1,4.71,21.51c-2.59-1.21-4.61-2-6.47-3Q174.67,81.75,151,68.11c-12.81-7.35-26-13.67-40.87-15.63-15.45-2-29.14,2-41,12C55.51,76,47.36,90.91,42.35,107.81c-.92,3.11.91,3.83,2.95,4.83q35,17.25,69.93,34.54c.88.43,1.71,1,2.86,1.63-15.36,16.58-33.89,24-56,21.17C24.65,165.19,3,133.69,11,95.18Zm58.29,113A23.33,23.33,0,0,1,59,204.91c-19.28-11.71-33.06-28.43-42.9-48.59a10.2,10.2,0,0,1-.25-2.2A76.46,76.46,0,0,0,62.19,176.2c22.3,2.51,41.6-4.29,57-20.79,10.42-11.17,14.73-24.73,11.92-40-2.25-12.22-12.26-20.21-25.12-20.83-11.84-.58-24.06,7.59-27.24,18.2C96,99.52,105.47,98.18,116.31,107.5c8.61,7.42,10.58,20.57,4.58,31.79L52.48,106.17c7-30.21,38.26-53.41,69.41-42,12.16,4.46,20.8,13,27,24.22C172.1,130.18,153.32,182,108,201.3A85.1,85.1,0,0,1,69.33,208.13Zm62.15,5.68c-11.94,3.2-23.27,3.33-38.31.28,30.71-5.9,50.82-24.36,64.69-50.34,14.39-27,10.13-54.13-.94-81.67a21.19,21.19,0,0,1,3.08,1c14.67,8.07,29.37,16.1,43.94,24.36a6.54,6.54,0,0,1,3,4.58C208.35,160,177.46,201.53,131.48,213.81Z"/>
          <path class="t2" d="M131.48,213.81c-11.94,3.2-23.27,3.33-38.31.28,30.71-5.9,50.82-24.36,64.69-50.34,14.39-27,10.13-54.13-.94-81.67a21.19,21.19,0,0,1,3.08,1c14.67,8.07,29.37,16.1,43.94,24.36a6.54,6.54,0,0,1,3,4.58C208.35,160,177.46,201.53,131.48,213.81Z"/>
          <path class="t2" d="M108,201.3a85.1,85.1,0,0,1-38.7,6.83A23.33,23.33,0,0,1,59,204.91c-19.28-11.71-33.06-28.43-42.9-48.59a10.2,10.2,0,0,1-.25-2.2A76.46,76.46,0,0,0,62.19,176.2c22.3,2.51,41.6-4.29,57-20.79,10.42-11.17,14.73-24.73,11.92-40-2.25-12.22-12.26-20.21-25.12-20.83-11.84-.58-24.06,7.59-27.24,18.2C96,99.52,105.47,98.18,116.31,107.5c8.61,7.42,10.58,20.57,4.58,31.79L52.48,106.17c7-30.21,38.26-53.41,69.41-42,12.16,4.46,20.8,13,27,24.22C172.1,130.18,153.32,182,108,201.3Z"/>
          <path class="t3" d="M204.87,98.34c-2.59-1.21-4.61-2-6.47-3Q174.67,81.75,151,68.11c-12.81-7.35-26-13.67-40.87-15.63-15.45-2-29.14,2-41,12C55.51,76,47.36,90.91,42.35,107.81c-.92,3.11.91,3.83,2.95,4.83q35,17.25,69.93,34.54c.88.43,1.71,1,2.86,1.63-15.36,16.58-33.89,24-56,21.17C24.65,165.19,3,133.69,11,95.18,22,42.69,77.31-4.22,148.52,25.94c23.53,10,40.82,27.43,51.64,50.89A49.07,49.07,0,0,1,204.87,98.34Z"/>
          <path class="t3" d="M301.47,61.2a73.68,73.68,0,0,1,20,2.41Q330,66,334.68,70.33a13.54,13.54,0,0,1,4.71,10.34A13,13,0,0,1,337,88.19a8,8,0,0,1-7,3.51,13.64,13.64,0,0,1-5.32-.9,13.83,13.83,0,0,1-3.71-2.31,21.36,21.36,0,0,0-3.81-2.61A18.49,18.49,0,0,0,311,84a40.46,40.46,0,0,0-6.12-.71q-10.23,0-17.36,4.42a29.38,29.38,0,0,0-10.94,11.94A37.88,37.88,0,0,0,272.77,117a36.74,36.74,0,0,0,3.91,17.16,30.57,30.57,0,0,0,10.84,11.94,29.06,29.06,0,0,0,16,4.42,53.38,53.38,0,0,0,8.63-.61,21.37,21.37,0,0,0,6-1.8,37.6,37.6,0,0,0,5-3.41q2.21-1.81,6.62-1.81c3.48,0,6.15,1.1,8,3.31a12.16,12.16,0,0,1,2.81,8.13q0,5-5.62,9.13a45.23,45.23,0,0,1-14.75,6.62,74.53,74.53,0,0,1-19.77,2.51q-15.85,0-27.49-7.33a48.94,48.94,0,0,1-18-20,62.45,62.45,0,0,1-6.32-28.3q0-16.44,6.72-29a49.88,49.88,0,0,1,18.67-19.67Q286,61.21,301.47,61.2Z"/>
          <path class="t3" d="M462.19,117q0,16.47-7.32,29a52.57,52.57,0,0,1-19.66,19.56,57.67,57.67,0,0,1-55.19,0A52.57,52.57,0,0,1,360.36,146Q353,133.44,353,117t7.33-29A53.38,53.38,0,0,1,380,68.32a57,57,0,0,1,55.19,0A53.38,53.38,0,0,1,454.87,88Q462.19,100.53,462.19,117Zm-24.07,0A36.45,36.45,0,0,0,434,99.23a30.61,30.61,0,0,0-11-11.74,30,30,0,0,0-30.71,0,30.61,30.61,0,0,0-11,11.74A36.34,36.34,0,0,0,377.11,117a35.91,35.91,0,0,0,4.12,17.56,30.61,30.61,0,0,0,11,11.74,30,30,0,0,0,30.71,0,30.61,30.61,0,0,0,11-11.74A36,36,0,0,0,438.12,117Z"/>
          <path class="t3" d="M538.85,61.2A45.79,45.79,0,0,1,564,68.32a50.66,50.66,0,0,1,17.66,19.57q6.51,12.44,6.52,28.89t-6.52,29a50.92,50.92,0,0,1-17.46,19.66,44,44,0,0,1-24.58,7.13,42.85,42.85,0,0,1-15-2.61,48,48,0,0,1-12.34-6.62,38,38,0,0,1-8.23-8.13q-2.91-4.11-2.91-6.92l6.22-2.61v52.77a12,12,0,0,1-3.41,8.73,11.52,11.52,0,0,1-8.63,3.51,11.68,11.68,0,0,1-8.63-3.41,11.94,11.94,0,0,1-3.41-8.83v-123a12,12,0,0,1,3.41-8.73,12.36,12.36,0,0,1,17.26,0,12,12,0,0,1,3.41,8.73v9.83l-3.41-1.81q0-2.59,2.81-6.32a40.72,40.72,0,0,1,7.63-7.42,43.13,43.13,0,0,1,11.13-6.12A37.09,37.09,0,0,1,538.85,61.2Zm-3,22.07a27.21,27.21,0,0,0-15.45,4.42,29.93,29.93,0,0,0-10.34,11.94,38.16,38.16,0,0,0-3.71,17.15,39,39,0,0,0,3.71,17.16,29.66,29.66,0,0,0,10.34,12.14,27.21,27.21,0,0,0,15.45,4.42,26.77,26.77,0,0,0,15.35-4.42,30,30,0,0,0,10.23-12.14,39,39,0,0,0,3.71-17.16,38.16,38.16,0,0,0-3.71-17.15,30.3,30.3,0,0,0-10.23-11.94A26.77,26.77,0,0,0,535.84,83.27Z"/>
          <path class="t3" d="M688.94,63.21a11.53,11.53,0,0,1,8.63,3.51A12,12,0,0,1,701,75.45v85.28q0,18.47-6.92,29.4a39.42,39.42,0,0,1-18.56,15.75,67.68,67.68,0,0,1-26.09,4.81,99.32,99.32,0,0,1-13.65-1,45.86,45.86,0,0,1-11.83-3q-6-2.61-8.33-6.52a9.86,9.86,0,0,1-.91-8.33q1.81-5.82,5.82-7.92a10,10,0,0,1,8.43-.51q3.21,1,8.43,3.11a31.87,31.87,0,0,0,12,2.11q9.23,0,15.35-2.51a17.71,17.71,0,0,0,9.23-8.43q3.1-5.91,3.11-16.15V148.09l4.21,4.81a35,35,0,0,1-8.52,10.94,34.67,34.67,0,0,1-12.14,6.52,53.66,53.66,0,0,1-16.06,2.21A34.46,34.46,0,0,1,626,167.65,33.37,33.37,0,0,1,613.69,154a43.7,43.7,0,0,1-4.41-20V75.45a12,12,0,0,1,3.41-8.73,12.35,12.35,0,0,1,17.25,0,12,12,0,0,1,3.42,8.73v51.37q0,13,5.72,18.36T655,150.5a23.91,23.91,0,0,0,11.84-2.71,18,18,0,0,0,7.42-8,29.15,29.15,0,0,0,2.61-12.94V75.45a12,12,0,0,1,3.41-8.73A11.52,11.52,0,0,1,688.94,63.21Z"/>
          <path class="t3" d="M783.45,61.2q16,0,23.68,7.73t10,20l-3.41-1.8,1.61-3.21a45.94,45.94,0,0,1,7.42-9.94,45.39,45.39,0,0,1,12.14-9,34,34,0,0,1,16-3.71q14.45,0,22,6.22A31.62,31.62,0,0,1,883.18,84,87.6,87.6,0,0,1,886,107v51.37a12,12,0,0,1-3.41,8.73,12.36,12.36,0,0,1-17.26,0,12,12,0,0,1-3.41-8.73V107A41.31,41.31,0,0,0,860.3,95a16.38,16.38,0,0,0-5.82-8.53c-2.8-2.13-6.82-3.21-12-3.21a25.24,25.24,0,0,0-13,3.21A20.82,20.82,0,0,0,821.27,95a26,26,0,0,0-2.7,11.94v51.37a12,12,0,0,1-3.42,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.41-8.73V107A41.31,41.31,0,0,0,792.88,95a16.38,16.38,0,0,0-5.82-8.53c-2.81-2.13-6.82-3.21-12-3.21a25.24,25.24,0,0,0-13,3.21A20.82,20.82,0,0,0,753.85,95,26,26,0,0,0,751.14,107v51.37a12,12,0,0,1-3.41,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.42-8.73V75.45a12,12,0,0,1,3.42-8.73,12.35,12.35,0,0,1,17.25,0,12,12,0,0,1,3.41,8.73v8.63l-3-.61a45.59,45.59,0,0,1,5-7.32A43.14,43.14,0,0,1,761,68.83a41.25,41.25,0,0,1,10.23-5.52A34.47,34.47,0,0,1,783.45,61.2Z"/>
          <path class="t3" d="M1000,61.2a11.7,11.7,0,0,1,8.62,3.41,11.94,11.94,0,0,1,3.41,8.83v84.88a12,12,0,0,1-3.41,8.73,12.35,12.35,0,0,1-17.25,0,12,12,0,0,1-3.41-8.73v-9.83l4.41,1.8c0,1.75-.94,3.85-2.81,6.33a38.32,38.32,0,0,1-7.62,7.32,46.94,46.94,0,0,1-11.34,6.12,39.17,39.17,0,0,1-14.15,2.51,45.86,45.86,0,0,1-25.08-7.13,50.07,50.07,0,0,1-17.76-19.66q-6.52-12.54-6.52-28.8,0-16.44,6.52-29a50.7,50.7,0,0,1,17.56-19.67,44.23,44.23,0,0,1,24.48-7.12,46.36,46.36,0,0,1,15.85,2.61A47.4,47.4,0,0,1,984,70.43a38,38,0,0,1,8.23,8.13q2.91,4.11,2.91,6.92l-7.22,2.61V73.44a12,12,0,0,1,3.41-8.73A11.5,11.5,0,0,1,1000,61.2Zm-40.54,89.3a27.21,27.21,0,0,0,15.45-4.42,29.76,29.76,0,0,0,10.34-12A38.51,38.51,0,0,0,988.93,117a39,39,0,0,0-3.71-17.25,29.82,29.82,0,0,0-10.34-12,27.21,27.21,0,0,0-15.45-4.42,26.9,26.9,0,0,0-15.25,4.42,29.8,29.8,0,0,0-10.33,12A38.81,38.81,0,0,0,930.13,117,38.38,38.38,0,0,0,933.85,134a29.74,29.74,0,0,0,10.33,12A26.9,26.9,0,0,0,959.43,150.5Z"/>
          <path class="t3" d="M1040.3,63.21a12.18,12.18,0,0,1,9.83,5l67,83.28a11.16,11.16,0,0,1,2.61,7.22,11.48,11.48,0,0,1-3.81,8.63,12,12,0,0,1-8.43,3.61q-5.82,0-9.83-5.21l-67-83.28a11.63,11.63,0,0,1,1.11-15.85A12.21,12.21,0,0,1,1040.3,63.21Zm.2,107.55a12.65,12.65,0,0,1-7.93-3.11,9.31,9.31,0,0,1-3.91-7.52,11.74,11.74,0,0,1,3-7.63l30.7-37.52,12,20.06-24.28,30.71A11.63,11.63,0,0,1,1040.5,170.76Zm66.82-107.55a11,11,0,0,1,8.12,3.31,10.36,10.36,0,0,1,3.32,7.52,13.67,13.67,0,0,1-.61,4,10.11,10.11,0,0,1-2.2,3.81l-30.3,36.92L1073,101.33l24.69-32.71Q1101.69,63.21,1107.32,63.21Z"/>
        </g>
      </svg>
    </div>
    <div class="sub">J del Campo #7 Esq. Urdiñola</div>
    <div class="sub">Col. Nueva Vizcaya, Durango, Dgo.</div>
    <div class="sub">WhatsApp: 618 300 6203</div>
    <hr/>
    <div class="folio">${ultimoFolio}</div>
    <div class="fecha">${fecha}</div>
    ${cNombre !== 'Público General' ? `<div class="pago-row"><span>Cliente</span><span>${cNombre}</span></div>
    <div class="pago-row" style="font-size:11px;color:#555"><span>RFC</span><span>${cRfc}</span></div>
    <hr/>` : ''}
    ${ticketItems.map(i => `
      <div class="item">
        <div class="item-desc">${i.descripcion}</div>
        <div class="item-price">$${i.subtotal.toFixed(2)}</div>
      </div>
    `).join('')}
    <hr/>
    <div class="total-row"><span>TOTAL</span><span>$${ticketTotal.toFixed(2)}</span></div>
    <div class="pago-row"><span>Pago</span><span>${metodoLabel[metodo_pago] ?? metodo_pago}</span></div>
    ${metodo_pago === 'efectivo' ? `
    <div class="pago-row"><span>Recibido</span><span>${pagaConStr}</span></div>
    <div class="pago-row"><span>Cambio</span><span>${cambioStr}</span></div>` : ''}
    <hr/>
    <div class="footer">¡Gracias por tu preferencia!</div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) { win.document.write(html); win.document.close(); }
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
    <>
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

            {bynPreview === 'sin_precio' && (
              <div className="rounded-lg px-3 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                Sin precio configurado para este tipo. Revisa Admin → Precios.
              </div>
            )}
            {bynPreview !== null && bynPreview !== 'sin_precio' && (
              <div className={previewBox}>Precio: ${bynPreview.toFixed(2)}</div>
            )}

            <button
              type="button"
              onClick={handleAgregarByn}
              disabled={!bynHojas || parseInt(bynHojas) <= 0 || bynPreview === 'sin_precio' || !preciosLoaded}
              className={btnPrimary}
            >
              {!preciosLoaded ? 'Cargando precios...' : 'Agregar al ticket'}
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
                {(colorTipo === 'color_carta' ? papelesCarta : papelesTabloide).map((p) => (
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

          {/* Cliente */}
          <div className="mb-3 border border-gray-100 rounded-lg bg-gray-50 overflow-hidden">
            {/* Modo cerrado — muestra cliente actual */}
            {modoSelector === 'cerrado' && (
              <button type="button" onClick={() => setModoSelector(clientesGuardados.length ? 'lista' : 'manual')}
                className="w-full text-left px-3 py-2 group">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cliente</p>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-marca-azul transition-colors">{clienteNombre}</p>
                <p className="text-xs font-mono text-gray-400">{clienteRfc}</p>
              </button>
            )}

            {/* Modo lista — seleccionar cliente guardado */}
            {modoSelector === 'lista' && (
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-marca-azul"
                />
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {/* Público general siempre primero */}
                  <button type="button"
                    onClick={() => { setClienteNombre('Público General'); setClienteRfc('XAXX010101000'); setModoSelector('cerrado'); setBusqueda(''); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      clienteNombre === 'Público General' ? 'bg-marca-azul text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}>
                    <span className="font-medium">Público General</span>
                    <span className={`ml-2 text-xs font-mono ${clienteNombre === 'Público General' ? 'text-white/70' : 'text-gray-400'}`}>XAXX010101000</span>
                  </button>
                  {clientesGuardados
                    .filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                    .map((c) => (
                      <button key={c.id} type="button"
                        onClick={() => { setClienteNombre(c.nombre); setClienteRfc(c.rfc); setModoSelector('cerrado'); setBusqueda(''); }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          clienteNombre === c.nombre ? 'bg-marca-azul text-white' : 'hover:bg-gray-100 text-gray-700'
                        }`}>
                        <span className="font-medium">{c.nombre}</span>
                        <span className={`ml-2 text-xs font-mono ${clienteNombre === c.nombre ? 'text-white/70' : 'text-gray-400'}`}>{c.rfc}</span>
                      </button>
                    ))
                  }
                </div>
                <div className="flex gap-2 pt-1 border-t border-gray-200">
                  <button type="button" onClick={() => setModoSelector('manual')}
                    className="flex-1 text-xs text-marca-azul font-medium py-1 hover:underline">
                    Ingresar manualmente
                  </button>
                  <button type="button" onClick={() => { setModoSelector('cerrado'); setBusqueda(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 py-1 px-2">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Modo manual — entrada libre */}
            {modoSelector === 'manual' && (
              <div className="p-2 space-y-1.5">
                <input
                  type="text"
                  autoFocus
                  value={clienteNombre === 'Público General' ? '' : clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value || 'Público General')}
                  placeholder="Nombre del cliente"
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-marca-azul"
                />
                <input
                  type="text"
                  value={clienteRfc === 'XAXX010101000' ? '' : clienteRfc}
                  onChange={(e) => setClienteRfc(e.target.value.toUpperCase() || 'XAXX010101000')}
                  placeholder="RFC (opcional)"
                  maxLength={13}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-marca-azul"
                />
                <div className="flex gap-2 pt-1 border-t border-gray-200">
                  <button type="button" onClick={() => setModoSelector('cerrado')}
                    className="flex-1 text-xs text-white bg-marca-azul rounded-md py-1.5 font-medium">
                    Listo
                  </button>
                  {clientesGuardados.length > 0 && (
                    <button type="button" onClick={() => setModoSelector('lista')}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2">
                      ← Lista
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Folio del último cobro */}
          {ultimoFolio && (
            <div className="mb-3 bg-[#FFF8EC] border border-marca-naranja rounded-lg px-3 py-2 text-sm text-[#7a4f00]">
              <div className="flex items-center justify-between mb-1.5">
                <span>Venta registrada: <strong>{ultimoFolio}</strong></span>
                <button
                  type="button"
                  onClick={() => { setUltimoFolio(null); setUltimoTicket(null); }}
                  className="underline text-xs opacity-70 hover:opacity-100"
                >
                  cerrar
                </button>
              </div>
              <button
                type="button"
                onClick={handleImprimir}
                className="w-full bg-marca-azul hover:opacity-90 text-white font-semibold rounded-md px-3 py-1.5 text-xs transition-opacity"
              >
                🖨 Imprimir ticket
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
                      {!item.papel_especial && (
                        <p className="text-gray-400 text-xs">
                          ${item.precio_unit.toFixed(2)} × {item.cantidad}
                        </p>
                      )}
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
              onClick={abrirModalCobro}
              disabled={!items.length || !metodoPago}
              className="w-full bg-marca-naranja hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-lg px-4 py-3 text-sm transition-opacity"
            >
              Cobrar ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal de cobro */}

    {modalCobro && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={(e) => { if (e.target === e.currentTarget) setModalCobro(false); }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
          {/* Total */}
          <div className="text-center mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Total a cobrar</p>
            <p className="text-5xl font-bold text-gray-900">${total.toFixed(2)}</p>
          </div>

          {/* Solo mostrar campo de efectivo si el método es efectivo */}
          {metodoPago === 'efectivo' ? (
            <>
              <div className="mb-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  ¿Con cuánto paga?
                </label>
                <input
                  type="number"
                  min={total}
                  step="0.50"
                  autoFocus
                  value={pagaCon}
                  onChange={(e) => setPagaCon(e.target.value)}
                  placeholder={`mín. $${total.toFixed(2)}`}
                  className="w-full border-2 border-gray-200 focus:border-marca-azul rounded-xl px-4 py-3 text-2xl font-bold text-center outline-none transition-colors"
                />
              </div>

              {/* Sugerencias rápidas */}
              <div className="flex gap-2 mb-4">
                {[50, 100, 200, 500].filter(v => v >= total).slice(0, 4).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPagaCon(String(v))}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-marca-azul hover:text-marca-azul transition-colors"
                  >
                    ${v}
                  </button>
                ))}
              </div>

              {/* Cambio */}
              <div className={`rounded-xl px-4 py-3 mb-5 text-center transition-colors ${
                cambio >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-0.5">Cambio</p>
                <p className={`text-3xl font-bold ${cambio >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {cambio >= 0 ? `$${cambio.toFixed(2)}` : 'Monto insuficiente'}
                </p>
              </div>
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-sm font-semibold text-blue-700">
                Pago con transferencia — sin cambio
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalCobro(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarCobro}
              disabled={loading || (metodoPago === 'efectivo' && (pagaConNum < total || !pagaCon))}
              className="flex-2 grow py-2.5 rounded-xl bg-marca-naranja disabled:opacity-40 text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {loading ? 'Guardando...' : 'Confirmar venta'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
