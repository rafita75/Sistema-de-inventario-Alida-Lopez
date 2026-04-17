// client/src/components/accounting/ReportsModal.jsx
import { useState, useEffect, useRef } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import api from '../../../../shared/services/api';
import Button from '../../../core/components/UI/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [filterType, setFilterType] = useState('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, filterType, customStart, customEnd]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let url = '/accounting/report';
      if (filterType === 'week') {
        url += '?period=week';
      } else if (filterType === 'month') {
        url += '?period=month';
      } else if (filterType === 'custom' && customStart && customEnd) {
        url += `?start=${customStart}&end=${customEnd}`;
      }
      
      const { data } = await api.get(url);
      setReportData(data);
    } catch (error) {
      console.error('Error cargando reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    try {
      const element = reportRef.current;
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`reporte_${new Date().toISOString().split('T')[0]}.pdf`);
      
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
    } catch (error) {
      console.error('Error generando PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Ingresos vs Gastos por día', font: { size: 14 } }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Ganancia diaria', font: { size: 14 } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Distribución de gastos por categoría', font: { size: 14 } }
    }
  };

  const barChartData = {
    labels: reportData?.dailyLabels || [],
    datasets: [
      {
        label: 'Ingresos',
        data: reportData?.dailyIncomes || [],
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        label: 'Gastos',
        data: reportData?.dailyExpenses || [],
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 8
      }
    ]
  };

  const lineChartData = {
    labels: reportData?.dailyLabels || [],
    datasets: [
      {
        label: 'Ganancia diaria',
        data: reportData?.dailyProfits || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3
      }
    ]
  };

  const pieChartData = {
    labels: reportData?.expenseCategories?.map(c => {
      const labels = {
        insumos: '📦 Insumos',
        servicios: '💡 Servicios',
        renta: '🏠 Renta',
        sueldos: '👥 Sueldos',
        publicidad: '📢 Publicidad',
        transporte: '🚚 Transporte',
        otros: '📝 Otros'
      };
      return labels[c.categoria] || c.categoria;
    }) || [],
    datasets: [
      {
        data: reportData?.expenseCategories?.map(c => c.total) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }
    ]
  };

  const getPeriodText = () => {
    if (filterType === 'week') return 'Esta semana';
    if (filterType === 'month') return 'Este mes';
    if (filterType === 'custom' && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`;
    }
    return 'Últimos 30 días';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto shadow-hard">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span> Reportes y estadísticas
          </h2>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={exportToPDF}
              disabled={exporting || loading}
              loading={exporting}
            >
              🖨️ Exportar PDF
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
          <Button
            variant={filterType === 'week' ? 'primary' : 'ghost'}
            onClick={() => setFilterType('week')}
            size="sm"
          >
            📅 Esta semana
          </Button>
          <Button
            variant={filterType === 'month' ? 'primary' : 'ghost'}
            onClick={() => setFilterType('month')}
            size="sm"
          >
            📆 Este mes
          </Button>
          <Button
            variant={filterType === 'custom' ? 'primary' : 'ghost'}
            onClick={() => setFilterType('custom')}
            size="sm"
          >
            📅 Personalizado
          </Button>
          
          {filterType === 'custom' && (
            <div className="flex gap-2 items-center ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button
                variant="success"
                size="sm"
                onClick={loadReport}
              >
                Aplicar
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-500">Cargando reportes...</p>
          </div>
        ) : (
          <div ref={reportRef} className="bg-white" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Header */}
            <div className="text-center mb-8 border-b pb-4">
              <h1 className="text-3xl font-bold text-gray-800">📊 Reporte de Contabilidad</h1>
              <p className="text-gray-500 mt-2">Período: {getPeriodText()}</p>
              <p className="text-gray-400 text-sm mt-1">Generado el {new Date().toLocaleString()}</p>
            </div>

            {/* Resumen numérico con tarjetas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-2">💰</div>
                <p className="text-sm text-gray-500">Total ingresos</p>
                <p className="text-2xl font-bold text-green-600">Q{reportData?.totalIncomes?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-2">💸</div>
                <p className="text-sm text-gray-500">Total gastos</p>
                <p className="text-2xl font-bold text-red-600">Q{reportData?.totalExpenses?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-2">📈</div>
                <p className="text-sm text-gray-500">Ganancia neta</p>
                <p className={`text-2xl font-bold ${reportData?.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Q{reportData?.netProfit?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl text-center shadow-sm">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm text-gray-500">Transacciones</p>
                <p className="text-2xl font-bold text-purple-600">{reportData?.transactions?.length || 0}</p>
              </div>
            </div>

            {/* Gráficas */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="h-72">
                  <Bar data={barChartData} options={barOptions} />
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="h-72">
                  <Line data={lineChartData} options={lineOptions} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="h-72">
                  {pieChartData.labels.length > 0 ? (
                    <Pie data={pieChartData} options={pieOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No hay datos de gastos por categoría
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span>📊</span> Resumen por categoría de gastos
                </h3>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {reportData?.expenseCategories?.map((cat, idx) => {
                    const percent = (cat.total / reportData.totalExpenses * 100).toFixed(1);
                    const labels = {
                      insumos: '📦 Insumos',
                      servicios: '💡 Servicios',
                      renta: '🏠 Renta',
                      sueldos: '👥 Sueldos',
                      publicidad: '📢 Publicidad',
                      transporte: '🚚 Transporte',
                      otros: '📝 Otros'
                    };
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{labels[cat.categoria] || cat.categoria}</span>
                          <span className="font-semibold">Q{cat.total.toLocaleString()} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tabla de transacciones */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <h3 className="font-semibold text-lg p-4 bg-gray-50 border-b flex items-center gap-2">
                <span>📋</span> Detalle de transacciones
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Descripción</th>
                      <th className="p-3 text-right">Monto</th>
                      <th className="p-3 text-left">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.transactions?.slice(0, 20).map((t, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3">{new Date(t.fecha).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td className="p-3">{t.descripcion}</td>
                        <td className="p-3 text-right font-mono font-medium">Q{t.monto.toLocaleString()}</td>
                        <td className="p-3">{t.metodo === 'efectivo' ? '💵 Efectivo' : t.metodo === 'transferencia' ? '🏦 Transferencia' : t.metodo === 'tarjeta' ? '💳 Tarjeta' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData?.transactions?.length > 20 && (
                  <p className="text-center text-gray-400 text-sm py-3">
                    Mostrando 20 de {reportData.transactions.length} transacciones
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-400 text-xs mt-8 pt-4 border-t">
              Reporte generado automáticamente por el sistema de contabilidad
            </div>
          </div>
        )}
      </div>
    </div>
  );
}