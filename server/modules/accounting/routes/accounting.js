// server/modules/accounting/routes/accounting.js
const express = require('express');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const CustomerDebt = require('../models/CustomerDebt');
const BusinessDebt = require('../models/BusinessDebt');
const CashMovement = require('../models/CashMovement');
const CashClosing = require('../models/CashClosing');
const auth = require('../../login/middleware/auth');

const router = express.Router();

// ============================================
// FUNCIONES AUXILIARES
// ============================================
async function getCurrentCashBalance() {
  try {
    const lastMovement = await CashMovement.findOne().sort({ fecha: -1 });
    return lastMovement ? lastMovement.saldoNuevo : 0;
  } catch (error) {
    console.error('Error balance:', error);
    return 0;
  }
}

async function updateCash(tipo, monto, descripcion, referenciaId, referenciaModelo = 'Income') {
  const saldoAnterior = await getCurrentCashBalance();
  const saldoNuevo = tipo === 'ingreso' ? saldoAnterior + monto : saldoAnterior - monto;
  
  const movement = new CashMovement({
    tipo,
    monto,
    descripcion,
    referenciaId,
    referenciaModelo,
    saldoAnterior,
    saldoNuevo
  });
  
  await movement.save();
  return movement;
}

// ============================================
// PERMISOS
// ============================================
function canViewAccounting(req) {
  return req.user.role === 'admin' || (req.user.role === 'employee' && req.user.viewAccounting);
}

// ============================================
// RUTAS OPERATIVAS (ESCRITURA)
// ============================================

router.post('/sale', auth, async (req, res) => {
  try {
    const { monto, descripcion, metodo, clienteNombre, esDeuda } = req.body;
    const income = new Income({
      tipo: 'venta_rapida',
      monto,
      descripcion,
      metodo: metodo || 'efectivo',
      clienteNombre: clienteNombre || '',
      esDeuda: esDeuda === true,
      status: esDeuda ? 'debt' : 'completed',
      creadoPor: req.user.id
    });
    await income.save();

    if (esDeuda) {
      const debt = new CustomerDebt({
        clienteNombre: clienteNombre || 'Cliente manual',
        monto,
        estado: 'pendiente'
      });
      await debt.save();
    } else {
      await updateCash('ingreso', monto, `Venta rápida: ${descripcion}`, income._id);
    }
    res.status(201).json(income);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

router.post('/expense', auth, async (req, res) => {
  try {
    const expense = new Expense({ ...req.body, creadoPor: req.user.id });
    await expense.save();
    await updateCash('gasto', expense.monto, `Gasto: ${expense.descripcion}`, expense._id, 'Expense');
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

router.put('/customer-debt/:id/pay', auth, async (req, res) => {
  try {
    const debt = await CustomerDebt.findById(req.params.id);
    if (!debt || debt.estado === 'pagado') return res.status(400).json({ error: 'Deuda no válida' });

    debt.estado = 'pagado';
    debt.fechaPago = new Date();
    await debt.save();

    const originalInvoice = await Income.findOne({ notas: new RegExp(debt._id.toString()) });
    if (originalInvoice) {
      originalInvoice.status = 'completed';
      originalInvoice.metodo = req.body.metodo || 'efectivo';
      await originalInvoice.save();
    }

    const incomeRecord = new Income({
      tipo: 'manual',
      monto: debt.monto,
      descripcion: `Cobro de deuda: ${debt.clienteNombre}`,
      creadoPor: req.user.id
    });
    await incomeRecord.save();
    await updateCash('ingreso', debt.monto, `Pago deuda: ${debt.clienteNombre}`, incomeRecord._id);
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al pagar deuda' });
  }
});

router.post('/customer-debt', auth, async (req, res) => {
  try {
    const debt = new CustomerDebt(req.body);
    await debt.save();
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar deuda' });
  }
});

router.post('/business-debt', auth, async (req, res) => {
  try {
    const debt = new BusinessDebt(req.body);
    await debt.save();
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar deuda' });
  }
});

router.put('/business-debt/:id/pay', auth, async (req, res) => {
  try {
    const debt = await BusinessDebt.findById(req.params.id);
    if (!debt || debt.estado === 'pagado') return res.status(400).json({ error: 'Deuda no válida' });

    const expense = new Expense({ monto: debt.monto, descripcion: `Pago proveedor: ${debt.proveedor}`, categoria: 'insumos' });
    await expense.save();
    await updateCash('gasto', debt.monto, `Pago a proveedor: ${debt.proveedor}`, expense._id, 'Expense');
    debt.estado = 'pagado';
    debt.fechaPago = new Date();
    await debt.save();
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al pagar deuda' });
  }
});

// ============================================
// RUTAS DE CONSULTA (LECTURA)
// ============================================

router.get('/balance-general', auth, async (req, res) => {
  try {
    if (!canViewAccounting(req)) return res.status(403).json({ error: 'No autorizado' });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [incomeStats, expenseStats] = await Promise.all([
      Income.aggregate([
        { $match: { fecha: { $gte: twelveMonthsAgo }, status: 'completed' } },
        {
          $group: {
            _id: {
              year: { $year: "$fecha" },
              month: { $month: "$fecha" }
            },
            totalIncome: { $sum: "$monto" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Expense.aggregate([
        { $match: { fecha: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$fecha" },
              month: { $month: "$fecha" }
            },
            totalExpense: { $sum: "$monto" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ])
    ]);

    // Combinar los resultados en un formato legible
    const balanceMap = {};

    incomeStats.forEach(stat => {
      const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
      balanceMap[key] = { 
        mes: key, 
        ingresos: stat.totalIncome, 
        gastos: 0, 
        ganancia: stat.totalIncome 
      };
    });

    expenseStats.forEach(stat => {
      const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
      if (!balanceMap[key]) {
        balanceMap[key] = { mes: key, ingresos: 0, gastos: stat.totalExpense, ganancia: -stat.totalExpense };
      } else {
        balanceMap[key].gastos = stat.totalExpense;
        balanceMap[key].ganancia = balanceMap[key].ingresos - stat.totalExpense;
      }
    });

    const finalBalance = Object.values(balanceMap).sort((a, b) => a.mes.localeCompare(b.mes));

    res.json(finalBalance);
  } catch (error) {
    console.error('Error balance general:', error);
    res.status(500).json({ error: 'Error al generar balance general' });
  }
});

router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    if (!canViewAccounting(req)) return res.status(403).json({ error: 'No autorizado' });
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    const [statsHoy, statsDeudas] = await Promise.all([
      Income.aggregate([
        { $match: { fecha: { $gte: hoy }, esDeuda: false } }, 
        { $group: { _id: null, total: { $sum: "$monto" }, count: { $sum: 1 } } }
      ]),
      CustomerDebt.aggregate([
        { $match: { estado: 'pendiente' } }, 
        { $group: { _id: null, total: { $sum: "$monto" } } }
      ])
    ]);

    res.json({
      ventasHoy: statsHoy[0]?.count || 0,
      ingresosHoy: statsHoy[0]?.total || 0,
      deudasPendientes: statsDeudas[0]?.total || 0
    });
  } catch (error) { res.status(500).json({ error: 'Error stats' }); }
});

router.get('/report', auth, async (req, res) => {
  try {
    if (!canViewAccounting(req)) return res.status(403).json({ error: 'No autorizado' });
    
    const { period = 'week' } = req.query;
    const startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);
    
    const incomes = await Income.find({ fecha: { $gte: startDate }, esDeuda: false });
    const expenses = await Expense.find({ fecha: { $gte: startDate } });
    
    const dailyData = {};
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      dailyData[d.toISOString().split('T')[0]] = { income: 0, expense: 0 };
    }
    
    incomes.forEach(i => {
      const d = new Date(i.fecha).toISOString().split('T')[0];
      if (dailyData[d]) dailyData[d].income += i.monto;
    });

    const dailyLabels = Object.keys(dailyData);
    const dailyIncomes = dailyLabels.map(d => dailyData[d].income);
    
    res.json({ dailyLabels, dailyIncomes });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

router.get('/dashboard', auth, async (req, res) => {
  try {
    if (!canViewAccounting(req)) return res.status(403).json({ error: 'No autorizado' });
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const sem = new Date(); sem.setDate(sem.getDate() - 7);
    const mes = new Date(); mes.setMonth(mes.getMonth() - 1);
    const [vH, gH, vS, gS, vM, gM, dC, dN, movs, saldo] = await Promise.all([
      Income.find({ fecha: { $gte: hoy }, esDeuda: false }), Expense.find({ fecha: { $gte: hoy } }),
      Income.find({ fecha: { $gte: sem }, esDeuda: false }), Expense.find({ fecha: { $gte: sem } }),
      Income.find({ fecha: { $gte: mes }, esDeuda: false }), Expense.find({ fecha: { $gte: mes } }),
      CustomerDebt.find({ estado: 'pendiente' }), BusinessDebt.find({ estado: 'pendiente' }),
      CashMovement.find().sort({ fecha: -1 }).limit(10), getCurrentCashBalance()
    ]);
    const calc = (arr) => arr.reduce((sum, i) => sum + (i.monto || 0), 0);
    res.json({
      hoy: { ingresos: calc(vH), gastos: calc(gH), ganancia: calc(vH) - calc(gH) },
      semana: { ingresos: calc(vS), gastos: calc(gS), ganancia: calc(vS) - calc(gS) },
      mes: { ingresos: calc(vM), gastos: calc(gM), ganancia: calc(vM) - calc(gM) },
      deudas: { clientes: { total: calc(dC), items: dC }, negocio: { total: calc(dN), items: dN } },
      caja: { saldoActual: saldo, ultimosMovimientos: movs }
    });
  } catch (error) { res.status(500).json({ error: 'Error dashboard' }); }
});

router.get('/incomes', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const query = {};
    if (fechaInicio) query.fecha = { $gte: new Date(fechaInicio) };
    if (fechaFin) query.fecha = { ...query.fecha, $lte: new Date(fechaFin) };
    const incomes = await Income.find(query).sort({ fecha: -1 });
    res.json(incomes);
  } catch (error) { res.status(500).json({ error: 'Error incomes' }); }
});

router.get('/expenses', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const query = {};
    if (fechaInicio) query.fecha = { $gte: new Date(fechaInicio) };
    if (fechaFin) query.fecha = { ...query.fecha, $lte: new Date(fechaFin) };
    const expenses = await Expense.find(query).sort({ fecha: -1 });
    res.json(expenses);
  } catch (error) { res.status(500).json({ error: 'Error expenses' }); }
});

router.get('/customer-debts', auth, async (req, res) => {
  try {
    const debts = await CustomerDebt.find({ estado: 'pendiente' }).sort({ fecha: -1 });
    res.json(debts);
  } catch (error) { res.status(500).json({ error: 'Error debts' }); }
});

router.post('/cash-closing', auth, async (req, res) => {
  try {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const existing = await CashClosing.findOne({ fecha: { $gte: hoy, $lt: manana } });
    if (existing) return res.status(400).json({ error: 'Ya se realizó el cierre de hoy' });

    const closing = new CashClosing({ ...req.body, cajeroId: req.user.id });
    await closing.save();
    res.status(201).json(closing);
  } catch (error) { res.status(500).json({ error: 'Error al cerrar caja' }); }
});

router.get('/cash-closings', auth, async (req, res) => {
  try {
    const closings = await CashClosing.find().populate('cajeroId', 'name').sort({ fecha: -1 }).limit(30);
    res.json(closings);
  } catch (error) { res.status(500).json({ error: 'Error history' }); }
});

module.exports = router;
