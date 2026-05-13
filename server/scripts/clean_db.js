require("dotenv").config({ path: __dirname + '/../.env' });
const mongoose = require("mongoose");

// Importar Modelos
const Product = require("../modules/inventory/models/Product");
const Category = require("../modules/inventory/models/Category");
const Brand = require("../modules/inventory/models/Brand");
const Supplier = require("../modules/inventory/models/Supplier");
const StockMovement = require("../modules/inventory/models/StockMovement");
const Sale = require("../modules/pos/models/Sale");
const Income = require("../modules/accounting/models/Income");
const Expense = require("../modules/accounting/models/Expense");
const CashMovement = require("../modules/accounting/models/CashMovement");
const CashClosing = require("../modules/accounting/models/CashClosing");
const CustomerDebt = require("../modules/accounting/models/CustomerDebt");
const BusinessDebt = require("../modules/accounting/models/BusinessDebt");
const AuditLog = require("../modules/core/models/AuditLog");

// (Opcional) Si deseas borrar los usuarios también, descomenta las siguientes líneas:
// const User = require("../modules/login/models/User");

async function cleanData() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Error: No se encontró MONGO_URI en el archivo .env");
      process.exit(1);
    }

    console.log("🔄 Conectando a MongoDB para limpiar la base de datos...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conexión establecida.");

    console.log("⚠️ ¡ADVERTENCIA! Estás a punto de vaciar la base de datos.");
    console.log("🧹 Limpiando colecciones principales...");

    // Se eliminan todos los documentos de las colecciones seleccionadas
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
      BusinessDebt.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // Si descomentaste la importación de User arriba, puedes borrar los usuarios así:
    // console.log("🧹 Limpiando Usuarios...");
    // await User.deleteMany({});

    console.log("✨ Base de datos limpiada con éxito.");
    console.log("Los usuarios NO han sido borrados (para no perder acceso). Si deseas borrarlos, edita este script.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error);
    process.exit(1);
  }
}

cleanData();
