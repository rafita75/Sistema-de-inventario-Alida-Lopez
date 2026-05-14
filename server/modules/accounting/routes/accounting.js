const express = require('express');
const mongoose = require('mongoose');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const CustomerDebt = require('../models/CustomerDebt');
const BusinessDebt = require('../models/BusinessDebt');
const CashMovement = require('../models/CashMovement');
const CashClosing = require('../models/CashClosing');
const Product = require('../../inventory/models/Product');
const auth = require('../../login/middleware/auth');
const { requirePermission } = require('../../../shared/middleware/permissions');

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

function canManageCollections(req) {
  return Boolean(
    req.user &&
    (
      req.user.role === 'admin' ||
      req.user.role === 'superadmin' ||
      req.user.viewAccounting === true ||
      req.user.usePOS === true
    )
  );
}

function requireCollectionsAccess(req, res, next) {
  if (canManageCollections(req)) {
    return next();
  }

  return res.status(403).json({ error: 'No tienes permiso para gestionar cobros y deudas' });
}

// ============================================
// RUTAS OPERATIVAS (ESCRITURA)
// ============================================

router.post('/sale', auth, requirePermission('usePOS'), async (req, res) => {
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

router.post('/expense', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const expense = new Expense({ ...req.body, creadoPor: req.user.id });
    await expense.save();
    await updateCash('gasto', expense.monto, `Gasto: ${expense.descripcion}`, expense._id, 'Expense');
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

router.put('/customer-debt/:id/pay', auth, requireCollectionsAccess, async (req, res) => {
  try {
    const debt = await CustomerDebt.findById(req.params.id);
    if (!debt || debt.estado === 'pagado') return res.status(400).json({ error: 'Deuda no válida' });

    debt.estado = 'pagado';
    debt.fechaPago = new Date();
    await debt.save();

    const originalInvoice = await Income.findOne({ notas: new RegExp(debt._id.toString()) });
    if (originalInvoice) {
      originalInvoice.status = 'collected';
      originalInvoice.notas = [originalInvoice.notas, `Pagada: ${debt.fechaPago.toISOString()}`]
        .filter(Boolean)
        .join(' | ');
      await originalInvoice.save();
    }

    const incomeRecord = new Income({
      tipo: 'manual',
      monto: debt.monto,
      descripcion: `Cobro de deuda: ${debt.clienteNombre}`,
      metodo: req.body.metodo || 'efectivo',
      clienteNombre: debt.clienteNombre,
      creadoPor: req.user.id
    });
    await incomeRecord.save();
    await updateCash('ingreso', debt.monto, `Pago deuda: ${debt.clienteNombre}`, incomeRecord._id);
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al pagar deuda' });
  }
});

router.post('/customer-debt', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const debt = new CustomerDebt(req.body);
    await debt.save();
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar deuda' });
  }
});

router.post('/business-debt', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const debt = new BusinessDebt(req.body);
    await debt.save();
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar deuda' });
  }
});

router.put('/business-debt/:id/pay', auth, requirePermission('viewAccounting'), async (req, res) => {
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

router.get('/balance-general', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
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

router.get('/dashboard-stats', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const Product = mongoose.model('Product');

    const [statsHoy, statsDeudas, products] = await Promise.all([
      Income.aggregate([
        { $match: { fecha: { $gte: hoy }, esDeuda: false, status: 'completed' } }, 
        { $group: { _id: null, total: { $sum: "$monto" }, count: { $sum: 1 } } }
      ]),
      CustomerDebt.aggregate([
        { $match: { estado: 'pendiente' } }, 
        { $group: { _id: null, total: { $sum: "$monto" } } }
      ]),
      Product.find({ isActive: true })
    ]);

    let productosBajoStock = 0;
    products.forEach(p => {
      if (p.stockAlertDisabled === true) return;

      if (p.hasVariants) {
        const lowVariants = p.variants.filter(v => v.stockAlertDisabled !== true && v.stock <= (v.minStock || p.minStock || 5));
        productosBajoStock += lowVariants.length;
      } else {
        if (p.stock <= (p.minStock || 5)) {
          productosBajoStock++;
        }
      }
    });

    res.json({
      ventasHoy: statsHoy[0]?.count || 0,
      ingresosHoy: statsHoy[0]?.total || 0,
      deudasPendientes: statsDeudas[0]?.total || 0,
      productosBajoStock
    });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Error stats' }); 
  }
});

router.get('/report', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const { period = 'week', start, end } = req.query;
    let startDate;
    let endDate = new Date();
    
    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    const [incomes, expenses] = await Promise.all([
      Income.find({ fecha: { $gte: startDate, $lte: endDate }, status: 'completed' }).sort({ fecha: 1 }),
      Expense.find({ fecha: { $gte: startDate, $lte: endDate } }).sort({ fecha: 1 })
    ]);

    const dailyData = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyData[d.toISOString().split('T')[0]] = { income: 0, expense: 0, profit: 0 };
    }

    let totalIncomes = 0;
    incomes.forEach(i => {
      const d = i.fecha.toISOString().split('T')[0];
      if (dailyData[d]) {
        dailyData[d].income += i.monto;
        totalIncomes += i.monto;
      }
    });

    let totalExpenses = 0;
    const expenseCategories = {};
    expenses.forEach(e => {
      const d = e.fecha.toISOString().split('T')[0];
      if (dailyData[d]) {
        dailyData[d].expense += e.monto;
        totalExpenses += e.monto;
      }
      if (!expenseCategories[e.categoria]) {
        expenseCategories[e.categoria] = 0;
      }
      expenseCategories[e.categoria] += e.monto;
    });

    const dailyLabels = Object.keys(dailyData);
    const dailyIncomes = dailyLabels.map(d => dailyData[d].income);
    const dailyExpenses = dailyLabels.map(d => dailyData[d].expense);
    const dailyProfits = dailyLabels.map(d => dailyData[d].income - dailyData[d].expense);

    const expenseCategoriesList = Object.keys(expenseCategories).map(cat => ({
      categoria: cat,
      total: expenseCategories[cat]
    }));

    const transactions = [
      ...incomes.map(i => ({ fecha: i.fecha, tipo: 'ingreso', monto: i.monto, descripcion: i.descripcion, metodo: i.metodo })),
      ...expenses.map(e => ({ fecha: e.fecha, tipo: 'gasto', monto: e.monto, descripcion: e.descripcion, metodo: 'efectivo' }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      dailyLabels,
      dailyIncomes,
      dailyExpenses,
      dailyProfits,
      expenseCategories: expenseCategoriesList,
      totalIncomes,
      totalExpenses,
      netProfit: totalIncomes - totalExpenses,
      transactions
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

router.get('/dashboard', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const sem = new Date(); sem.setDate(sem.getDate() - 7);
    const mes = new Date(); mes.setMonth(mes.getMonth() - 1);
    const [vH, gH, vS, gS, vM, gM, dC, dN, movs, saldo] = await Promise.all([
      Income.find({ fecha: { $gte: hoy }, esDeuda: false, status: 'completed' }), Expense.find({ fecha: { $gte: hoy } }),
      Income.find({ fecha: { $gte: sem }, esDeuda: false, status: 'completed' }), Expense.find({ fecha: { $gte: sem } }),
      Income.find({ fecha: { $gte: mes }, esDeuda: false, status: 'completed' }), Expense.find({ fecha: { $gte: mes } }),
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

router.get('/incomes', auth, requireCollectionsAccess, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, page, limit } = req.query;
    const query = {};
    if (fechaInicio) query.fecha = { $gte: new Date(fechaInicio) };
    if (fechaFin) query.fecha = { ...query.fecha, $lte: new Date(fechaFin) };

    const shouldPaginate = page !== undefined || limit !== undefined;

    if (!shouldPaginate) {
      const incomes = await Income.find(query).sort({ fecha: -1 });
      return res.json(incomes);
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [incomes, total] = await Promise.all([
      Income.find(query)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Income.countDocuments(query)
    ]);

    res.json({
      incomes,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) { res.status(500).json({ error: 'Error incomes' }); }
});

router.get('/expenses', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const query = {};
    if (fechaInicio) query.fecha = { $gte: new Date(fechaInicio) };
    if (fechaFin) query.fecha = { ...query.fecha, $lte: new Date(fechaFin) };
    const expenses = await Expense.find(query).sort({ fecha: -1 });
    res.json(expenses);
  } catch (error) { res.status(500).json({ error: 'Error expenses' }); }
});

router.get('/customer-debts', auth, requireCollectionsAccess, async (req, res) => {
  try {
    const debts = await CustomerDebt.find({ estado: 'pendiente' }).sort({ fecha: -1 });
    res.json(debts);
  } catch (error) { res.status(500).json({ error: 'Error debts' }); }
});

router.post('/cash-closing', auth, requirePermission('performCashClosing'), async (req, res) => {
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

router.get('/cash-closings', auth, requirePermission('viewAccounting'), async (req, res) => {
  try {
    const closings = await CashClosing.find().populate('cajeroId', 'name').sort({ fecha: -1 }).limit(30);
    res.json(closings);
  } catch (error) { res.status(500).json({ error: 'Error history' }); }
});

module.exports = router;
