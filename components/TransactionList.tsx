import React from 'react';
import { Transaction } from '../types';
import { ArrowDownRight, ArrowUpRight, Trash2, Pencil } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  title?: string;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
}

const TransactionList: React.FC<Props> = ({ transactions, title = "Movimientos Recientes", onDelete, onEdit }) => {
  // Sort by date desc
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = (id: string) => {
    if (onDelete && window.confirm('Are you sure you want to delete this transaction?')) {
      onDelete(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Concepto</th>
              <th className="p-4 font-semibold">Curso/Área</th>
              <th className="p-4 font-semibold">Medio</th>
              <th className="p-4 font-semibold text-right">Monto</th>
              {(onDelete || onEdit) && <th className="p-4 font-semibold text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{t.date}</td>
                <td className="p-4 text-sm text-gray-800">
                  <div className="flex items-center">
                    <span className={`p-1 rounded-full mr-3 ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {t.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </span>
                    {t.description}
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">{t.course}</td>
                <td className="p-4 text-sm text-gray-600">{t.method}</td>
                <td className={`p-4 text-sm font-semibold text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                {(onDelete || onEdit) && (
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       {onEdit && (
                        <button 
                          onClick={() => onEdit(t)}
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-50"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="text-gray-400 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-rose-50"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={(onDelete || onEdit) ? 6 : 5} className="p-8 text-center text-gray-400">
                  No hay movimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;