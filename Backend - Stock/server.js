require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------------------------------------------ */
/*  Cloudinary                                                         */
/* ------------------------------------------------------------------ */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ------------------------------------------------------------------ */
/*  PIN authentication                                                 */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function mapPgErrorToStatus(error) {
  const code = error?.code;
  if (code === '23505') return 409;
  if (code === '23503') return 409;
  if (code === '22P02') return 400;
  return 500;
}

function sendDbError(res, error) {
  const status = error?.code ? mapPgErrorToStatus(error) : 500;
  const message = error?.message || 'Error inesperado';
  return sendError(res, status, message);
}

function guessImageExtension(contentType) {
  const ct = String(contentType || '').toLowerCase().split(';')[0].trim();
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return '';
}

/* ------------------------------------------------------------------ */
/*  Conexión a Neon Postgres (pooler)                                  */
/* ------------------------------------------------------------------ */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Falta la variable de entorno DATABASE_URL en el archivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: true,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err.message);
});

/* ------------------------------------------------------------------ */
/*  Imagen de producto — upload / delete (Cloudinary)                  */
/* ------------------------------------------------------------------ */

function cloudinaryPublicId(url) {
  if (!url) return null;
  try {
    const parts = new URL(url).pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const afterVersion = parts.slice(uploadIdx + 2);
    const last = afterVersion[afterVersion.length - 1];
    afterVersion[afterVersion.length - 1] = last.replace(/\.[^.]+$/, '');
    return afterVersion.join('/');
  } catch {
    return null;
  }
}

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
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

      const { rows } = await pool.query(
        'SELECT codigo, imagen_url FROM "Productos" WHERE codigo = $1',
        [codigo],
      );

      if (rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
      const prod = rows[0];

      const buf = req.body;
      if (!buf || !(buf instanceof Buffer) || buf.length === 0) {
        return sendError(res, 400, 'Archivo vacío');
      }

      const ext = guessImageExtension(req.header('content-type'));
      if (!ext) {
        return sendError(res, 400, 'Formato no soportado (usar JPG/PNG/WEBP/GIF)');
      }

      const result = await uploadToCloudinary(buf, `sukha/productos/${codigo}`);
      const publicUrl = result.secure_url;

      const { rows: updated } = await pool.query(
        `UPDATE "Productos" SET imagen_url = $1 WHERE codigo = $2
         RETURNING codigo, imagen_url`,
        [publicUrl, codigo],
      );

      if (updated.length === 0) return sendError(res, 404, 'Producto no encontrado');

      const oldPublicId = cloudinaryPublicId(prod.imagen_url);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
      }

      return res.json(updated[0]);
    } catch (e) {
      if (e.code) return sendDbError(res, e);
      return sendError(res, 500, e.message || 'Error inesperado');
    }
  },
);

app.delete('/api/productos/:codigo/imagen', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'Código inválido');
    }

    const { rows } = await pool.query(
      'SELECT codigo, imagen_url FROM "Productos" WHERE codigo = $1',
      [codigo],
    );

    if (rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
    const prod = rows[0];

    await pool.query(
      'UPDATE "Productos" SET imagen_url = NULL WHERE codigo = $1',
      [codigo],
    );

    const oldPublicId = cloudinaryPublicId(prod.imagen_url);
    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
    }

    return res.status(204).send();
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

/* ------------------------------------------------------------------ */
/*  Health check                                                       */
/* ------------------------------------------------------------------ */

app.get('/', (req, res) => {
  res.send('Servidor de control de stock funcionando correctamente');
});

/* ------------------------------------------------------------------ */
/*  Productos CRUD                                                     */
/* ------------------------------------------------------------------ */

app.get('/api/productos', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : null;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 50;

    let text;
    let params;

    if (q) {
      const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const pattern = `%${escaped}%`;
      text = `SELECT codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url
              FROM "Productos"
              WHERE codigo ILIKE $1 OR descripcion ILIKE $1
              ORDER BY codigo ASC
              LIMIT $2`;
      params = [pattern, limit];
    } else {
      text = `SELECT codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url
              FROM "Productos"
              ORDER BY codigo ASC
              LIMIT $1`;
      params = [limit];
    }

    const { rows } = await pool.query(text, params);
    return res.json({ items: rows });
  } catch (e) {
    if (e.code) return sendDbError(res, e);
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

    let text;
    let params;

    if (q) {
      const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const pattern = `%${escaped}%`;
      text = `SELECT codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url
              FROM "Productos"
              WHERE codigo ILIKE $1 OR descripcion ILIKE $1
              ORDER BY codigo ASC`;
      params = [pattern];
    } else {
      text = `SELECT codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url
              FROM "Productos"
              ORDER BY codigo ASC`;
      params = [];
    }

    const { rows } = await pool.query(text, params);

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
        ].join(sep),
      );
    }

    const bom = '\ufeff';
    const csv = `${bom}${lines.join('\n')}\n`;
    const fileName = `productos_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.get('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const { rows } = await pool.query(
      `SELECT codigo, descripcion, precio_venta, stock_actual, stock_minimo, imagen_url
       FROM "Productos"
       WHERE codigo = $1`,
      [codigo],
    );

    if (rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
    return res.json(rows[0]);
  } catch (e) {
    if (e.code) return sendDbError(res, e);
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

    const { rows } = await pool.query(
      `INSERT INTO "Productos" (codigo, id_categoria, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url`,
      [
        payload.codigo,
        payload.id_categoria,
        payload.descripcion,
        payload.precio_venta,
        payload.costo,
        payload.stock_actual,
        payload.stock_minimo,
        payload.imagen_url,
      ],
    );

    return res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code) return sendDbError(res, e);
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

    const { rows } = await pool.query(
      `UPDATE "Productos" SET stock_actual = $1 WHERE codigo = $2
       RETURNING codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url`,
      [Math.trunc(s), codigo],
    );

    if (rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
    return res.json(rows[0]);
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.put('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'El parámetro codigo es obligatorio');
    }

    const { descripcion, precio_venta, costo, stock_minimo } = req.body || {};

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (descripcion !== undefined) {
      setClauses.push(`descripcion = $${paramIdx++}`);
      values.push(String(descripcion || '').trim() || null);
    }

    if (precio_venta !== undefined) {
      setClauses.push(`precio_venta = $${paramIdx++}`);
      const p = Number(precio_venta);
      values.push(Number.isFinite(p) ? p : null);
    }

    if (costo !== undefined) {
      setClauses.push(`costo = $${paramIdx++}`);
      const c = Number(costo);
      values.push(Number.isFinite(c) ? c : null);
    }

    if (stock_minimo !== undefined) {
      if (stock_minimo === null || stock_minimo === '') {
        setClauses.push(`stock_minimo = $${paramIdx++}`);
        values.push(null);
      } else {
        const smin = Number(stock_minimo);
        if (!Number.isFinite(smin) || smin < 0) {
          return sendError(res, 400, 'stock_minimo debe ser un número >= 0');
        }
        setClauses.push(`stock_minimo = $${paramIdx++}`);
        values.push(Math.trunc(smin));
      }
    }

    if (setClauses.length === 0) {
      return sendError(res, 400, 'No hay campos válidos para actualizar');
    }

    values.push(codigo);
    const whereParam = `$${paramIdx}`;

    const { rows } = await pool.query(
      `UPDATE "Productos" SET ${setClauses.join(', ')} WHERE codigo = ${whereParam}
       RETURNING codigo, descripcion, precio_venta, costo, stock_actual, stock_minimo, imagen_url`,
      values,
    );

    if (rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
    return res.json(rows[0]);
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.delete('/api/productos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || typeof codigo !== 'string') {
      return sendError(res, 400, 'El parámetro codigo es obligatorio');
    }

    const { rows: existe } = await pool.query(
      'SELECT codigo FROM "Productos" WHERE codigo = $1',
      [codigo],
    );
    if (existe.length === 0) return sendError(res, 404, 'Producto no encontrado');

    const { rows: ingresos } = await pool.query(
      'SELECT id_ingreso FROM "Ingresos_Stock" WHERE codigo_producto = $1 LIMIT 1',
      [codigo],
    );
    if (ingresos.length > 0) {
      return sendError(res, 409, 'No se puede borrar: el producto tiene ingresos de stock');
    }

    const { rows: detalles } = await pool.query(
      'SELECT id_detalle FROM "Detalle_Ventas" WHERE codigo_producto = $1 LIMIT 1',
      [codigo],
    );
    if (detalles.length > 0) {
      return sendError(res, 409, 'No se puede borrar: el producto tiene ventas registradas');
    }

    await pool.query('DELETE FROM "Productos" WHERE codigo = $1', [codigo]);
    return res.status(204).send();
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

/* ------------------------------------------------------------------ */
/*  Ingresos de stock                                                  */
/* ------------------------------------------------------------------ */

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

    const { rows: prodRows } = await pool.query(
      'SELECT codigo, stock_actual FROM "Productos" WHERE codigo = $1',
      [codigo_producto],
    );
    if (prodRows.length === 0) return sendError(res, 404, 'Producto no encontrado');

    const currentStock = Number(prodRows[0].stock_actual) || 0;
    const newStock = currentStock + Math.trunc(cantidad);

    const { rows: ingresoRows } = await pool.query(
      `INSERT INTO "Ingresos_Stock" (codigo_producto, cantidad_ingresada, costo_unitario)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [codigo_producto, Math.trunc(cantidad), costo],
    );

    const { rows: updatedRows } = await pool.query(
      `UPDATE "Productos" SET stock_actual = $1 WHERE codigo = $2
       RETURNING *`,
      [newStock, codigo_producto],
    );

    if (updatedRows.length === 0) return sendError(res, 404, 'Producto no encontrado');

    return res.status(201).json({ ingreso: ingresoRows[0], producto: updatedRows[0] });
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

/* ------------------------------------------------------------------ */
/*  Ventas                                                             */
/* ------------------------------------------------------------------ */

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

const CODIGO_PERSONALIZADO = '999';

app.post('/api/ventas', async (req, res) => {
  const client = await pool.connect();
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
    const { rows: productos } = await client.query(
      'SELECT codigo, precio_venta, costo, stock_actual FROM "Productos" WHERE codigo = ANY($1)',
      [codigos],
    );

    const productosByCodigo = new Map(productos.map((p) => [p.codigo, p]));

    for (const item of items) {
      const p = productosByCodigo.get(item.codigo_producto);
      if (!p) {
        return sendError(res, 404, `Producto inexistente: ${item.codigo_producto}`);
      }
      if (item.codigo_producto === CODIGO_PERSONALIZADO) continue;
      if (p.stock_actual != null && Number(p.stock_actual) < Number(item.cantidad)) {
        return sendError(res, 409, `Stock insuficiente para ${item.codigo_producto}`);
      }
    }

    const detallePayload = items.map((item) => {
      const p = productosByCodigo.get(item.codigo_producto);
      const row = {
        codigo_producto: item.codigo_producto,
        cantidad: Number(item.cantidad),
        precio_historico: item.precio_historico ?? p.precio_venta ?? null,
        costo_historico: item.costo_historico ?? p.costo ?? null,
      };
      if (item.codigo_producto === CODIGO_PERSONALIZADO && item.descripcion_custom) {
        row.descripcion_custom = String(item.descripcion_custom).trim().slice(0, 200);
      }
      return row;
    });

    const totalFacturado = detallePayload.reduce((acc, d) => {
      const precio = d.precio_historico == null ? 0 : Number(d.precio_historico);
      return acc + Number(d.cantidad) * precio;
    }, 0);

    await client.query('BEGIN');

    const { rows: ventaRows } = await client.query(
      `INSERT INTO "Ventas" (fecha, total_facturado)
       VALUES ($1, $2)
       RETURNING *`,
      [ventaFecha.toISOString(), totalFacturado],
    );
    const venta = ventaRows[0];

    const detalleRows = [];
    for (const d of detallePayload) {
      const { rows } = await client.query(
        `INSERT INTO "Detalle_Ventas" (id_venta, codigo_producto, cantidad, precio_historico, costo_historico, descripcion_custom)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [venta.id_venta, d.codigo_producto, d.cantidad, d.precio_historico, d.costo_historico, d.descripcion_custom || null],
      );
      detalleRows.push(rows[0]);
    }

    for (const item of items) {
      if (item.codigo_producto === CODIGO_PERSONALIZADO) continue;
      const p = productosByCodigo.get(item.codigo_producto);
      if (p.stock_actual == null) continue;
      const newStock = (Number(p.stock_actual) || 0) - Number(item.cantidad);

      await client.query(
        'UPDATE "Productos" SET stock_actual = $1 WHERE codigo = $2',
        [newStock, item.codigo_producto],
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({ venta, detalle: detalleRows });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  } finally {
    client.release();
  }
});

/* ------------------------------------------------------------------ */
/*  Reportes                                                           */
/* ------------------------------------------------------------------ */

app.get('/api/reportes/unidades', async (req, res) => {
  try {
    const parsed = parseMesAnio({ mes: req.query.mes, anio: req.query.anio });
    if (!parsed) return sendError(res, 400, 'Parámetros requeridos: mes (1-12) y anio (YYYY)');

    const { startISO, endISO } = parsed;

    const { rows } = await pool.query(
      `SELECT dv.codigo_producto, SUM(dv.cantidad)::int AS unidades
       FROM "Detalle_Ventas" dv
       INNER JOIN "Ventas" v ON dv.id_venta = v.id_venta
       WHERE v.fecha >= $1 AND v.fecha < $2
       GROUP BY dv.codigo_producto`,
      [startISO, endISO],
    );

    return res.json({
      desde: startISO,
      hasta: endISO,
      items: rows.map((r) => ({ codigo_producto: r.codigo_producto, unidades: r.unidades })),
    });
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

app.get('/api/reportes/financiero', async (req, res) => {
  try {
    const parsed = parseMesAnio({ mes: req.query.mes, anio: req.query.anio });
    if (!parsed) return sendError(res, 400, 'Parámetros requeridos: mes (1-12) y anio (YYYY)');

    const { startISO, endISO } = parsed;

    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(dv.cantidad * COALESCE(dv.precio_historico, 0)), 0) AS total_facturado,
         COALESCE(SUM(dv.cantidad * COALESCE(dv.costo_historico, 0)), 0) AS total_costo
       FROM "Detalle_Ventas" dv
       INNER JOIN "Ventas" v ON dv.id_venta = v.id_venta
       WHERE v.fecha >= $1 AND v.fecha < $2`,
      [startISO, endISO],
    );

    const totals = rows[0] || { total_facturado: 0, total_costo: 0 };
    const totalFacturado = Number(totals.total_facturado);
    const totalCosto = Number(totals.total_costo);

    return res.json({
      desde: startISO,
      hasta: endISO,
      total_facturado: totalFacturado,
      total_costo: totalCosto,
      utilidad: totalFacturado - totalCosto,
    });
  } catch (e) {
    if (e.code) return sendDbError(res, e);
    return sendError(res, 500, e.message || 'Error inesperado');
  }
});

/* ------------------------------------------------------------------ */
/*  Start server                                                       */
/* ------------------------------------------------------------------ */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
