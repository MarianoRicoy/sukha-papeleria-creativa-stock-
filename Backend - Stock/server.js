require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const pinFilePath = path.join(__dirname, 'app_pin.json');

function isValidPin(pin) {
  return /^\d{4,6}$/.test(String(pin || '').trim());
}

function loadPersistedPin() {
  try {
    if (!fs.existsSync(pinFilePath)) return null;
    const raw = fs.readFileSync(pinFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    const value = String(parsed?.pin || '').trim();
    if (!isValidPin(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function savePersistedPin(pin) {
  const value = String(pin || '').trim();
  const tmp = `${pinFilePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ pin: value }), 'utf8');
  fs.renameSync(tmp, pinFilePath);
}

let currentPin = loadPersistedPin() || String(process.env.APP_PIN || '').trim();

app.get('/auth/pin-check', (req, res) => {
  const expected = String(currentPin || '').trim();
  if (!expected) return sendError(res, 500, 'APP_PIN no configurado');

  const provided = String(req.header('x-app-pin') || '').trim();
  if (!provided || provided !== expected) {
    return sendError(res, 401, 'PIN inválido');
  }

  return res.status(204).send();
});

function requirePin(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return next();

    const expected = String(currentPin || '').trim();
    if (!expected) return sendError(res, 500, 'APP_PIN no configurado');

    const provided = String(req.header('x-app-pin') || '').trim();
    if (!provided || provided !== expected) {
      return sendError(res, 401, 'No autorizado');
    }

    return next();
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
}

app.use('/api', requirePin);

app.get('/api/auth/pin-check', (req, res) => {
  return res.status(204).send();
});

app.patch('/api/config/pin', async (req, res) => {
  try {
    const { nuevo_pin } = req.body || {};
    const value = String(nuevo_pin || '').trim();

    if (!isValidPin(value)) {
      return sendError(res, 400, 'PIN inválido (4 a 6 dígitos)');
    }

    currentPin = value;
    savePersistedPin(value);
    return res.status(204).send();
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

function guessImageExtension(contentType) {
  const ct = String(contentType || '').toLowerCase().split(';')[0].trim();
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return '';
}

function extractStorageObjectPathFromPublicUrl(publicUrl, bucket) {
  try {
    const u = new URL(String(publicUrl || ''));
    const marker = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + marker.length);
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

app.put(
  '/api/productos/:codigo/imagen',
  express.raw({ type: ['image/*', 'application/octet-stream'], limit: '8mb' }),
  async (req, res) => {
    try {
      const { codigo } = req.params;
      if (!codigo || typeof codigo !== 'string') {
        return sendError(res, 400, 'Código inválido');
      }

      const { data: prod, error: getErr } = await supabase
        .from('Productos')
        .select('codigo, imagen_url')
        .eq('codigo', codigo)
        .maybeSingle();

      if (getErr) return sendSupabaseError(res, getErr);
      if (!prod) return sendError(res, 404, 'Producto no encontrado');

      const buf = req.body;
      if (!buf || !(buf instanceof Buffer) || buf.length === 0) {
        return sendError(res, 400, 'Archivo vacío');
      }

      const ext = guessImageExtension(req.header('content-type'));
      if (!ext) {
        return sendError(res, 400, 'Formato no soportado (usar JPG/PNG/WEBP/GIF)');
      }

      const objectPath = `productos/${encodeURIComponent(codigo)}/${Date.now()}.${ext}`;

      const uploadRes = await supabase.storage
        .from(supabaseProductImagesBucket)
        .upload(objectPath, buf, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadRes.error) return sendSupabaseError(res, uploadRes.error);

      const publicUrlRes = supabase.storage.from(supabaseProductImagesBucket).getPublicUrl(objectPath);
      const publicUrl = publicUrlRes?.data?.publicUrl || '';
      if (!publicUrl) return sendError(res, 500, 'No se pudo obtener la URL pública');

      const { data, error } = await supabase
        .from('Productos')
        .update({ imagen_url: publicUrl })
        .eq('codigo', codigo)
        .select('codigo, imagen_url')
        .maybeSingle();

      if (error) return sendSupabaseError(res, error);
      if (!data) return sendError(res, 404, 'Producto no encontrado');

      const previousPath = extractStorageObjectPathFromPublicUrl(prod?.imagen_url, supabaseProductImagesBucket);
      if (previousPath) {
        await supabase.storage.from(supabaseProductImagesBucket).remove([previousPath]);
      }

      return res.json(data);
    } catch (e) {
      return sendError(res, 500, e.message || 'Error inesperado');
    }
  }
);

app.delete('/api/productos/:codigo/imagen', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'Código inválido');
    }

    const { data: prod, error: getErr } = await supabase
      .from('Productos')
      .select('codigo, imagen_url')
      .eq('codigo', codigo)
      .maybeSingle();

    if (getErr) return sendSupabaseError(res, getErr);
    if (!prod) return sendError(res, 404, 'Producto no encontrado');

    const { error: updErr } = await supabase.from('Productos').update({ imagen_url: null }).eq('codigo', codigo);
    if (updErr) return sendSupabaseError(res, updErr);

    const objectPath = extractStorageObjectPathFromPublicUrl(prod?.imagen_url, supabaseProductImagesBucket);
    if (objectPath) {
      await supabase.storage.from(supabaseProductImagesBucket).remove([objectPath]);
    }

    return res.status(204).send();
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function mapSupabaseErrorToStatus(error) {
  const code = error?.code;

  if (code === '23505') return 409;
  if (code === '23503') return 409;
  if (code === '22P02') return 400;
  if (code === 'PGRST116') return 404;

  return 500;
}

function sendSupabaseError(res, error, fallbackStatus = 500) {
  const status = error?.code ? mapSupabaseErrorToStatus(error) : fallbackStatus;
  const message = error?.message || 'Error inesperado';
  return sendError(res, status, message);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseProductImagesBucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno. Configurá SUPABASE_URL y SUPABASE_KEY en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('Servidor de control de stock funcionando correctamente');
});

app.get('/api/productos', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : null;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 50;

    let query = supabase
      .from('Productos')
      .select('codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url')
      .order('codigo', { ascending: true })
      .limit(limit);

    if (q) {
      const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`codigo.ilike.%${escaped}%,descripcion.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) return sendSupabaseError(res, error);
    return res.json({ items: data || [] });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[\n\r",]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

app.get('/api/productos/export.csv', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    let query = supabase
      .from('Productos')
      .select('codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url')
      .order('codigo', { ascending: true });

    if (q) {
      const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`codigo.ilike.%${escaped}%,descripcion.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) return sendSupabaseError(res, error);

    const rows = Array.isArray(data) ? data : [];
    const sep = ';';
    const header = ['Código', 'Descripción', 'Precio venta', 'Costo', 'Stock actual', 'Stock mínimo', 'Imagen'];

    const lines = [];
    lines.push(header.join(sep));
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.codigo),
          csvEscape(r.descripcion),
          csvEscape(r.precio_venta),
          csvEscape(r.costo),
          csvEscape(r.stock_actual),
          csvEscape(r.stock_minimo),
          csvEscape(r.imagen_url),
        ].join(sep)
      );
    }

    const bom = '\ufeff';
    const csv = `${bom}${lines.join('\n')}\n`;
    const fileName = `productos_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.get('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const { data, error } = await supabase
      .from('Productos')
      .select('codigo, descripcion, precio_venta, stock_actual, stock_minimo, imagen_url')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) return sendSupabaseError(res, error);
    if (!data) return sendError(res, 404, 'Producto no encontrado');

    return res.json(data);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const {
      codigo,
      id_categoria,
      descripcion,
      precio_venta,
      costo,
      stock_actual,
      stock_minimo,
      imagen_url,
    } = req.body || {};

    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'El campo codigo es obligatorio');
    }

    const payload = {
      codigo,
      id_categoria: id_categoria ?? null,
      descripcion: descripcion ?? null,
      precio_venta: precio_venta ?? null,
      costo: costo ?? null,
      stock_actual: stock_actual ?? 0,
      stock_minimo: stock_minimo ?? null,
      imagen_url: imagen_url ?? null,
    };

    if (payload.stock_minimo !== null && payload.stock_minimo !== undefined) {
      const smin = Number(payload.stock_minimo);
      if (!Number.isFinite(smin) || smin < 0) {
        return sendError(res, 400, 'stock_minimo debe ser un número >= 0');
      }
      payload.stock_minimo = Math.trunc(smin);
    }

    const { data, error } = await supabase
      .from('Productos')
      .insert(payload)
      .select('codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url')
      .single();

    if (error) return sendSupabaseError(res, error);
    return res.status(201).json(data);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.patch('/api/productos/:codigo/stock', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { nuevo_stock } = req.body || {};

    if (nuevo_stock === undefined || nuevo_stock === null) {
      return sendError(res, 400, 'nuevo_stock es obligatorio');
    }

    const s = Number(nuevo_stock);
    if (!Number.isFinite(s) || s < 0) {
      return sendError(res, 400, 'nuevo_stock debe ser un número >= 0');
    }

    const { data, error } = await supabase
      .from('Productos')
      .update({ stock_actual: Math.trunc(s) })
      .eq('codigo', codigo)
      .select('codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url')
      .maybeSingle();

    if (error) return sendSupabaseError(res, error);
    if (!data) return sendError(res, 404, 'Producto no encontrado');

    return res.json(data);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.put('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'El parámetro codigo es obligatorio');
    }

    const {
      descripcion,
      precio_venta,
      costo,
      stock_minimo,
    } = req.body || {};

    const update = {};

    if (descripcion !== undefined) update.descripcion = String(descripcion || '').trim() || null;
    
    if (precio_venta !== undefined) {
      const p = Number(precio_venta);
      update.precio_venta = Number.isFinite(p) ? p : null;
    }
    
    if (costo !== undefined) {
      const c = Number(costo);
      update.costo = Number.isFinite(c) ? c : null;
    }

    if (stock_minimo !== undefined) {
      if (stock_minimo === null || stock_minimo === '') {
        update.stock_minimo = null;
      } else {
        const smin = Number(stock_minimo);
        if (!Number.isFinite(smin) || smin < 0) {
          return sendError(res, 400, 'stock_minimo debe ser un número >= 0');
        }
        update.stock_minimo = Math.trunc(smin);
      }
    }

    if (Object.keys(update).length === 0) {
      return sendError(res, 400, 'No hay campos válidos para actualizar');
    }

    const { data, error } = await supabase
      .from('Productos')
      .update(update)
      .eq('codigo', codigo)
      .select('codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url')
      .maybeSingle();

    if (error) return sendSupabaseError(res, error);
    if (!data) return sendError(res, 404, 'Producto no encontrado');

    return res.json(data);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.delete('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'El parámetro codigo es obligatorio');
    }

    const { data: existe, error: existeError } = await supabase
      .from('Productos')
      .select('codigo')
      .eq('codigo', codigo)
      .maybeSingle();

    if (existeError) return sendSupabaseError(res, existeError);
    if (!existe) return sendError(res, 404, 'Producto no encontrado');

    const { data: ingreso, error: ingresoError } = await supabase
      .from('Ingresos_Stock')
      .select('id_ingreso')
      .eq('codigo_producto', codigo)
      .limit(1);

    if (ingresoError) return sendSupabaseError(res, ingresoError);
    if ((ingreso || []).length > 0) {
      return sendError(res, 409, 'No se puede borrar: el producto tiene ingresos de stock');
    }

    const { data: detalle, error: detalleError } = await supabase
      .from('Detalle_Ventas')
      .select('id_detalle')
      .eq('codigo_producto', codigo)
      .limit(1);

    if (detalleError) return sendSupabaseError(res, detalleError);
    if ((detalle || []).length > 0) {
      return sendError(res, 409, 'No se puede borrar: el producto tiene ventas registradas');
    }

    const { error: deleteError } = await supabase
      .from('Productos')
      .delete()
      .eq('codigo', codigo);

    if (deleteError) return sendSupabaseError(res, deleteError);
    return res.status(204).send();
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.post('/api/ingresos-stock', async (req, res) => {
  try {
    const { codigo_producto, cantidad_ingresada, costo_unitario } = req.body || {};

    if (!codigo_producto || typeof codigo_producto !== 'string') {
      return sendError(res, 400, 'codigo_producto es obligatorio');
    }

    const cantidad = Number(cantidad_ingresada);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return sendError(res, 400, 'cantidad_ingresada debe ser un número > 0');
    }

    const costo = costo_unitario == null || costo_unitario === '' ? 0 : Number(costo_unitario);
    if (!Number.isFinite(costo) || costo < 0) {
      return sendError(res, 400, 'costo_unitario debe ser un número >= 0');
    }

    const { data: producto, error: productoError } = await supabase
      .from('Productos')
      .select('codigo, stock_actual')
      .eq('codigo', codigo_producto)
      .maybeSingle();

    if (productoError) return sendSupabaseError(res, productoError);
    if (!producto) return sendError(res, 404, 'Producto no encontrado');

    const currentStock = Number(producto.stock_actual) || 0;
    const newStock = currentStock + Math.trunc(cantidad);

    const { data: ingreso, error: ingresoError } = await supabase
      .from('Ingresos_Stock')
      .insert({
        codigo_producto,
        cantidad_ingresada: Math.trunc(cantidad),
        costo_unitario: costo,
      })
      .select('*')
      .single();

    if (ingresoError) return sendSupabaseError(res, ingresoError);

    const { data: updatedProducto, error: updateError } = await supabase
      .from('Productos')
      .update({ stock_actual: newStock })
      .eq('codigo', codigo_producto)
      .select('*')
      .maybeSingle();

    if (updateError) return sendSupabaseError(res, updateError);
    if (!updatedProducto) return sendError(res, 404, 'Producto no encontrado');

    return res.status(201).json({ ingreso, producto: updatedProducto });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

function parseMesAnio({ mes, anio }) {
  const m = Number(mes);
  const a = Number(anio);

  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(a) || a < 2000 || a > 2100) return null;

  const start = new Date(Date.UTC(a, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(a, m, 1, 0, 0, 0));

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

app.post('/api/ventas', async (req, res) => {
  try {
    const { items, fecha } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'items es obligatorio y debe tener al menos 1 ítem');
    }

    for (const item of items) {
      if (!item?.codigo_producto) {
        return sendError(res, 400, 'Cada item debe tener codigo_producto');
      }
      if (!Number.isFinite(Number(item?.cantidad)) || Number(item.cantidad) <= 0) {
        return sendError(res, 400, 'Cada item debe tener cantidad > 0');
      }
    }

    const ventaFecha = fecha ? new Date(fecha) : new Date();
    if (Number.isNaN(ventaFecha.getTime())) {
      return sendError(res, 400, 'fecha inválida');
    }

    const codigos = items.map((i) => i.codigo_producto);
    const { data: productos, error: productosError } = await supabase
      .from('Productos')
      .select('codigo, precio_venta, costo, stock_actual')
      .in('codigo', codigos);

    if (productosError) return sendSupabaseError(res, productosError);

    const productosByCodigo = new Map((productos || []).map((p) => [p.codigo, p]));

    for (const item of items) {
      const p = productosByCodigo.get(item.codigo_producto);
      if (!p) {
        return sendError(res, 404, `Producto inexistente: ${item.codigo_producto}`);
      }
      if (p.stock_actual != null && Number(p.stock_actual) < Number(item.cantidad)) {
        return sendError(res, 409, `Stock insuficiente para ${item.codigo_producto}`);
      }
    }

    const detallePayload = items.map((item) => {
      const p = productosByCodigo.get(item.codigo_producto);
      return {
        codigo_producto: item.codigo_producto,
        cantidad: Number(item.cantidad),
        precio_historico: item.precio_historico ?? p.precio_venta ?? null,
        costo_historico: item.costo_historico ?? p.costo ?? null,
      };
    });

    const totalFacturado = detallePayload.reduce((acc, d) => {
      const precio = d.precio_historico == null ? 0 : Number(d.precio_historico);
      return acc + Number(d.cantidad) * precio;
    }, 0);

    const { data: venta, error: ventaError } = await supabase
      .from('Ventas')
      .insert({
        fecha: ventaFecha.toISOString(),
        total_facturado: totalFacturado,
      })
      .select('*')
      .single();

    if (ventaError) return sendSupabaseError(res, ventaError);

    const detalleConVenta = detallePayload.map((d) => ({
      ...d,
      id_venta: venta.id_venta,
    }));

    const { data: detalle, error: detalleError } = await supabase
      .from('Detalle_Ventas')
      .insert(detalleConVenta)
      .select('*');

    if (detalleError) return sendSupabaseError(res, detalleError);

    for (const item of items) {
      const p = productosByCodigo.get(item.codigo_producto);
      const newStock = (Number(p.stock_actual) || 0) - Number(item.cantidad);

      const { error: updateError } = await supabase
        .from('Productos')
        .update({ stock_actual: newStock })
        .eq('codigo', item.codigo_producto);

      if (updateError) return sendSupabaseError(res, updateError);
    }

    return res.status(201).json({ venta, detalle });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.get('/api/reportes/unidades', async (req, res) => {
  try {
    const parsed = parseMesAnio({ mes: req.query.mes, anio: req.query.anio });
    if (!parsed) return sendError(res, 400, 'Parámetros requeridos: mes (1-12) y anio (YYYY)');

    const { startISO, endISO } = parsed;

    const { data, error } = await supabase
      .from('Detalle_Ventas')
      .select('codigo_producto, cantidad, Ventas!inner(fecha)')
      .gte('Ventas.fecha', startISO)
      .lt('Ventas.fecha', endISO);

    if (error) return sendSupabaseError(res, error);

    const agrupado = new Map();
    for (const row of data || []) {
      const codigo = row.codigo_producto;
      const cant = Number(row.cantidad) || 0;
      agrupado.set(codigo, (agrupado.get(codigo) || 0) + cant);
    }

    const result = Array.from(agrupado.entries()).map(([codigo_producto, unidades]) => ({
      codigo_producto,
      unidades,
    }));

    return res.json({ desde: startISO, hasta: endISO, items: result });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.get('/api/reportes/financiero', async (req, res) => {
  try {
    const parsed = parseMesAnio({ mes: req.query.mes, anio: req.query.anio });
    if (!parsed) return sendError(res, 400, 'Parámetros requeridos: mes (1-12) y anio (YYYY)');

    const { startISO, endISO } = parsed;

    const { data, error } = await supabase
      .from('Detalle_Ventas')
      .select('cantidad, precio_historico, costo_historico, Ventas!inner(fecha)')
      .gte('Ventas.fecha', startISO)
      .lt('Ventas.fecha', endISO);

    if (error) return sendSupabaseError(res, error);

    const totals = (data || []).reduce(
      (acc, row) => {
        const cantidad = Number(row.cantidad) || 0;
        const precio = row.precio_historico == null ? 0 : Number(row.precio_historico);
        const costo = row.costo_historico == null ? 0 : Number(row.costo_historico);

        acc.totalFacturado += cantidad * precio;
        acc.totalCosto += cantidad * costo;
        return acc;
      },
      { totalFacturado: 0, totalCosto: 0 }
    );

    const utilidad = totals.totalFacturado - totals.totalCosto;

    return res.json({
      desde: startISO,
      hasta: endISO,
      total_facturado: totals.totalFacturado,
      total_costo: totals.totalCosto,
      utilidad,
    });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
