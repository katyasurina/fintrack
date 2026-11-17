import { useEffect, useState } from 'react';
import { api } from '../api';
import { Search, Download, Trash2, Filter } from 'lucide-react';

export default function Transactions() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState({ q: '', type: '', category: '', account: '' });
  const [meta, setMeta] = useState({ categories: [] });
  const [accounts, setAccounts] = useState([]);

    const loadData = () => {
    const params = new URLSearchParams();
    params.set('limit', '200'); // <-- ДОДАНО: показувати до 200 записів
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    if (filters.category) params.set('category', filters.category);
    if (filters.account) params.set('account', filters.account);
    
    api(`/transactions?${params.toString()}`).then(setData).catch(console.error);
  };

  useEffect(() => {
    Promise.all([api('/meta'), api('/accounts')]).then(([m, a]) => {
      setMeta(m);
      setAccounts(a);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleDelete = async (id) => {
    if (!confirm('Видалити цю операцію? Баланс буде скориговано.')) return;
    try {
      await api(`/transactions/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    
    const res = await fetch(`/api/transactions/export.csv?${params.toString()}`, {
      headers: { 'X-User-Id': localStorage.getItem('ft_uid') || 1 }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fintrack-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Операції</h1>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7e6e1] rounded-lg text-sm font-medium hover:bg-gray-50">
          <Download size={16} /> Експорт CSV
        </button>
      </div>

      {/* Фільтри */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-[#e7e6e1]">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Пошук за описом..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#4c5fd5]"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        
        <select 
          className="px-3 py-2 border rounded-lg bg-white focus:outline-none"
          value={filters.type} 
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Всі типи</option>
          <option value="INCOME">Доходи</option>
          <option value="EXPENSE">Витрати</option>
        </select>

        <select 
          className="px-3 py-2 border rounded-lg bg-white focus:outline-none"
          value={filters.category} 
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Всі категорії</option>
          {meta.categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>

        <select 
          className="px-3 py-2 border rounded-lg bg-white focus:outline-none"
          value={filters.account} 
          onChange={(e) => setFilters({ ...filters, account: e.target.value })}
        >
          <option value="">Всі рахунки</option>
          {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
        </select>
      </div>
      
      {/* Таблиця */}
      <div className="bg-white border border-[#e7e6e1] rounded-2xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4 border-b border-[#e7e6e1]">Дата</th>
              <th className="px-6 py-4 border-b border-[#e7e6e1]">Опис</th>
              <th className="px-6 py-4 border-b border-[#e7e6e1]">Категорія</th>
              <th className="px-6 py-4 border-b border-[#e7e6e1]">Рахунок</th>
              <th className="px-6 py-4 border-b border-[#e7e6e1] text-right">Сума</th>
              <th className="px-6 py-4 border-b border-[#e7e6e1] text-center">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7e6e1]">
            {data.items.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                <td className="px-6 py-4 font-medium">
                  {tx.description || '---'}
                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {tx.tags.map(t => <span key={t} className="text-xs text-gray-400">#{t}</span>)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    {tx.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{tx.account}</td>
                <td className={`px-6 py-4 text-right font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{tx.amount} грн
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => handleDelete(tx.id)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Видалити"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <div className="p-10 text-center text-gray-500">Операцій не знайдено</div>}
      </div>
    </div>
  );
}