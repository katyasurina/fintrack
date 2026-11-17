import { useState, useEffect } from 'react';
import { api } from '../api';
import { X, Plus } from 'lucide-react';

export default function AddTransactionModal({ onClose, onSuccess }) {
  const [meta, setMeta] = useState({ categories: [] });
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    kind: 'EXPENSE',
    amount: '',
    category_id: '',
    account_id: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    tags: '', // <-- ДОДАНО ПОЛЕ ДЛЯ ТЕГІВ
  });
  
  // Стан для створення нової категорії
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadMeta = () => {
    Promise.all([api('/meta'), api('/accounts')]).then(([m, a]) => {
      setMeta(m);
      setAccounts(a);
      if (a.length > 0) setForm(f => ({ ...f, account_id: a[0].account_id }));
      
      const firstCat = m.categories.find(c => c.type === form.kind);
      if (firstCat && !form.category_id) setForm(f => ({ ...f, category_id: firstCat.category_id }));
    });
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const handleKindChange = (kind) => {
    const firstCat = meta.categories.find(c => c.type === kind);
    setForm({ ...form, kind, category_id: firstCat ? firstCat.category_id : '' });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName, type: form.kind }),
      });
      // Оновлюємо список категорій і вибираємо нову
      const updatedMeta = await api('/meta');
      setMeta(updatedMeta);
      setForm({ ...form, category_id: newCat.category_id });
      setIsAddingCategory(false);
      setNewCategoryName('');
    } catch (err) { alert(err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.account_id) return alert('Створіть спочатку хоча б один рахунок у розділі "Рахунки"');
    try {
      // Парсимо теги з рядка в масив
      const tagsArray = form.tags 
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean) 
        : [];

      await api('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          account_id: Number(form.account_id),
          category_id: Number(form.category_id),
          amount: Number(form.amount),
          date: form.date,
          description: form.description,
          tags: tagsArray, // <-- ПЕРЕДАЄМО ТЕГИ
        }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCats = meta.categories.filter(c => c.type === form.kind);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[480px] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Нова операція</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button type="button" onClick={() => handleKindChange('EXPENSE')} className={`flex-1 py-2 text-sm font-medium rounded-md ${form.kind === 'EXPENSE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Витрата</button>
            <button type="button" onClick={() => handleKindChange('INCOME')} className={`flex-1 py-2 text-sm font-medium rounded-md ${form.kind === 'INCOME' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Дохід</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сума</label>
            <input type="number" step="0.01" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#4c5fd5]" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Категорія з можливістю додавання */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Категорія</label>
                <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-xs text-[#4c5fd5] flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Додати
                </button>
              </div>
              
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Нова категорія" 
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                  <button type="button" onClick={handleCreateCategory} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">OK</button>
                </div>
              ) : (
                <select className="w-full px-3 py-2 border rounded-lg focus:outline-none" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  {filteredCats.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Рахунок</label>
              <select className="w-full px-3 py-2 border rounded-lg focus:outline-none" value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>
                {accounts.length === 0 && <option value="">Немає рахунків</option>}
                {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
              <input type="date" required className="w-full px-3 py-2 border rounded-lg focus:outline-none" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              {/* ПОЛЕ ДЛЯ ТЕГІВ */}
              <label className="block text-sm font-medium text-gray-700 mb-1">Теги (через кому)</label>
              <input type="text" placeholder="відпустка, подарунок" className="w-full px-3 py-2 border rounded-lg focus:outline-none" 
                value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Коментар</label>
            <input type="text" placeholder="Необов'язково" className="w-full px-3 py-2 border rounded-lg focus:outline-none" 
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Скасувати</button>
            <button type="submit" className="px-4 py-2 bg-[#4c5fd5] text-white font-medium rounded-lg hover:bg-[#3d4eb5]">Додати</button>
          </div>
        </form>
      </div>
    </div>
  );
}