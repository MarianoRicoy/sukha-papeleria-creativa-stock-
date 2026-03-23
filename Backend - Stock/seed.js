/*
  Seed para Supabase - SUKHA Papelería Creativa

  Cómo ejecutar:
  1) En /Backend - Stock creá un .env con:
       SUPABASE_URL=...
       SUPABASE_KEY=...   (service role recomendado para inserts)
  2) npm install
  3) node seed.js

  Qué hace:
  - Upsert de categorías en tabla "Categorias".
  - Upsert de productos en tabla "Productos" con:
      - codigo corto secuencial ("01", "02", ...)
      - precio_venta=0, costo=0, stock_actual=0
      - id_categoria según la categoría correspondiente

  Nota:
  - Asume que "Categorias" tiene una columna "nombre" (UNIQUE recomendado).
  - Si en tu schema el campo se llama distinto, ajustá CATEGORY_NAME_COLUMN.
*/

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno. Configurá SUPABASE_URL y SUPABASE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CATEGORIES_TABLE = 'Categorias'
const PRODUCTS_TABLE = 'Productos'
const SALES_DETAIL_TABLE = 'Detalle_Ventas'
const STOCK_INGRESOS_TABLE = 'Ingresos_Stock'

// Ajustar si tu columna no se llama "nombre"
const CATEGORY_NAME_COLUMN = 'nombre'
// Ajustar si tu PK no se llama "id_categoria"
const CATEGORY_ID_COLUMN = 'id_categoria'

const CLEAN_TEST_PRODUCTS = String(process.env.CLEAN_TEST_PRODUCTS || '').toLowerCase() === 'true'

function padCode(n, width) {
  return String(n).padStart(width, '0')
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
  ]
}

async function upsertCategories(categoryNames) {
  const uniqueNames = Array.from(new Set(categoryNames.map((n) => String(n || '').trim()).filter(Boolean)))

  const { data: existing, error: existingError } = await supabase
    .from(CATEGORIES_TABLE)
    .select(`${CATEGORY_ID_COLUMN}, ${CATEGORY_NAME_COLUMN}`)
    .in(CATEGORY_NAME_COLUMN, uniqueNames)

  if (existingError) throw existingError

  const existingSet = new Set((existing || []).map((r) => r?.[CATEGORY_NAME_COLUMN]))
  const missing = uniqueNames.filter((n) => !existingSet.has(n))

  if (missing.length > 0) {
    const payload = missing.map((name) => ({ [CATEGORY_NAME_COLUMN]: name }))
    const { error: insertError } = await supabase.from(CATEGORIES_TABLE).insert(payload)
    if (insertError) throw insertError
  }

  const { data: allRows, error: allError } = await supabase
    .from(CATEGORIES_TABLE)
    .select(`${CATEGORY_ID_COLUMN}, ${CATEGORY_NAME_COLUMN}`)
    .in(CATEGORY_NAME_COLUMN, uniqueNames)

  if (allError) throw allError

  const map = new Map()
  for (const row of allRows || []) {
    const name = row?.[CATEGORY_NAME_COLUMN]
    if (!map.has(name)) map.set(name, row?.[CATEGORY_ID_COLUMN])
  }

  return map
}

async function upsertProducts(products) {
  for (const p of products) {
    const codigo = String(p?.codigo || '').trim()
    if (!codigo) continue

    const updatePayload = {
      id_categoria: p.id_categoria ?? null,
      descripcion: p.descripcion ?? null,
      precio_venta: p.precio_venta ?? 0,
      costo: p.costo ?? 0,
      stock_actual: p.stock_actual ?? 0,
    }

    const { data: updated, error: updateError } = await supabase
      .from(PRODUCTS_TABLE)
      .update(updatePayload)
      .eq('codigo', codigo)
      .select('codigo')

    if (updateError) throw updateError

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from(PRODUCTS_TABLE).insert({ codigo, ...updatePayload })
      if (insertError) throw insertError
    }
  }
}

async function deleteTestProducts() {
  const { data: rows, error: selectError } = await supabase
    .from(PRODUCTS_TABLE)
    .select('codigo', { count: 'exact' })
    .is('id_categoria', null)

  if (selectError) throw selectError

  const codes = (rows || []).map((r) => String(r?.codigo || '').trim()).filter(Boolean)
  const count = codes.length
  if (count === 0) return 0

  // Borra primero referencias para evitar violaciones de FK.
  // Solo afecta a productos de prueba (id_categoria IS NULL).
  const { error: deleteDetailError } = await supabase
    .from(SALES_DETAIL_TABLE)
    .delete()
    .in('codigo_producto', codes)
  if (deleteDetailError) throw deleteDetailError

  const { error: deleteIngresosError } = await supabase
    .from(STOCK_INGRESOS_TABLE)
    .delete()
    .in('codigo_producto', codes)
  if (deleteIngresosError) throw deleteIngresosError

  const { error: deleteError } = await supabase
    .from(PRODUCTS_TABLE)
    .delete()
    .is('id_categoria', null)

  if (deleteError) throw deleteError
  return count
}

async function main() {
  const catalog = buildCatalog()
  const categoryNames = catalog.map((c) => c.categoria)

  if (CLEAN_TEST_PRODUCTS) {
    console.log('CLEAN_TEST_PRODUCTS=true → borrando productos de prueba (id_categoria IS NULL)...')
    const deleted = await deleteTestProducts()
    console.log(`Productos de prueba eliminados: ${deleted}`)
  }

  console.log(`Seedeando ${categoryNames.length} categorías...`)
  const categoryIdByName = await upsertCategories(categoryNames)

  const flatProducts = []
  for (const group of catalog) {
    const id_categoria = categoryIdByName.get(group.categoria) ?? null
    for (const descripcion of group.productos) {
      flatProducts.push({
        id_categoria,
        descripcion,
        precio_venta: 0,
        costo: 0,
        stock_actual: 0,
      })
    }
  }

  const width = Math.max(2, String(flatProducts.length).length)
  const productsPayload = flatProducts.map((p, idx) => ({
    codigo: padCode(idx + 1, width),
    ...p,
  }))

  console.log(`Seedeando ${productsPayload.length} productos...`)
  await upsertProducts(productsPayload)

  console.log('Seed finalizado OK.')
}

main().catch((err) => {
  console.error('Seed falló:', err?.message || err)
  process.exit(1)
})
