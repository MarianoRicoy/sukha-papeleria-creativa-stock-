/*
  Seed para Neon Postgres - SUKHA Papelería Creativa

  Cómo ejecutar:
  1) En /Backend - Stock creá un .env con:
       DATABASE_URL=postgresql://...
  2) npm install
  3) node seed.js

  Qué hace:
  - Upsert de categorías en tabla "Categorias".
  - Upsert de productos en tabla "Productos" con:
      - codigo corto secuencial ("01", "02", ...)
      - precio_venta=0, costo=0, stock_actual=0
      - id_categoria según la categoría correspondiente
*/

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Falta la variable de entorno DATABASE_URL en .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true,
});

const CLEAN_TEST_PRODUCTS = String(process.env.CLEAN_TEST_PRODUCTS || '').toLowerCase() === 'true';

function padCode(n, width) {
  return String(n).padStart(width, '0');
}

function buildCatalog() {
  return [
    {
      categoria: 'Agendas Clásicas e Infantiles',
      productos: [
        'Agendas infantiles',
        '1 dia clasica continua',
        '1 dia clasica c/separador',
        '1 dia arcoiris',
        '2 dias clasica continua',
        '2 dias clasica c/separador',
        '2 dias arcoiris',
        '3 dias clasica continua',
        '3 dias clasica c/separador',
        '3 dias arcoiris',
        '3 dias horizontal',
        '2 dias horizontal',
        'pocker 10x15 diaria',
        'pochet 10x15 2 dias por hoja',
        'pochet 10x15 semanal',
        'planificador perpetuo 20x7',
      ],
    },
    {
      categoria: 'Cuadernos y Repuestos',
      productos: [
        'cuaderno start clic A5',
        'cuaderno de discos A5',
        'cuaderno de discos A4',
        'cuaderno rayado A5',
        'cuaderno liso A5',
        'cuaderno cuadriculado A5',
        'cuaderno rayado A4',
        'cuaderno liso A4',
        'cuaderno cuadriculado A4',
        'repuesto discos rayado',
        'repuesto discos liso',
        'repuesto discos cuadriculados',
        'repuesto discos punteado',
      ],
    },
    {
      categoria: 'Anotadores y Calendarios',
      productos: [
        'anotador zodiaco',
        'anotador 14x7',
        'anotador 10x7',
        'anotador tapa blanda',
        'calendario A4 liso',
        'calendario A4 fotos',
        'calendario A4 dibujos ByN',
        'Calendario A3 liso',
        'Calendario A3 fotos',
        'calendario A3 dibujos ByN',
      ],
    },
    {
      categoria: 'Agendas Docentes y Universitarias',
      productos: [
        'Agenda universitaria',
        'Agenda docente A4 - 4 cursos',
        'Agenda docente A4 - 6 cursos',
        'Agenda docente A4 - 8 cursos',
        'Agenda docente A4 - 10 cursos',
        'Agenda docente A4 - 12 cursos',
        'Agenda docente A4 - 14 cursos',
        'Agenda docente A5 - 4 cursos',
        'Agenda docente A5 - 6 cursos',
        'Agenda docente A5 - 8 cursos',
        'Agenda docente A5 - 10 cursos',
        'Agenda docente A5 - 12 cursos',
        'Agenda docente A5 - 14 cursos',
        'Agenda docente Nivel Inicial',
        'Agenda docente Inclusion',
        'Agenda Docente directiva',
        'Agenda docente personalizada',
      ],
    },
    {
      categoria: 'Agendas Profesionales (Perpetuas)',
      productos: [
        'Agenda perpetua abogado',
        'Agenda perpetua estetica',
        'Agenda perpetua reposteria',
        'Agenda perpetua maquilladora',
        'Agenda perpetua Fotografia',
        'Agenda perpetua nutricion',
        'Agenda perpetua Acompañante',
      ],
    },
    {
      categoria: 'Diarios, Bitácoras y Especiales',
      productos: [
        'cuaderno pediatrico',
        'diario de embarazo',
        'controles medicos',
        'Bitacora de viajes',
        'Bitacora de libros y peliculas',
        'tu historia en primera persona (A, E, etc.)',
        '100 CITAS JUNTOS',
        '100 citas en familia',
        '100 citas con mama',
        'diario de recuerdos',
        'diario de gratitud',
        'Cuaderno de recetas',
        'Agenda Cristiana',
      ],
    },
    {
      categoria: 'Accesorios y Extras',
      productos: [
        'juegos de mesa con dados',
        'Lapiceras ecologicas',
        'Separadores escolares x10',
        'Etiquetas escolares (42/12/8)',
        'vinilos',
      ],
    },
  ];
}

async function upsertCategories(categoryNames) {
  const uniqueNames = Array.from(new Set(categoryNames.map((n) => String(n || '').trim()).filter(Boolean)));

  for (const name of uniqueNames) {
    await pool.query(
      `INSERT INTO "Categorias" (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO NOTHING`,
      [name],
    );
  }

  const { rows } = await pool.query(
    'SELECT id_categoria, nombre FROM "Categorias" WHERE nombre = ANY($1)',
    [uniqueNames],
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.nombre)) map.set(row.nombre, row.id_categoria);
  }
  return map;
}

async function upsertProducts(products) {
  for (const p of products) {
    const codigo = String(p?.codigo || '').trim();
    if (!codigo) continue;

    await pool.query(
      `INSERT INTO "Productos" (codigo, id_categoria, descripcion, precio_venta, costo, stock_actual)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (codigo) DO UPDATE SET
         id_categoria  = EXCLUDED.id_categoria,
         descripcion   = EXCLUDED.descripcion,
         precio_venta  = EXCLUDED.precio_venta,
         costo         = EXCLUDED.costo,
         stock_actual  = EXCLUDED.stock_actual`,
      [
        codigo,
        p.id_categoria ?? null,
        p.descripcion ?? null,
        p.precio_venta ?? 0,
        p.costo ?? 0,
        p.stock_actual ?? 0,
      ],
    );
  }
}

async function deleteTestProducts() {
  const { rows } = await pool.query(
    'SELECT codigo FROM "Productos" WHERE id_categoria IS NULL',
  );

  const codes = rows.map((r) => String(r?.codigo || '').trim()).filter(Boolean);
  if (codes.length === 0) return 0;

  await pool.query(
    'DELETE FROM "Detalle_Ventas" WHERE codigo_producto = ANY($1)',
    [codes],
  );

  await pool.query(
    'DELETE FROM "Ingresos_Stock" WHERE codigo_producto = ANY($1)',
    [codes],
  );

  await pool.query(
    'DELETE FROM "Productos" WHERE id_categoria IS NULL',
  );

  return codes.length;
}

async function main() {
  const catalog = buildCatalog();
  const categoryNames = catalog.map((c) => c.categoria);

  if (CLEAN_TEST_PRODUCTS) {
    console.log('CLEAN_TEST_PRODUCTS=true → borrando productos de prueba (id_categoria IS NULL)...');
    const deleted = await deleteTestProducts();
    console.log(`Productos de prueba eliminados: ${deleted}`);
  }

  console.log(`Seedeando ${categoryNames.length} categorías...`);
  const categoryIdByName = await upsertCategories(categoryNames);

  const flatProducts = [];
  for (const group of catalog) {
    const id_categoria = categoryIdByName.get(group.categoria) ?? null;
    for (const descripcion of group.productos) {
      flatProducts.push({
        id_categoria,
        descripcion,
        precio_venta: 0,
        costo: 0,
        stock_actual: 0,
      });
    }
  }

  const width = Math.max(2, String(flatProducts.length).length);
  const productsPayload = flatProducts.map((p, idx) => ({
    codigo: padCode(idx + 1, width),
    ...p,
  }));

  console.log(`Seedeando ${productsPayload.length} productos...`);
  await upsertProducts(productsPayload);

  console.log('Seed finalizado OK.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed falló:', err?.message || err);
  await pool.end().catch(() => {});
  process.exit(1);
});
