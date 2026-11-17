import { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import AddBudgetModal from '../components/AddBudgetModal';
import EditBudgetModal from '../components/EditBudgetModal';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);

  const loadData = () => { api('/budgets').then(setBudgets).catch(console.error); };
  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Видалити цей бюджет?')) return;
    try {
      await api(`/budgets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const formatMoney = (val) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Бюджети</h1>
        <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#4c5fd5] text-white rounded-lg text-sm font-medium hover:bg-[#3d4eb5]">
            <Plus size={16} /> Новий бюджет
        </button>
      </div>
      
      <div className="bg-white border border-[#e7e6e1] rounded-2xl p-6 space-y-8">
        {budgets.map((b) => {
          const pct = Math.min(100, Math.round((b.spent / b.limit_amount) * 100));
          const isOver = b.spent > b.limit_amount;
          return (
            <div key={b.budget_id} className="group relative">
              <div className="flex justify-between text-sm mb-2 pr-16">
                <span className="font-semibold text-gray-900">{b.category}</span>
                <span className={`font-mono ${isOver ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                  {formatMoney(b.spent)} / {formatMoney(b.limit_amount)}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-[#4c5fd5]'}`} style={{ width: `${pct}%` }} />
              </div>
              
              {/* Кнопки керування */}
              <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditBudget(b)} className="p-1 text-gray-400 hover:text-[#4c5fd5]" title="Редагувати ліміт">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(b.budget_id)} className="p-1 text-gray-400 hover:text-red-500" title="Видалити">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <div className="text-gray-500">Бюджетів не знайдено.</div>}
      </div>

      {isAddOpen && <AddBudgetModal onClose={() => setIsAddOpen(false)} onSuccess={loadData} />}
      {editBudget && <EditBudgetModal budget={editBudget} onClose={() => setEditBudget(null)} onSuccess={loadData} />}
    </div>
  );
}