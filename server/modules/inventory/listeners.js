// server/modules/inventory/listeners.js
const eventBus = require('../../shared/events');
const EVENTS = require('../../shared/events.types');
const Product = require('./models/Product');
const StockMovement = require('./models/StockMovement');

/**
 * Configurar todos los listeners del módulo Inventory
 */
function setupInventoryListeners() {
  
  // ============================================
  // ESCUCHAR VENTAS CREADAS (desde POS o Ecommerce)
  // ============================================
  eventBus.on(EVENTS.SALE_CREATED, async (data) => {
    if (data.skipInventoryUpdate) {
      console.log(`ℹ️ Inventory: Saltando actualización de stock para venta ${data.saleNumber} (ya procesada en transacción)`);
      return;
    }
    console.log(`📦 Inventory recibió venta: ${data.saleNumber}`);
    
    const movements = [];
    
    for (const item of data.items) {
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          const product = await Product.findById(item.productId);
          
          if (!product) {
            console.error(`❌ Producto no encontrado: ${item.productId}`);
            break;
          }
          
          let previousStock, newStock;
          let productName = product.name;
          
          // Si tiene variante
          if (item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (!variant) {
              console.error(`❌ Variante no encontrada: ${item.variantId}`);
              break;
            }
            
            previousStock = variant.stock;
            newStock = previousStock - item.quantity;
            variant.stock = newStock;
            productName = `${product.name} - ${variant.name}`;
            
            // Actualizar stock total del producto
            const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
            product.stock = totalStock;
          } else {
            // Producto normal
            previousStock = product.stock;
            newStock = previousStock - item.quantity;
            product.stock = newStock;
          }
          
          await product.save();
          success = true;
          
          // Registrar movimiento de stock
          const movement = new StockMovement({
            productId: product._id,
            productName: productName,
            type: 'sale',
            quantity: -item.quantity,
            previousStock,
            newStock,
            reason: `Venta #${data.saleNumber} - ${data.clienteNombre || 'Mostrador'}`,
            userId: data.createdBy,
            saleId: data.saleId
          });
          await movement.save();
          movements.push(movement);
          
          console.log(`✅ Stock actualizado: ${productName} (${previousStock} → ${newStock})`);
          
          // Verificar si hay stock bajo
          const minStock = product.minStock || 5;
          if (newStock <= minStock) {
            eventBus.emitSync(EVENTS.LOW_STOCK_ALERT, {
              productId: product._id,
              productName: product.name,
              variantName: item.variantId ? variant.name : null,
              stock: newStock,
              minStock
            });
          }
          
        } catch (error) {
          if (error.name === 'VersionError') {
            retries--;
            console.warn(`⚠️ Conflicto de concurrencia en ${item.name}. Reintentando... (${3 - retries}/3)`);
            if (retries === 0) {
              console.error(`❌ Falló actualización de stock para ${item.name} tras 3 reintentos.`);
            }
          } else {
            console.error(`❌ Error procesando item ${item.name}:`, error);
            break; 
          }
        }
      }
    }
    
    console.log(`✅ Inventory procesó ${movements.length} movimientos para venta #${data.saleNumber}`);
  });

  // ============================================
  // ESCUCHAR REPOSICIÓN DE STOCK (desde Inventory Manager)
  // ============================================
  eventBus.on(EVENTS.STOCK_ADJUSTED, async (data) => {
    console.log(`📦 Inventory recibió ajuste de stock: ${data.productName}`);
    
  });
  
  console.log('✅ Inventory listeners configurados');
}

module.exports = { setupInventoryListeners };
