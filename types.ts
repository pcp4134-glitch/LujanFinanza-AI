export type TransactionType = 'INCOME' | 'EXPENSE';

export enum PaymentMethod {
  CASH = 'Efectivo',
  TRANSFER = 'Transferencia',
  OTHER = 'Otro'
}

export interface Transaction {
  id: string;
  date: string;
  course: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  description: string;
  category?: string;
}

export interface CourseStat {
  course: string;
  income: number;
  expense: number;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  cashBalance: number;
  transferBalance: number;
  netBalance: number;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}