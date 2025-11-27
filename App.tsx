import React, { useState, useEffect } from 'react';
import DashboardStats from './components/DashboardStats';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ReportExport from './components/ReportExport';
import AIAssistant from './components/AIAssistant';
import { Transaction, SummaryStats } from './types';
import { APP_NAME } from './constants';
import { Sparkles, LayoutDashboard, Volume2, PlusCircle, History, Menu, X, Filter, Calendar, XCircle } from 'lucide-react';
import * as geminiService from './services/geminiService';

type ViewState = 'dashboard' | 'new' | 'history';
type FilterType = 'all' | 'month' | 'range';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter State
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    alert("Transacción registrada correctamente.");
  };

  const handleUpdateTransaction = (updatedT: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
    setEditingTransaction(null);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const calculateStats = (txs: Transaction[]): SummaryStats => {
    const income = txs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    
    const cash = txs.filter(t => t.method === 'Efectivo').reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    const transfer = txs.filter(t => t.method === 'Transferencia').reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      cashBalance: cash,
      transferBalance: transfer
    };
  };

  // Derived state for filtering
  const getFilteredData = () => {
    let filtered = [...transactions];
    let periodText = "Histórico Completo";

    if (filterType === 'month') {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
      periodText = `Período: ${selectedMonth}`;
    } else if (filterType === 'range' && startDate && endDate) {
      filtered = filtered.filter(t => t.date >= startDate && t.date <= endDate);
      periodText = `Desde ${startDate} hasta ${endDate}`;
    }

    // Sort desc
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { filteredTransactions: filtered, periodText };
  };

  const { filteredTransactions, periodText } = getFilteredData();
  const filteredStats = calculateStats(filteredTransactions);
  const globalStats = calculateStats(transactions);

  const handleAudioSummary = async () => {
    setIsLoadingAudio(true);
    const statsToRead = currentView === 'history' ? filteredStats : globalStats;
    const contextText = currentView === 'history' ? `Para el período seleccionado (${periodText})` : "En el balance general";
    
    const summaryText = `${contextText}, el balance neto es de $${statsToRead.netBalance}. Ingresos: $${statsToRead.totalIncome}. Egresos: $${statsToRead.totalExpense}.`;
    
    const audioBuffer = await geminiService.generateAudioSummary(summaryText);
    
    if (audioBuffer) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(audioBuffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } else {
      alert("No se pudo generar el audio.");
    }
    setIsLoadingAudio(false);
  };

  const NavItem = ({ view, label, icon: Icon }: { view: ViewState, label: string, icon: any }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        currentView === view 
          ? 'bg-indigo-100 text-indigo-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-10">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo & Mobile Menu Toggle */}
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <LayoutDashboard size={24} />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hidden sm:block">
                  {APP_NAME}
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              <NavItem view="dashboard" label="Panel General" icon={LayoutDashboard} />
              <NavItem view="new" label="Registrar" icon={PlusCircle} />
              <NavItem view="history" label="Movimientos" icon={History} />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAudioSummary}
                disabled={isLoadingAudio}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
                title="Escuchar Resumen"
              >
                <Volume2 size={20} className={isLoadingAudio ? 'animate-pulse text-indigo-500' : ''} />
              </button>
              <button
                onClick={() => setShowAIAssistant(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 p-4 space-y-2 shadow-lg">
             <NavItem view="dashboard" label="Panel General" icon={LayoutDashboard} />
             <NavItem view="new" label="Registrar Transacción" icon={PlusCircle} />
             <NavItem view="history" label="Historial de Movimientos" icon={History} />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel General</h1>
            <DashboardStats stats={globalStats} />
            
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-700">Últimos Movimientos</h2>
                <button 
                  onClick={() => setCurrentView('history')}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Ver todos &rarr;
                </button>
              </div>
              <TransactionList 
                transactions={transactions.slice(0, 5)} 
                title="Resumen Reciente" 
                onDelete={deleteTransaction}
                onEdit={setEditingTransaction} 
              />
            </div>
          </div>
        )}

        {/* VIEW: NEW TRANSACTION */}
        {currentView === 'new' && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registrar Nueva Transacción</h1>
            <TransactionForm onSubmit={addTransaction} />
            
            <div className="mt-6 bg-indigo-50 rounded-xl p-5 border border-indigo-100 flex gap-4 items-start">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900 mb-1">
                  Carga Inteligente
                </h3>
                <p className="text-sm text-indigo-800 leading-relaxed">
                  ¿Tienes el comprobante físico o digital? Sube una foto y nuestra IA extraerá automáticamente la fecha, monto y descripción.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {currentView === 'history' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Historial de Movimientos</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Gestiona, filtra y exporta tus registros.
                </p>
              </div>
              <ReportExport 
                transactions={filteredTransactions} 
                stats={filteredStats} 
                periodText={periodText}
              />
            </div>
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                <Filter size={20} className="text-gray-400 mr-2" />
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Todo
                </button>
                <button
                  onClick={() => setFilterType('month')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Por Mes
                </button>
                <button
                  onClick={() => setFilterType('range')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'range' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Rango de Fechas
                </button>
              </div>

              {/* Filter Inputs */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {filterType === 'month' && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Calendar size={16} className="text-gray-400" />
                    <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-700"
                    />
                  </div>
                )}
                {filterType === 'range' && (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-1.5"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-1.5"
                    />
                  </div>
                )}
                {filterType !== 'all' && (
                  <button onClick={() => setFilterType('all')} className="text-gray-400 hover:text-red-500">
                    <XCircle size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Filtered Stats Summary */}
            {filterType !== 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-top-2">
                 <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Ingresos ({filterType === 'month' ? 'Mes' : 'Rango'})</p>
                    <p className="text-xl font-bold text-emerald-700">${filteredStats.totalIncome.toLocaleString()}</p>
                 </div>
                 <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                    <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Egresos ({filterType === 'month' ? 'Mes' : 'Rango'})</p>
                    <p className="text-xl font-bold text-rose-700">${filteredStats.totalExpense.toLocaleString()}</p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Balance ({filterType === 'month' ? 'Mes' : 'Rango'})</p>
                    <p className="text-xl font-bold text-blue-700">${filteredStats.netBalance.toLocaleString()}</p>
                 </div>
              </div>
            )}
            
            <TransactionList 
              transactions={filteredTransactions} 
              title={`Listado: ${periodText}`} 
              onDelete={deleteTransaction} 
              onEdit={setEditingTransaction}
            />
          </div>
        )}

      </main>

      {/* AI Assistant Modal/Sidebar */}
      {showAIAssistant && (
        <AIAssistant 
          transactions={transactions} 
          onClose={() => setShowAIAssistant(false)} 
        />
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <TransactionForm 
              initialData={editingTransaction} 
              onSubmit={handleUpdateTransaction}
              onCancel={() => setEditingTransaction(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;