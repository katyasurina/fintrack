import { useEffect, useState } from 'react';
import { api } from '../api';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import AddTransactionModal from '../components/AddTransactionModal';
import { Plus, Calendar } from 'lucide-react';

export default function Overview({ setActive }) {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    api(`/summary?month=${month}`).then(setData).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, [month]);

  if (!data) return <div className="text-gray-500 font-mono">Завантаження даних...</div>;

  const formatMoney = (val) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val);
  const monthName = new Date(data.month + '-01').toLocaleString('uk-UA', { month: 'long', year: 'numeric' });

  // Розрахунок відсотків для підписів
  const incomeDiff = data.prev_income > 0 
    ? Math.round(((data.income - data.prev_income) / data.prev_income) * 100) 
    : null;
    
  const expenseDiff = data.prev_expense > 0 
    ? Math.round(((data.expense - data.prev_expense) / data.prev_expense) * 100) 
    : null;

  const savingsPct = data.income > 0 
    ? Math.round(((data.income - data.expense) / data.income) * 100) 
    : 0;

  return (
    <div className="space-y-8 max-w-6xl">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Огляд</h1>
          <p className="text-gray-500 mt-1">Фінансовий стан за {monthName}</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-[#e7e6e1] rounded-lg text-sm font-medium outline-none focus:border-[#4c5fd5]"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4c5fd5] text-white rounded-lg text-sm font-medium hover:bg-[#3d4eb5] transition-colors"
          >
            <Plus size={16} />
            Нова операція
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            label: 'Загальний баланс', 
            value: data.balance, 
            color: 'text-gray-900', 
            sub: `${data.currencies?.find(c => c.currency === data.currency)?.n ?? 0} рах.` 
          },
          { 
            label: 'Доходи', 
            value: data.income, 
            color: 'text-green-600', 
            sub: incomeDiff !== null 
              ? `${incomeDiff >= 0 ? '▲' : '▼'} ${Math.abs(incomeDiff)}% до минулого місяця`
              : 'Немає даних за минулий місяць'
          },
          { 
            label: 'Витрати', 
            value: data.expense, 
            color: 'text-red-600', 
            sub: expenseDiff !== null 
              ? `${expenseDiff >= 0 ? '▲' : '▼'} ${Math.abs(expenseDiff)}% до минулого місяця`
              : 'Немає даних за минулий місяць'
          },
          { 
            label: 'Заощадження', 
            value: data.income - data.expense, 
            color: 'text-green-600', 
            sub: data.income > 0 
              ? `${savingsPct}% від доходів`
              : 'Немає доходів'
          },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border border-[#e7e6e1] rounded-2xl flex flex-col justify-between">
            <div>
              <div className="text-gray-500 text-sm mb-2">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{formatMoney(stat.value)}</div>
            </div>
            <div className="text-xs text-gray-400 mt-2">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#e7e6e1] rounded-2xl">
          <BarChart data={data.series} />
        </div>
        <div className="p-6 bg-white border border-[#e7e6e1] rounded-2xl">
          <h3 className="font-semibold mb-6">Витрати за категоріями</h3>
          <DonutChart data={data.by_category} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#e7e6e1] rounded-2xl">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold">Бюджети місяця</h3>
             <button onClick={() => setActive('budgets')} className="text-sm text-[#4c5fd5] hover:underline">Усі</button>
           </div>
           <div className="space-y-4">
             {data.budgets && data.budgets.length > 0 ? (
               data.budgets.map(b => {
                 const pct = Math.min(100, Math.round((b.spent / b.limit_amount) * 100));
                 const isOver = b.spent > b.limit_amount;
                 return (
                   <div key={b.budget_id}>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium">{b.category}</span>
                       <span className="text-gray-500 font-mono text-xs">{formatMoney(b.spent)} / {formatMoney(b.limit_amount)}</span>
                     </div>
                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-[#4c5fd5]'}`} style={{ width: `${pct}%` }} />
                     </div>
                   </div>
                 );
               })
             ) : (
               <div className="text-gray-500 text-sm">Немає активних бюджетів</div>
             )}
           </div>
        </div>
        <div className="p-6 bg-white border border-[#e7e6e1] rounded-2xl">
          <h3 className="font-semibold mb-4">Найбільші витрати</h3>
          <div className="space-y-4">
            {data.top_expenses.map(tx => (
              <div key={tx.id} className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm text-gray-900">{tx.description || tx.category}</div>
                  <div className="text-xs text-gray-500">{tx.category} · {tx.date}</div>
                </div>
                <div className="text-sm font-bold text-red-600">-{formatMoney(tx.amount)}</div>
              </div>
            ))}
            {data.top_expenses.length === 0 && <div className="text-gray-500 text-sm">Немає даних</div>}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <AddTransactionModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => loadData()} 
        />
      )}
    </div>
  );
}