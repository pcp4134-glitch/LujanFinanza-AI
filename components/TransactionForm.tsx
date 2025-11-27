import React, { useState, useRef, useEffect } from 'react';
import { COURSES, EXPENSE_CATEGORIES } from '../constants';
import { PaymentMethod, Transaction, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Camera, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { fileToGenerativePart, analyzeReceipt } from '../services/geminiService';

interface Props {
  onSubmit: (t: Transaction) => void;
  initialData?: Transaction | null;
  onCancel?: () => void;
}

const TransactionForm: React.FC<Props> = ({ onSubmit, initialData, onCancel }) => {
  const [type, setType] = useState<TransactionType>('INCOME');
  const [course, setCourse] = useState(COURSES[0]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCourse(initialData.course);
      setAmount(initialData.amount.toString());
      setMethod(initialData.method);
      setDate(initialData.date);
      setDescription(initialData.description);
    }
  }, [initialData]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'EXPENSE') {
      setCourse(EXPENSE_CATEGORIES[0]);
    } else {
      setCourse(COURSES[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const newTransaction: Transaction = {
      id: initialData ? initialData.id : uuidv4(),
      date,
      type,
      course: course, // Stores either Course (Income) or Category (Expense)
      amount: Number(amount),
      method,
      description: description || (type === 'INCOME' ? 'Pago de cuota' : 'Gasto vario'),
    };

    onSubmit(newTransaction);
    
    if (!initialData) {
      // Reset form only if not editing (or if parent handles close)
      setAmount('');
      setDescription('');
      if (type === 'INCOME') {
        setCourse(COURSES[0]);
      } else {
        setCourse(EXPENSE_CATEGORIES[0]);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const base64Data = await fileToGenerativePart(file);
      const data = await analyzeReceipt(base64Data);
      
      if (data.amount) setAmount(data.amount.toString());
      if (data.date) setDate(data.date);
      if (data.description) setDescription(data.description);
      
      if (data.type) {
        const newType = data.type as TransactionType;
        setType(newType);
        if (newType === 'EXPENSE') {
          // Try to match a category if AI returns one in description or just default
          setCourse(EXPENSE_CATEGORIES[0]);
        } else {
          setCourse(COURSES[0]);
        }
      }
      
    } catch (error) {
      alert("No se pudo analizar el comprobante. Por favor ingrese los datos manualmente.");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
        </h2>
        
        {!initialData && (
          <div className="flex gap-2">
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
               {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
               Auto-completar con IA
            </button>
          </div>
        )}
        {initialData && onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="col-span-1 md:col-span-2 flex space-x-4 mb-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={type === 'INCOME'}
              onChange={() => handleTypeChange('INCOME')}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            />
            <span className={`font-medium ${type === 'INCOME' ? 'text-emerald-700' : 'text-gray-600'}`}>Ingreso</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={type === 'EXPENSE'}
              onChange={() => handleTypeChange('EXPENSE')}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500"
            />
            <span className={`font-medium ${type === 'EXPENSE' ? 'text-rose-700' : 'text-gray-600'}`}>Egreso</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {type === 'INCOME' ? 'Curso / Área' : 'Categoría del Gasto'}
          </label>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          >
            {type === 'INCOME' 
              ? COURSES.map(c => <option key={c} value={c}>{c}</option>)
              : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
            }
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          >
            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {type === 'INCOME' ? 'Descripción' : 'Nombre del Gasto / Detalle'}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'INCOME' ? "Ej. Cuota Marzo Alumno X" : "Ej. Compra de insumos limpieza"}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="col-span-1 md:col-span-2 mt-2 flex gap-3">
           {initialData && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-2.5 px-4 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className={`flex-1 py-2.5 px-4 rounded-lg text-white font-medium transition-colors shadow-sm
              ${type === 'INCOME' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-rose-600 hover:bg-rose-700'}`}
          >
            {initialData ? 'Guardar Cambios' : `Registrar ${type === 'INCOME' ? 'Ingreso' : 'Egreso'}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;