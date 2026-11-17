import { useEffect, useState } from 'react';
import { api } from '../api';
import { Wallet, TrendingUp, TrendingDown, Calendar, Plus, ArrowRightLeft, Trash2 } from 'lucide-react';
import AddAccountModal from '../components/AddAccountModal';
import TransferModal from '../components/TransferModal';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({ total_income: 0, total_expense: 0, months: 0 });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const loadData = () => {
    api('/accounts').then(setAccounts).catch(console.error);
    api('/summary').then(data => {
      if (data && data.all_time) setStats(data.all_time);
    }).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Ви впевнені, що хочете видалити цей рахунок? Усі операції на ньому також зникнуть.')) return;
    try {
      await api(`/accounts/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const formatMoney = (val, cur = 'UAH') => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Рахунки</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsTransferOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7e6e1] text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <ArrowRightLeft size={16} /> Переказ
          </button>
          <button 
            onClick={() => setIsAddOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-[#4c5fd5] text-white rounded-lg text-sm font-medium hover:bg-[#3d4eb5]"
          >
            <Plus size={16} /> Новий рахунок
          </button>
        </div>
      </div>
      
      {/* Блок статистики */}
      <div className="bg-white border border-[#e7e6e1] rounded-2xl p-6 flex flex-wrap gap-8 justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl"><TrendingUp size={24} className="text-green-600" /></div>
          <div>
            <div className="text-sm text-gray-500">Всього доходів</div>
            <div className="text-xl font-bold text-green-600">{formatMoney(stats.total_income)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl"><TrendingDown size={24} className="text-red-600" /></div>
          <div>
            <div className="text-sm text-gray-500">Всього витрат</div>
            <div className="text-xl font-bold text-red-600">{formatMoney(stats.total_expense)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl"><Calendar size={24} className="text-[#4c5fd5]" /></div>
          <div>
            <div className="text-sm text-gray-500">Накопичено за {stats.months} міс.</div>
            <div className="text-xl font-bold text-gray-900">{formatMoney(stats.total_income - stats.total_expense)}</div>
          </div>
        </div>
      </div>

      {/* Список рахунків */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc.account_id} className="p-6 bg-white border border-[#e7e6e1] rounded-2xl flex flex-col gap-4 relative group">
            <button 
              onClick={() => handleDelete(acc.account_id)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Видалити рахунок"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="flex justify-between items-start pr-8">
              <span className="font-semibold text-lg">{acc.account_name}</span>
              <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-600">{acc.account_type}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Wallet size={16} />{acc.currency}</div>
            <div className={`text-2xl font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatMoney(acc.balance, acc.currency)}</div>
          </div>
        ))}
      </div>

      {isAddOpen && <AddAccountModal onClose={() => setIsAddOpen(false)} onSuccess={loadData} />}
      {isTransferOpen && <TransferModal accounts={accounts} onClose={() => setIsTransferOpen(false)} onSuccess={loadData} />}
    </div>
  );
}