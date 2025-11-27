import React from 'react';
import { SummaryStats } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';

interface Props {
  stats: SummaryStats;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  subtext?: string;
}> = ({ title, value, icon, colorClass, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">
        ${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </h3>
      {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass}`}>
      {icon}
    </div>
  </div>
);

const DashboardStats: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Ingresos Totales"
        value={stats.totalIncome}
        icon={<TrendingUp size={24} className="text-emerald-600" />}
        colorClass="bg-emerald-50"
      />
      <StatCard
        title="Egresos Totales"
        value={stats.totalExpense}
        icon={<TrendingDown size={24} className="text-rose-600" />}
        colorClass="bg-rose-50"
      />
      <StatCard
        title="Balance Neto"
        value={stats.netBalance}
        icon={<DollarSign size={24} className="text-blue-600" />}
        colorClass="bg-blue-50"
        subtext={stats.netBalance >= 0 ? "Superávit" : "Déficit"}
      />
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center text-gray-600">
            <Wallet size={16} className="mr-2 text-gray-400" /> Efectivo
          </span>
          <span className="font-semibold">${stats.cashBalance.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div 
            className="bg-indigo-500 h-1.5 rounded-full" 
            style={{ width: `${stats.totalIncome > 0 ? (stats.cashBalance / stats.totalIncome) * 100 : 0}%` }} 
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center text-gray-600">
            <CreditCard size={16} className="mr-2 text-gray-400" /> Transfer.
          </span>
          <span className="font-semibold">${stats.transferBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;