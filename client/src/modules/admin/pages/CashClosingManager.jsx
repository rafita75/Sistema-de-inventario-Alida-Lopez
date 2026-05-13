// client/src/modules/admin/pages/CashClosingManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { useNotification } from '../../../shared/contexts/NotificationContext';

export default function CashClosingManager() {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [contadoFisico, setContadoFisico] = useState('');
  const [notas, setNotas] = useState('');
  const [history, setHistory] = useState([]);
  const [alreadyClosed, setAlreadyClosed] = useState(false);

  useEffect(() => {
    loadClosingData();
    loadHistory();
  }, []);

  const loadClosingData = async () => {
    try {
      const { data } = await api.get('/accounting/dashboard');
      setStats(data.hoy);
      
      const { data: historyData } = await api.get('/accounting/cash-closings');
      setHistory(historyData);
      
      // Verificar si el primer registro del historial es de HOY
      if (historyData.length > 0) {
        const lastDate = new Date(historyData[0].fecha).toLocaleDateString();
        const todayDate = new Date().toLocaleDateString();
        if (lastDate === todayDate) {
          setAlreadyClosed(true);
        }
        setSaldoInicial(historyData[0].contadoFisico.toString());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/accounting/cash-closings');
      setHistory(data);
    } catch (e) { console.error(e); }
  };

  // Restricción Horaria: 6:00 PM (18:00) a 11:59 PM
  const now = new Date();
  const currentHour = now.getHours();
  const isTimeAllowed = currentHour >= 18 && currentHour <= 23;

  const sIni = parseFloat(saldoInicial) || 0;
  const ventas = stats?.ingresos || 0;
  const gastos = stats?.gastos || 0;
  const esperado = sIni + ventas - gastos;
  const fisico = parseFloat(contadoFisico) || 0;
  const diferencia = fisico - esperado;

  const handlePerformClosing = async (e) => {
    e.preventDefault();
    if (!isTimeAllowed) return notify('El cierre de caja solo se permite entre las 6:00 PM y las 11:59 PM', 'warning');
    if (contadoFisico === '') return notify('Ingresa el monto físico contado', 'warning');

    try {
      const closingData = {
        saldoInicial: sIni,
        ventasEfectivo: ventas,
        totalGastos: gastos,
        esperadoEnCaja: esperado, // 👈 Agregado
        contadoFisico: fisico,
        diferencia: diferencia, // 👈 Agregado
        notas
      };

      await api.post('/accounting/cash-closing', closingData);
      notify('Cierre de caja guardado con éxito', 'success');
      setAlreadyClosed(true);
      setContadoFisico('');
      setNotas('');
      loadHistory();
    } catch (error) {
      notify(error.response?.data?.error || 'Error al realizar cierre', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center">Calculando datos financieros...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span className="w-1 h-6 bg-green-600 rounded-full"></span>
        🏁 Arqueo y Cierre de Caja
      </h2>

      {alreadyClosed && (
        <div className="p-6 bg-blue-600 text-white rounded-3xl shadow-xl flex items-center gap-4 animate-pulse">
          <span className="text-4xl">🔒</span>
          <div>
            <h3 className="text-xl font-bold">Día Cerrado</h3>
            <p className="text-blue-100 opacity-90">Ya se ha registrado el arqueo del día de hoy. ¡Buen trabajo!</p>
          </div>
        </div>
      )}

      {!isTimeAllowed && !alreadyClosed && (
        <div className="p-4 bg-orange-50 text-orange-700 rounded-2xl border border-orange-200 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <p className="text-sm font-medium">El cierre de caja se habilitará hoy a las <b>6:00 PM</b>.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 opacity-100 transition-opacity">
        {/* PANEL DE CÁLCULO */}
        <div className={`lg:col-span-7 space-y-6 ${alreadyClosed ? 'pointer-events-none grayscale opacity-60' : ''}`}>
          <Card className="p-6 shadow-lg border-gray-100">
            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              📊 Balance del día: {new Date().toLocaleDateString()}
            </h3>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase">Saldo Inicial / Base</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700">Q</span>
                  <input 
                    type="number" 
                    value={saldoInicial}
                    onChange={e => setSaldoInicial(e.target.value)}
                    className="w-24 bg-white border border-blue-200 rounded-lg p-2 font-bold text-right text-blue-700 outline-none"
                    disabled={alreadyClosed}
                  />
                </div>
              </div>

              <div className="flex justify-between p-4 bg-white border rounded-2xl text-sm">
                <span className="text-gray-500">(+) Ventas en Efectivo</span>
                <span className="font-bold text-green-600">Q{ventas.toLocaleString()}</span>
              </div>

              <div className="flex justify-between p-4 bg-white border rounded-2xl text-sm">
                <span className="text-gray-500">(-) Gastos y Salidas</span>
                <span className="font-bold text-red-500">Q{gastos.toLocaleString()}</span>
              </div>

              <div className="flex justify-between p-5 bg-gray-900 rounded-2xl shadow-inner">
                <span className="text-gray-400 font-bold">EFECTIVO ESPERADO</span>
                <span className="font-black text-white text-xl">Q{esperado.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handlePerformClosing} className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
                <Input 
                  label="DINERO FÍSICO CONTADO (Q)" 
                  type="number" 
                  step="0.01"
                  value={contadoFisico}
                  onChange={e => setContadoFisico(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={alreadyClosed || !isTimeAllowed}
                  className="text-2xl font-black text-center h-16 !mb-0"
                />
              </div>

              {contadoFisico && (
                <div className={`p-4 rounded-2xl text-center ${diferencia === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <p className="text-2xl font-black">Dif: Q{diferencia.toLocaleString()}</p>
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                disabled={alreadyClosed || !isTimeAllowed}
                className={`w-full h-16 text-lg font-bold shadow-xl ${alreadyClosed ? 'bg-gray-400' : 'bg-green-600'}`}
              >
                {alreadyClosed ? 'Día ya cerrado' : !isTimeAllowed ? 'Habilitado a las 6PM' : 'Finalizar Cierre'}
              </Button>
            </form>
          </Card>
        </div>

        {/* HISTORIAL */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-widest px-2">Historial Reciente</h3>
          <div className="space-y-3 max-h-[700px] overflow-auto pr-2">
            {history.map(h => (
              <Card key={h._id} className="p-4 border-l-4" style={{ borderLeftColor: h.diferencia === 0 ? '#10b981' : '#ef4444' }}>
                <div className="flex justify-between items-center mb-1">
                  <p className="font-black text-gray-800 text-sm">{new Date(h.fecha).toLocaleDateString()}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${h.diferencia === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.diferencia === 0 ? 'CUADRADO' : 'DESCUADRE'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Físico: Q{h.contadoFisico.toLocaleString()}</span>
                  <span className={h.diferencia !== 0 ? 'text-red-500 font-bold' : ''}>Dif: Q{h.diferencia.toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
