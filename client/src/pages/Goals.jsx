import { useEffect, useState } from 'react';
import { api } from '../api';
import { Target, Plus, Edit3, Trash2 } from 'lucide-react';
import AddGoalModal from '../components/AddGoalModal';
import ContributeGoalModal from '../components/ContributeGoalModal';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState(null);

  const loadData = () => { api('/goals').then(setGoals).catch(console.error); };
  
  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Ви впевнені, що хочете видалити цю ціль?')) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const formatMoney = (val) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Цілі</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#4c5fd5] text-white rounded-lg text-sm font-medium">
            <Plus size={16} /> Нова ціль
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
          return (
            <div key={g.goal_id} className="p-6 bg-white border border-[#e7e6e1] rounded-2xl space-y-4 relative group">
              
              {/* Кнопка видалення (з'являється при наведенні) */}
              <button 
                onClick={() => handleDelete(g.goal_id)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Видалити ціль"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex justify-between items-start pr-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg"><Target size={20} className="text-[#4c5fd5]" /></div>
                  <div>
                    <div className="font-semibold">{g.title}</div>
                    <div className="text-xs text-gray-500">Пріоритет: {g.priority}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${g.goal_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {g.goal_status === 'COMPLETED' ? 'Виконано' : 'В процесі'}
                </span>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1 font-mono">
                  <span className="text-gray-900">{formatMoney(g.current_amount)}</span>
                  <span className="text-gray-400">з {formatMoney(g.target_amount)}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.goal_status === 'COMPLETED' ? 'bg-green-500' : 'bg-[#4c5fd5]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              
              {g.goal_status !== 'COMPLETED' && (
                <button onClick={() => setContributeGoal(g)} className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  <Edit3 size={16} /> Поповнити
                </button>
              )}
            </div>
          );
        })}
        {goals.length === 0 && <div className="text-gray-500">Цілей не знайдено.</div>}
      </div>

      {isAddModalOpen && <AddGoalModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadData} />}
      {contributeGoal && <ContributeGoalModal goal={contributeGoal} onClose={() => setContributeGoal(null)} onSuccess={loadData} />}
    </div>
  );
}