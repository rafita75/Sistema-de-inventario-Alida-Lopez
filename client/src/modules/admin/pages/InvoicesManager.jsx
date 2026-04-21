// client/src/modules/admin/pages/InvoicesManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { jsPDF } from 'jspdf';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import { TableSkeleton } from '../../core/components/UI/Skeleton';

export default function InvoicesManager() {
  const { notify } = useNotification();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today'); 
  const [dates, setDates] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadInvoices();
  }, [filter, dates, currentPage]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 15 };
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
      
      if (data.incomes) {
        setInvoices(data.incomes);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setInvoices(data);
      }
    } catch (error) {
      console.error(error);
      notify('Error al cargar facturas', 'error');
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

  const drawTicket = (doc, invoice, startY = 10) => {
    const xCenter = 40;
    let y = startY;

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
    if (selectedIds.length === 0) return notify('Selecciona al menos una factura', 'warning');
    
    const toPrint = invoices.filter(i => selectedIds.includes(i._id));
    const firstInvoice = toPrint[0];
    const firstItemsCount = firstInvoice.items?.length || 1;
    const firstHeight = 70 + (firstItemsCount * 7);

    const doc = jsPDF({ unit: 'mm', format: [80, firstHeight] });

    toPrint.forEach((inv, index) => {
      const itemsCount = inv.items?.length || 1;
      const h = 70 + (itemsCount * 7);
      if (index > 0) doc.addPage([80, h]);
      drawTicket(doc, inv, 10);
    });

    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🧾 Historial de Facturas ({totalItems})
        </h2>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <Button 
            variant="primary" 
            onClick={printSelected} 
            disabled={selectedIds.length === 0}
            className="flex-1 lg:flex-none bg-blue-600 shadow-md"
          >
            🖨️ Imprimir ({selectedIds.length})
          </Button>
          
          <div className="flex bg-white rounded-xl shadow-sm border p-1 w-full lg:w-auto overflow-x-auto">
            {['today', 'week', 'month', 'custom'].map(t => (
              <button 
                key={t}
                onClick={() => { setFilter(t); setCurrentPage(1); }} 
                className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${filter === t ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
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
            placeholder="🔍 Buscar cliente o factura..." 
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

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8"><TableSkeleton rows={5} cols={7} /></div>
        ) : (
          <>
            {/* Vista Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-6 w-10">
                      <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer" checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleSelectAll} />
                    </th>
                    <th className="p-6">Factura</th>
                    <th className="p-6">Fecha</th>
                    <th className="p-6">Cliente</th>
                    <th className="p-6 text-right">Monto</th>
                    <th className="p-6 text-center">Estado</th>
                    <th className="p-6 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInvoices.map(inv => (
                    <tr key={inv._id} className={`hover:bg-green-50/30 transition-colors ${selectedIds.includes(inv._id) ? 'bg-green-50' : ''}`}>
                      <td className="p-6">
                        <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer" checked={selectedIds.includes(inv._id)} onChange={() => toggleSelect(inv._id)} />
                      </td>
                      <td className="p-6 font-mono font-bold text-green-700">#{inv.invoiceNumber || 'MANUAL'}</td>
                      <td className="p-6 text-gray-500 whitespace-nowrap text-xs font-medium">
                        {new Date(inv.fecha).toLocaleDateString()}
                        <span className="text-[10px] block opacity-40 font-bold">{new Date(inv.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="p-6">
                        <p className="font-bold text-gray-800">{inv.clienteNombre || 'Mostrador'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{inv.metodo}</p>
                      </td>
                      <td className="p-6 text-right font-black text-gray-900 text-base">Q{inv.monto.toLocaleString()}</td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${inv.status === 'completed' ? 'bg-green-100 text-green-700' : inv.status === 'debt' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {inv.status === 'completed' ? 'PAGADA' : inv.status === 'debt' ? 'DEUDA' : 'ANULADA'}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <button onClick={() => { const doc = jsPDF({ unit: 'mm', format: [80, 200] }); drawTicket(doc, inv); window.open(doc.output('bloburl'), '_blank'); }} className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-green-600 hover:text-white transition-all">🖨️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil con Scroll */}
            <div className="md:hidden">
               <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 p-4 scrollbar-hide">
                 {filteredInvoices.map(inv => (
                   <Card key={inv._id} className="p-5 border-l-4 border-l-blue-500 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-green-700 text-xs">#{inv.invoiceNumber || 'MANUAL'}</p>
                          <p className="text-[10px] font-bold text-gray-400">{new Date(inv.fecha).toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${inv.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {inv.status === 'completed' ? 'PAGADA' : 'DEUDA'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                           <p className="font-bold text-gray-800 text-sm">{inv.clienteNombre || 'Mostrador'}</p>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{inv.metodo}</p>
                        </div>
                        <p className="font-black text-gray-900 text-lg leading-none">Q{inv.monto.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                        <Button size="sm" variant="outline" onClick={() => { const doc = jsPDF({ unit: 'mm', format: [80, 200] }); drawTicket(doc, inv); window.open(doc.output('bloburl'), '_blank'); }} className="flex-1 rounded-xl font-black text-[9px]">IMPRIMIR TICKET</Button>
                        <div className="flex items-center px-2">
                           <input type="checkbox" className="w-6 h-6 accent-green-600" checked={selectedIds.includes(inv._id)} onChange={() => toggleSelect(inv._id)} />
                        </div>
                      </div>
                   </Card>
                 ))}
               </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 p-6 border-t border-gray-100">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="rounded-xl font-black text-[10px]">← ANT.</Button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pág {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="rounded-xl font-black text-[10px]">SIG. →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
