// client/src/modules/admin/pages/InvoicesManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { jsPDF } from 'jspdf';

export default function InvoicesManager() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today'); 
  const [dates, setDates] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    loadInvoices();
  }, [filter, dates]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      const today = new Date();
      
      if (filter === 'today') {
        today.setHours(0,0,0,0);
        params.fechaInicio = today.toISOString();
      } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        params.fechaInicio = weekAgo.toISOString();
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        params.fechaInicio = monthAgo.toISOString();
      }

      if (dates.start) params.fechaInicio = new Date(dates.start).toISOString();
      if (dates.end) {
        const endD = new Date(dates.end);
        endD.setHours(23,59,59,999);
        params.fechaFin = endD.toISOString();
      }

      const { data } = await api.get('/accounting/incomes', { params });
      setInvoices(data.filter(i => i.tipo === 'venta_pos' || i.items?.length > 0));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i._id));
    }
  };

  const generateTicket = (invoice) => {
    // Calcular alto dinámico: Base 60mm + 10mm por cada item
    const itemsCount = invoice.items?.length || 1;
    const dynamicHeight = 70 + (itemsCount * 7);

    const doc = jsPDF({
      unit: 'mm',
      format: [80, dynamicHeight] 
    });

    drawTicket(doc, invoice);
    window.open(doc.output('bloburl'), '_blank');
  };

  const drawTicket = (doc, invoice, startY = 10) => {
    const xCenter = 40;
    let y = startY;

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("LIBRERÍA A&C", xCenter, y, { align: 'center' });
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Venta de Útiles y Más", xCenter, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`FACTURA: #${invoice.invoiceNumber || 'Manual'}`, 5, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(invoice.fecha).toLocaleString()}`, 5, y);
    y += 5;
    doc.text(`Cliente: ${invoice.clienteNombre || 'Mostrador'}`, 5, y);
    y += 6;

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Cant", 5, y);
    doc.text("Descripción", 15, y);
    doc.text("Total", 75, y, { align: 'right' });
    y += 5;
    doc.setFont("helvetica", "normal");

    invoice.items?.forEach(item => {
      doc.text(item.quantity.toString(), 7, y, { align: 'center' });
      const name = item.name.substring(0, 24);
      doc.text(name, 15, y);
      doc.text(`Q${(item.price * item.quantity).toLocaleString()}`, 75, y, { align: 'right' });
      y += 5;
    });

    y += 2;
    doc.line(5, y, 75, y);
    y += 6;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 40, y, { align: 'right' });
    doc.text(`Q${invoice.monto.toLocaleString()}`, 75, y, { align: 'right' });
    
    y += 8;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("¡Gracias por preferirnos!", xCenter, y, { align: 'center' });
    
    return y;
  };

  const printSelected = () => {
    if (selectedIds.length === 0) return alert('Selecciona al menos una factura');
    
    const toPrint = invoices.filter(i => selectedIds.includes(i._id));
    
    // Calcular el alto de la PRIMERA factura para inicializar el documento correctamente
    const firstInvoice = toPrint[0];
    const firstItemsCount = firstInvoice.items?.length || 1;
    const firstHeight = 70 + (firstItemsCount * 7);

    const doc = jsPDF({ 
      unit: 'mm', 
      format: [80, firstHeight] 
    });

    toPrint.forEach((inv, index) => {
      const itemsCount = inv.items?.length || 1;
      const h = 70 + (itemsCount * 7);
      
      if (index > 0) {
        doc.addPage([80, h]);
      }
      
      drawTicket(doc, inv, 10);
    });

    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🧾 Historial de Facturas
        </h2>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant="primary" 
            onClick={printSelected} 
            disabled={selectedIds.length === 0}
            className="bg-blue-600 shadow-md"
          >
            🖨️ Imprimir Seleccionadas ({selectedIds.length})
          </Button>
          
          <div className="flex bg-white rounded-xl shadow-sm border p-1">
            {['today', 'week', 'month', 'custom'].map(t => (
              <button 
                key={t}
                onClick={() => setFilter(t)} 
                className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-all ${filter === t ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {t === 'custom' ? 'Rango' : t === 'today' ? 'Hoy' : t === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="p-4 bg-gray-50/50 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            placeholder="🔍 Buscar por cliente o factura..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="!mb-0 bg-white"
          />
          {filter === 'custom' && (
            <>
              <Input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} className="!mb-0 bg-white" />
              <Input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} className="!mb-0 bg-white" />
            </>
          )}
        </div>
      </Card>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-green-600 cursor-pointer"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Factura</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="7" className="p-12 text-center text-gray-400 animate-pulse">Cargando facturas...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center text-gray-400">No se encontraron resultados</td></tr>
              ) : filteredInvoices.map(inv => (
                <tr key={inv._id} className={`hover:bg-green-50/30 transition-colors ${selectedIds.includes(inv._id) ? 'bg-green-50' : ''}`}>
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-green-600 cursor-pointer"
                      checked={selectedIds.includes(inv._id)}
                      onChange={() => toggleSelect(inv._id)}
                    />
                  </td>
                  <td className="p-4 font-mono font-bold text-green-700">#{inv.invoiceNumber || 'MANUAL'}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {new Date(inv.fecha).toLocaleDateString()}
                    <span className="text-[10px] block opacity-60">{new Date(inv.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-800">{inv.clienteNombre || 'Mostrador'}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{inv.metodo}</p>
                  </td>
                  <td className="p-4 text-right font-black text-gray-900 text-base">Q{inv.monto.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                      inv.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      inv.status === 'debt' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status === 'completed' ? 'PAGADA' : inv.status === 'debt' ? 'DEUDA' : 'ANULADA'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => {
                        const doc = jsPDF({ unit: 'mm', format: [80, 200] });
                        drawTicket(doc, inv);
                        window.open(doc.output('bloburl'), '_blank');
                      }}
                      className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-green-600 hover:text-white hover:shadow-lg transition-all"
                    >
                      🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
