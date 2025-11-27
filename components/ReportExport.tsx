import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, SummaryStats } from '../types';
import { FileText, Table } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  stats: SummaryStats;
  periodText?: string;
}

const ReportExport: React.FC<Props> = ({ transactions, stats, periodText = "General" }) => {
  
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(63, 81, 181); // Indigo color header
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Informe Financiero', 14, 20);
    doc.setFontSize(12);
    doc.text('EduFinance AI', 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 180, 20, { align: 'right' });
    doc.text(`Período: ${periodText}`, 180, 28, { align: 'right' });

    // Reset Text Color
    doc.setTextColor(0, 0, 0);

    // Stats Section
    doc.setFontSize(14);
    doc.text('Resumen del Período', 14, 50);
    
    const statsData = [
      ['Ingresos Totales', `$${stats.totalIncome.toLocaleString()}`],
      ['Egresos Totales', `$${stats.totalExpense.toLocaleString()}`],
      ['Balance Neto', `$${stats.netBalance.toLocaleString()}`],
      ['Saldo Efectivo (Período)', `$${stats.cashBalance.toLocaleString()}`],
      ['Saldo Transferencias (Período)', `$${stats.transferBalance.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Concepto', 'Monto']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
    });

    // Transactions Section
    doc.setFontSize(14);
    doc.text('Detalle de Movimientos', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const tableData = transactions.map(t => [
      t.date,
      t.type === 'INCOME' ? 'Ingreso' : 'Egreso',
      t.course,
      t.description,
      t.method,
      `$${t.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Fecha', 'Tipo', 'Curso', 'Descripción', 'Medio', 'Monto']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`reporte-financiero-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportExcel = () => {
    // Prepare Data for Excel
    const data = transactions.map(t => ({
      Fecha: t.date,
      Tipo: t.type === 'INCOME' ? 'Ingreso' : 'Egreso',
      Curso: t.course,
      Descripcion: t.description,
      Metodo: t.method,
      Monto: t.amount
    }));

    // Add Summary Rows at the top
    const summary = [
      { Fecha: "RESUMEN PERIODO:", Tipo: periodText },
      { Fecha: "Ingresos:", Monto: stats.totalIncome },
      { Fecha: "Egresos:", Monto: stats.totalExpense },
      { Fecha: "Balance:", Monto: stats.netBalance },
      { Fecha: "" } // Empty row spacer
    ];

    const ws = XLSX.utils.json_to_sheet([...summary, ...data], { skipHeader: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, `reporte-${periodText.replace(/[: ]/g, '_')}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportPDF}
        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
        title="Descargar PDF"
      >
        <FileText size={18} /> <span className="hidden md:inline">PDF</span>
      </button>
      <button
        onClick={exportExcel}
        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
        title="Descargar Excel"
      >
        <Table size={18} /> <span className="hidden md:inline">Excel</span>
      </button>
    </div>
  );
};

export default ReportExport;