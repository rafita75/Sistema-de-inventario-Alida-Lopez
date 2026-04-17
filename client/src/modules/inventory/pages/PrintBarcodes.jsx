// client/src/modules/inventory/pages/PrintBarcodes.jsx
import React, { useState, useEffect } from 'react';
import { getAdminProducts } from '../../../shared/services/productService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import Barcode from 'react-barcode';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export default function PrintBarcodes() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [printList, setPrintList] = useState([]); 

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const data = await getAdminProducts({ limit: 10, search: search });
        setProducts(data.products || []);
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

  const addToPrintList = (product) => {
    const code = product.barcode;
    if (!code) {
      alert('Este producto no tiene código de barras.');
      return;
    }
    
    const exists = printList.find(item => item.id === product._id);
    if (exists) {
      setPrintList(printList.map(item => 
        item.id === product._id ? { ...item, copies: item.copies + 1 } : item
      ));
    } else {
      setPrintList([...printList, { 
        id: product._id, 
        name: product.name, 
        barcode: code, 
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

  // Función mágica para convertir código en imagen
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
      // Generar la imagen de las barras una vez por producto
      const barcodeImg = getBarcodeDataURL(item.barcode);

      for (let i = 0; i < item.copies; i++) {
        if (y + itemHeight > 280) {
          doc.addPage();
          x = 10; y = 15; count = 0;
        }

        // Nombre del producto arriba
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(item.name.substring(0, 28), x + 2, y + 2);
        
        // Insertar la IMAGEN de las barras
        doc.addImage(barcodeImg, 'PNG', x + 2, y + 4, 40, 20);
        
        // Texto de pie
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text("Librería A&C", x + 15, y + 27);

        // Dibujar borde punteado suave para corte
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
          className="bg-green-600 w-full sm:w-auto shadow-lg"
        >
          📄 Descargar PDF de Barras ({printList.reduce((sum, i) => sum + i.copies, 0)})
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Buscador */}
        <div className="lg:col-span-4">
          <Card className="p-4 shadow-sm border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">1. Buscar productos</label>
            <Input 
              placeholder="Nombre o código..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-green-500"
            />
            
            <div className="mt-4 space-y-2 max-h-[450px] overflow-auto pr-1">
              {loading && <div className="text-center py-4 text-gray-400 animate-pulse">Buscando...</div>}
              {products.map(p => (
                <div 
                  key={p._id} 
                  onClick={() => addToPrintList(p)}
                  className="p-3 border border-gray-100 rounded-xl hover:bg-green-50 hover:border-green-200 cursor-pointer flex justify-between items-center group transition-all"
                >
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-green-600 font-mono">{p.barcode}</p>
                  </div>
                  <div className="bg-green-600 text-white w-6 h-6 rounded-lg flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity">+</div>
                </div>
              ))}
              {products.length === 0 && !loading && search && (
                <div className="text-center py-10 text-gray-400 text-sm">No se encontraron productos</div>
              )}
            </div>
          </Card>
        </div>

        {/* Lista */}
        <div className="lg:col-span-8">
          <Card className="p-4 min-h-[500px] shadow-sm border-gray-100 bg-gray-50/30">
            <label className="block text-sm font-bold text-gray-700 mb-4">2. Etiquetas seleccionadas</label>
            
            {printList.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <div className="text-6xl mb-4">🏷️</div>
                <p className="text-lg">Tu lista de impresión está vacía</p>
                <p className="text-sm">Añade productos desde el buscador de la izquierda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printList.map(item => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.barcode}</p>
                      </div>
                      <button 
                        onClick={() => removeFromList(item.id)} 
                        className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex justify-center bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200 mb-3">
                      <Barcode 
                        value={item.barcode} 
                        width={1.2} 
                        height={40} 
                        fontSize={12}
                        background="transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-xl shadow-inner">
                      <span className="text-xs text-gray-500 font-bold ml-2">COPIAS:</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateCopies(item.id, -1)} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-xl font-bold">-</button>
                        <span className="font-black text-xl w-6 text-center">{item.copies}</span>
                        <button onClick={() => updateCopies(item.id, 1)} className="w-9 h-9 bg-gray-800 text-white hover:bg-black rounded-lg flex items-center justify-center text-xl font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
