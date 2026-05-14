// server/modules/ecommerce/models/Product.js
const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  sku: { type: String, default: '' },
  barcode: { type: String, default: '' },
  image: { type: String, default: '' },
  stockAlertDisabled: { type: Boolean, default: false },
  stockAlertDisabledAt: { type: Date, default: null }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, lowercase: true, trim: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  purchasePrice: { type: Number, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, default: 0, min: 0 },
  sku: { type: String, default: '' },
  barcode: { type: String, trim: true },
  stock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  hasVariants: { type: Boolean, default: false },
  variants: [VariantSchema],
  images: [{ url: String, alt: String, order: Number }],
  thumbnail: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  disabledAt: { type: Date, default: null },
  stockAlertDisabled: { type: Boolean, default: false },
  stockAlertDisabledAt: { type: Date, default: null },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // Deshabilitar índices automáticos
  autoIndex: false,
  optimisticConcurrency: true
});

function generateSlug(name) {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  slug = slug.replace(/-+/g, '-');
  return slug;
}

// ============================================
// MIDDLEWARE pre('save')
// ============================================
ProductSchema.pre('save', async function() {
  // Generar slug
  if (this.isNew || this.isModified('name')) {
    this.slug = generateSlug(this.name);
  }
  
  // Generar SKU solo si es nuevo producto
  if (this.isNew && !this.sku) {
    const year = new Date().getFullYear();
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();
    this.sku = `SKU-${year}-${timePart}-${randomPart}`;
  }

  // GENERAR CÓDIGO DE BARRAS NUMÉRICO AUTOMÁTICO si no existe
  if (this.isNew && !this.barcode) {
    // Generar un código de 12 dígitos (estilo UPC/EAN base)
    // Usamos timestamp (últimos 8) + 4 aleatorios
    const timestampPart = Date.now().toString().slice(-8);
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    this.barcode = timestampPart + randomPart;
  }
  
  // Generar SKU para variantes nuevas
  if (this.hasVariants && this.variants && this.variants.length > 0 && this.sku) {
    const usedSkus = new Set(
      this.variants
        .map((variant) => variant.sku)
        .filter(Boolean)
    );
    let variantIndex = 1;

    for (let i = 0; i < this.variants.length; i++) {
      const variant = this.variants[i];
      if (!variant.sku) {
        let nextSku;
        do {
          nextSku = `${this.sku}-${String(variantIndex).padStart(2, '0')}`;
          variantIndex++;
        } while (usedSkus.has(nextSku));

        variant.sku = nextSku;
        usedSkus.add(nextSku);
      }
      // También generar código de barras para variantes si no tienen
      if (!variant.barcode) {
        const vTimestamp = Date.now().toString().slice(-7);
        const vRandom = Math.floor(10000 + Math.random() * 90000).toString();
        variant.barcode = vTimestamp + vRandom;
      }
    }
  }
  
  this.updatedAt = Date.now();
});

// ÍNDICE DE TEXTO PARA BÚSQUEDAS RÁPIDAS
ProductSchema.index({ 
  name: 'text', 
  sku: 'text', 
  barcode: 'text' 
}, {
  weights: {
    name: 10,
    sku: 5,
    barcode: 5
  },
  name: "ProductTextIndex"
});

module.exports = mongoose.model('Product', ProductSchema);
