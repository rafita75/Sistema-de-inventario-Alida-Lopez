// server/modules/accounting/listeners.js
const eventBus = require('../../shared/events');
const EVENTS = require('../../shared/events.types');
const Income = require('./models/Income');
const Expense = require('./models/Expense');
const CustomerDebt = require('./models/CustomerDebt');
const CashMovement = require('./models/CashMovement');

/**
 * Configurar todos los listeners del módulo Accounting
 */
function setupAccountingListeners() {
  
  // ============================================
  // ESCUCHAR VENTAS CREADAS (desde POS o Ecommerce)
  // ============================================
  eventBus.on(EVENTS.SALE_CREATED, async (data) => {
    console.log(`💰 Accounting recibió venta: ${data.saleNumber}`);
    
    // Obtener último saldo para movimiento de caja
    const lastMovement = await CashMovement.findOne().sort({ fecha: -1 });
    const saldoAnterior = lastMovement ? lastMovement.saldoNuevo : 0;
    
    // 1. Crear el Ingreso detallado (SIEMPRE se crea para histórico de facturas)
    const income = new Income({
      tipo: "venta_pos",
      invoiceNumber: data.saleNumber,
      monto: data.total,
      descripcion: `Venta POS #${data.saleNumber}${data.clienteNombre !== 'Mostrador' ? ' - ' + data.clienteNombre : ''}`,
      items: data.items, 
      metodo: data.paymentMethod || 'efectivo',
      clienteNombre: data.clienteNombre || "Cliente mostrador",
      clienteTelefono: data.clienteTelefono || "",
      esDeuda: data.esDeuda === true,
      status: data.esDeuda ? 'debt' : 'completed', 
      creadoPor: data.createdBy,
      fecha: data.createdAt || new Date()
    });

    try {
      await income.save();
      console.log(`✅ Ingreso guardado: ${income.invoiceNumber} (Status: ${income.status})`);
    } catch (err) {
      console.error(`❌ ERROR GUARDANDO INGRESO:`, err);
    }

    if (data.esDeuda) {
      // ============================================
      // VENTA A CRÉDITO - Registrar deuda de cliente
      // ============================================
      const debt = new CustomerDebt({
        clienteNombre: data.clienteNombre || "Cliente sin nombre",
        clienteTelefono: data.clienteTelefono || "",
        monto: data.total,
        fecha: data.createdAt || new Date(),
        estado: 'pendiente',
        notas: `Factura #${data.saleNumber}`
      });
      
      try {
        await debt.save();
        // Guardar referencia de la deuda en la factura para poder actualizarla luego
        income.notas = `Vinculado a deuda: ${debt._id}`;
        await income.save();
        console.log(`✅ Deuda registrada y vinculada a factura: ${income.invoiceNumber}`);
      } catch (err) {
        console.error(`❌ ERROR GUARDANDO DEUDA:`, err);
      }
    } else {
      // VENTA EFECTIVO - Actualizar Caja
      const saldoNuevo = saldoAnterior + data.total;
      await CashMovement.create({
        tipo: "ingreso",
        monto: data.total,
        descripcion: `Venta POS #${data.saleNumber}`,
        referenciaId: income._id,
        referenciaModelo: "Income",
        saldoAnterior,
        saldoNuevo
      });
    }
  });

  // ============================================
  // ESCUCHAR DEUDAS PAGADAS
  // ============================================
  eventBus.on(EVENTS.DEBT_PAID, async (data) => {
    console.log(`💰 Accounting recibió pago de deuda: ${data.debtId}`);
    
    const debt = await CustomerDebt.findById(data.debtId);
    if (!debt || debt.estado === 'pagado') return;
    
    debt.estado = 'pagado';
    debt.fechaPago = data.fechaPago || new Date();
    await debt.save();
    
    // Registrar ingreso por pago de deuda
    const income = new Income({
      tipo: "manual",
      monto: debt.monto,
      descripcion: `Pago de deuda - ${debt.clienteNombre}`,
      metodo: data.metodo || 'efectivo',
      clienteNombre: debt.clienteNombre,
      esDeuda: false,
      notas: `Deuda pagada: ${debt._id}`
    });
    await income.save();
    
    // Actualizar caja
    const lastMovement = await CashMovement.findOne().sort({ fecha: -1 });
    const saldoAnterior = lastMovement ? lastMovement.saldoNuevo : 0;
    const saldoNuevo = saldoAnterior + debt.monto;
    
    await CashMovement.create({
      tipo: "ingreso",
      monto: debt.monto,
      descripcion: `Pago de deuda: ${debt.clienteNombre}`,
      referenciaId: income._id,
      saldoAnterior,
      saldoNuevo
    });
    
    console.log(`✅ Deuda pagada: Q${debt.monto} - ${debt.clienteNombre}`);
  });

  // ============================================
  // ESCUCHAR GASTOS CREADOS
  // ============================================
  eventBus.on(EVENTS.EXPENSE_CREATED, async (data) => {
    console.log(`💰 Accounting recibió gasto: ${data.descripcion}`);
    
    const expense = new Expense({
      monto: data.monto,
      categoria: data.categoria,
      descripcion: data.descripcion,
      notas: data.notas,
      creadoPor: data.creadoPor
    });
    await expense.save();
    
    // Actualizar caja (egreso)
    const lastMovement = await CashMovement.findOne().sort({ fecha: -1 });
    const saldoAnterior = lastMovement ? lastMovement.saldoNuevo : 0;
    const saldoNuevo = saldoAnterior - data.monto;
    
    await CashMovement.create({
      tipo: "gasto",
      monto: data.monto,
      descripcion: data.descripcion,
      referenciaId: expense._id,
      saldoAnterior,
      saldoNuevo
    });
    
    console.log(`✅ Gasto registrado: -Q${data.monto} - Saldo: Q${saldoNuevo}`);
  });
  
  console.log('✅ Accounting listeners configurados');
}

module.exports = { setupAccountingListeners };