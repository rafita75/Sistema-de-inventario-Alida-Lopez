// client/src/modules/inventory/pages/PrintBarcodes.jsx
import React, { useState, useEffect } from 'react';
import { getAdminProducts } from '../../../shared/services/productService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { useNotification } from '../../../shared/contexts/NotificationContext';

export default function PrintBarcodes() {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [printList, setPrintList] = useState([]); 

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const data = await getAdminProducts({ limit: 50, search: search });
        // Expandir variantes para que aparezcan como items individuales en la búsqueda
        const expandedItems = [];
        (data.products || data).forEach(p => {
          if (p.hasVariants && p.variants?.length > 0) {
            p.variants.forEach(v => {
              expandedItems.push({
                _id: v._id,
                productId: p._id,
                name: `${p.name} - ${v.name}`,
                barcode: v.barcode,
                sku: v.sku,
                isVariant: true
              });
            });
          } else {
            expandedItems.push({
              _id: p._id,
              name: p.name,
              barcode: p.barcode,
              sku: p.sku,
              isVariant: false
            });
          }
        });
        setProducts(expandedItems);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchInitial();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const addToPrintList = (item) => {
    if (!item.barcode) {
      notify('Este item no tiene código de barras.', 'warning');
      return;
    }
    
    const exists = printList.find(i => i.id === item._id);
    if (exists) {
      setPrintList(printList.map(i => 
        i.id === item._id ? { ...i, copies: i.copies + 1 } : i
      ));
    } else {
      setPrintList([...printList, { 
        id: item._id, 
        name: item.name, 
        barcode: item.barcode, 
        copies: 1 
      }]);
    }
  };

  const removeFromList = (id) => {
    setPrintList(printList.filter(item => item.id !== id));
  };

  const updateCopies = (id, delta) => {
    setPrintList(printList.map(item => {
      if (item.id === id) {
        const newCopies = Math.max(1, item.copies + delta);
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  const getBarcodeDataURL = (text) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true
    });
    return canvas.toDataURL("image/png");
  };

  const generatePDF = () => {
    if (printList.length === 0) return;

    const doc = jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let x = 10;
    let y = 15;
    const itemWidth = 45;
    const itemHeight = 35;
    const itemsPerRow = 4;
    let count = 0;

    printList.forEach((item) => {
      const barcodeImg = getBarcodeDataURL(item.barcode);

      for (let i = 0; i < item.copies; i++) {
        if (y + itemHeight > 280) {
          doc.addPage();
          x = 10; y = 15; count = 0;
        }

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(item.name.substring(0, 28), x + 2, y + 2);
        doc.addImage(barcodeImg, 'PNG', x + 2, y + 4, 40, 20);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text("Librería A&C", x + 15, y + 27);
        doc.setDrawColor(230);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(x, y - 3, itemWidth, itemHeight);

        count++;
        if (count % itemsPerRow === 0) {
          x = 10;
          y += itemHeight + 5;
        } else {
          x += itemWidth + 2;
        }
      }
    });

    doc.save(`etiquetas_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🖨️ Impresión de Etiquetas
        </h2>
        <Button 
          variant="primary" 
          onClick={generatePDF}
          disabled={printList.length === 0}
          className="bg-green-600 shadow-lg shadow-green-100"
        >
          📥 Descargar PDF ({printList.reduce((sum, i) => sum + i.copies, 0)} etiquetas)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector de productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <Input
              placeholder="Buscar producto o variante por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="🔍"
            />
            
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 text-left">Producto / Variante</th>
                      <th className="p-3 text-left">Código</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan="3" className="p-8 text-center text-gray-400">Buscando...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-gray-400">No se encontraron resultados</td></tr>
                    ) : (
                      products.map(p => (
                        <tr key={p._id} className="hover:bg-green-50/30 transition-colors">
                          <td className="p-3 font-medium text-gray-700">
                            {p.name}
                            {p.isVariant && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">Variante</span>}
                          </td>
                          <td className="p-3 text-gray-500 font-mono text-xs">{p.barcode}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => addToPrintList(p)}
                              className="text-green-600 hover:text-green-700 font-bold p-2 bg-green-50 rounded-lg"
                            >
                              ➕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de impresión */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest px-2 flex justify-between">
            📋 Cola de impresión
            <span className="text-green-600">{printList.length} items</span>
          </h3>
          
          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {printList.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
                Agrega productos de la lista de la izquierda para comenzar
              </div>
            ) : (
              printList.map(item => (
                <Card key={item.id} className="p-3 animate-fade-in">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                    <button onClick={() => removeFromList(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400">{item.barcode}</span>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1">
                      <button onClick={() => updateCopies(item.id, -1)} className="text-green-600 font-bold">−</button>
                      <span className="font-bold text-sm min-w-[20px] text-center">{item.copies}</span>
                      <button onClick={() => updateCopies(item.id, 1)} className="text-green-600 font-bold">＋</button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
