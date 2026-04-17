// server/shared/events.types.js
// Catálogo central de eventos del sistema

const EVENTS = {
    // ============================================
    // EVENTOS DE VENTAS (POS y ECOMMERCE)
    // ============================================
    /** 
     * Venta completada en POS o Ecommerce
     * @data { saleId, saleNumber, items, total, paymentMethod, clienteNombre, clienteTelefono, esDeuda, createdBy, createdAt }
     */
    SALE_CREATED: 'sale.created',
  
    /** 
     * Venta pagada (cuando una deuda se paga)
     * @data { debtId, saleId, monto, clienteNombre, metodo }
     */
    SALE_PAID: 'sale.paid',
  
    // ============================================
    // EVENTOS DE INVENTARIO
    // ============================================
    /** 
     * Stock ajustado (reposición o venta)
     * @data { productId, variantId, quantity, previousStock, newStock, reason, userId }
     */
    STOCK_ADJUSTED: 'stock.adjusted',
  
    /** 
     * Producto con stock bajo
     * @data { productId, productName, stock, minStock }
     */
    LOW_STOCK_ALERT: 'stock.low',
  
    // ============================================
    // EVENTOS DE PRODUCTOS
    // ============================================
    /** 
     * Producto creado o actualizado
     * @data { productId, name, price, stock, hasVariants }
     */
    PRODUCT_CHANGED: 'product.changed',
  
    // ============================================
    // EVENTOS DE CONTABILIDAD
    // ============================================
    /** 
     * Gasto registrado
     * @data { expenseId, monto, categoria, descripcion, creadoPor }
     */
    EXPENSE_CREATED: 'expense.created',
  
    /** 
     * Deuda de cliente registrada
     * @data { debtId, clienteNombre, monto, fecha }
     */
    DEBT_CREATED: 'debt.created',
  
    /** 
     * Deuda pagada
     * @data { debtId, clienteNombre, monto, fechaPago }
     */
    DEBT_PAID: 'debt.paid'
  };
  
  module.exports = EVENTS;