// server/scripts/seed_demo_data.js
require('dotenv').config();
const mongoose = require('mongoose');

// Importar Modelos
const Product = require('../modules/inventory/models/Product');
const Category = require('../modules/inventory/models/Category');
const Brand = require('../modules/inventory/models/Brand');
const Supplier = require('../modules/inventory/models/Supplier');
const StockMovement = require('../modules/inventory/models/StockMovement');
const Sale = require('../modules/pos/models/Sale');
const Income = require('../modules/accounting/models/Income');
const Expense = require('../modules/accounting/models/Expense');
const CashMovement = require('../modules/accounting/models/CashMovement');
const CashClosing = require('../modules/accounting/models/CashClosing');
const CustomerDebt = require('../modules/accounting/models/CustomerDebt');
const BusinessDebt = require('../modules/accounting/models/BusinessDebt');

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedData() {
  try {
    console.log('🔄 Conectando a MongoDB para limpieza y carga...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conexión establecida.');

    // 1. LIMPIEZA TOTAL
    console.log('🧹 Limpiando base de datos...');
    await Promise.all([
      Product.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Supplier.deleteMany({}),
      StockMovement.deleteMany({}),
      Sale.deleteMany({}),
      Income.deleteMany({}),
      Expense.deleteMany({}),
      CashMovement.deleteMany({}),
      CashClosing.deleteMany({}),
      CustomerDebt.deleteMany({}),
      BusinessDebt.deleteMany({})
    ]);
    console.log('✅ Sistema limpio de datos antiguos.');

    // 2. CREAR CATEGORÍAS (Con slug manual para evitar error de duplicado null)
    console.log('🏷️ Creando categorías...');
    const categoriesData = [
      { name: 'Escritura', description: 'Lapiceros, marcadores y correctores' },
      { name: 'Cuadernos y Papel', description: 'Hojas, cuadernos y blocks' },
      { name: 'Arte y Manualidades', description: 'Pinturas, pinceles y lienzos' },
      { name: 'Oficina', description: 'Engrapadoras, clips y organizadores' },
      { name: 'Tecnología', description: 'Memorias USB, cables y accesorios' }
    ].map(cat => ({ ...cat, slug: generateSlug(cat.name) }));

    const categories = await Category.insertMany(categoriesData);

    // 3. CREAR MARCAS
    console.log('✨ Creando marcas...');
    const brands = await Brand.insertMany([
      { name: 'Faber-Castell' }, { name: 'Pilot' }, { name: 'Scribe' }, { name: 'Bic' }, { name: 'Crayola' }
    ]);

    // 4. CREAR PROVEEDORES
    console.log('🚚 Creando proveedores...');
    const suppliers = await Supplier.insertMany([
      { name: 'Distribuidora Panamericana', phone: '2233-4455', contactName: 'Juan Pérez' },
      { name: 'Librerías Asociadas S.A.', phone: '5566-7788', contactName: 'María López' }
    ]);

    // 5. GENERAR 50 PRODUCTOS
    console.log('📦 Generando 50 productos realistas...');
    const baseProducts = [
      { name: 'Lapicero Gel', catIdx: 0, price: 5.50, purchasePrice: 3.00, variants: ['Azul', 'Negro', 'Rojo'] },
      { name: 'Cuaderno Universitario', catIdx: 1, price: 18.00, purchasePrice: 10.00, variants: ['100 Hojas', '200 Hojas'] },
      { name: 'Marcador Permanente', catIdx: 0, price: 7.00, purchasePrice: 4.50, variants: ['Fino', 'Grueso'] },
      { name: 'Resaltador Fluo', catIdx: 0, price: 4.00, purchasePrice: 2.20, variants: ['Amarillo', 'Verde', 'Rosa'] },
      { name: 'Borrador de Miga', catIdx: 0, price: 1.50, purchasePrice: 0.75, variants: null },
      { name: 'Sacapuntas Metálico', catIdx: 0, price: 3.00, purchasePrice: 1.50, variants: null },
      { name: 'Regla 30cm', catIdx: 3, price: 2.50, purchasePrice: 1.20, variants: null },
      { name: 'Témperas Profesionales', catIdx: 2, price: 35.00, purchasePrice: 22.00, variants: ['12 Colores', '24 Colores'] },
      { name: 'Engrapadora Mini', catIdx: 3, price: 25.00, purchasePrice: 15.00, variants: null },
      { name: 'Memoria USB 64GB', catIdx: 4, price: 75.00, purchasePrice: 45.00, variants: ['Sandisk', 'Kingston'] }
    ];

    for (let i = 1; i <= 50; i++) {
      const base = baseProducts[i % baseProducts.length];
      const brand = brands[i % brands.length];
      const supplier = suppliers[i % suppliers.length];
      const category = categories[base.catIdx];

      const sku = `PROD-${String(i).padStart(4, '0')}`;
      
      const product = new Product({
        name: `${base.name} ${brand.name} #${i}`,
        description: `Producto de alta calidad de la marca ${brand.name}`,
        sku: sku,
        barcode: `740${String(i).padStart(10, '0')}`,
        price: base.price,
        purchasePrice: base.purchasePrice,
        stock: 20 + (i % 30),
        minStock: 5,
        categoryId: category._id,
        brandId: brand._id,
        supplierId: supplier._id,
        hasVariants: base.variants !== null,
        variants: []
      });

      if (base.variants) {
        product.variants = base.variants.map((vName, vIdx) => {
          const vTimestamp = Date.now().toString().slice(-7);
          const vRandom = Math.floor(10000 + Math.random() * 90000).toString();
          return {
            name: vName,
            sku: `${sku}-V${vIdx}`,
            barcode: vTimestamp + vRandom,
            price: base.price + (vIdx * 2),
            purchasePrice: base.purchasePrice,
            stock: 10 + vIdx
          };
        });
        product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      }

      await product.save(); // Usamos .save() para disparar los hooks de slug/sku si faltan
      if (i % 10 === 0) console.log(`   ... ${i} productos procesados`);
    }

    console.log('✅ 50 productos con marcas y proveedores insertados correctamente.');

    // 6. INICIALIZAR CAJA
    console.log('💰 Inicializando movimientos contables...');
    const initialMovement = await CashMovement.create({
      tipo: 'ingreso',
      monto: 500,
      descripcion: 'Saldo inicial de caja para pruebas',
      saldoAnterior: 0,
      saldoNuevo: 500
    });

    // 7. AGREGAR GASTOS DE PRUEBA
    console.log('📉 Registrando gastos de prueba...');
    const expensesData = [
      { monto: 150.00, descripcion: 'Pago de Internet Tigo', categoria: 'servicios', creadoPor: null },
      { monto: 45.50, descripcion: 'Compra de bolsas para empaque', categoria: 'insumos', creadoPor: null },
      { monto: 200.00, descripcion: 'Pago de publicidad Facebook', categoria: 'publicidad', creadoPor: null }
    ];

    for (const exp of expensesData) {
      const expense = new Expense(exp);
      await expense.save();
      
      const lastMov = await CashMovement.findOne().sort({ fecha: -1 });
      const saldoAnt = lastMov ? lastMov.saldoNuevo : 0;
      
      await CashMovement.create({
        tipo: 'gasto',
        monto: exp.monto,
        descripcion: exp.descripcion,
        referenciaId: expense._id,
        referenciaModelo: 'Expense',
        saldoAnterior: saldoAnt,
        saldoNuevo: saldoAnt - exp.monto
      });
    }

    console.log('\n🚀 PROCESO COMPLETADO CON ÉXITO');
    console.log('El sistema está listo para pruebas con un catálogo completo.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seedData();
