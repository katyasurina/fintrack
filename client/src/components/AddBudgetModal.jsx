import { useState, useEffect } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function AddBudgetModal({ onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', limit_amount: '', period_start: '', period_end: '' });

  useEffect(() => {
    api('/meta').then(m => {
      const expenseCats = m.categories.filter(c => c.type === 'EXPENSE');
      setCategories(expenseCats);
      if (expenseCats.length > 0) setForm(f => ({ ...f, category_id: expenseCats[0].category_id }));
    });
    
    // Встановлюємо поточний місяць за замовчуванням
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setForm(f => ({ ...f, period_start: firstDay, period_end: lastDay }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/budgets', {
        method: 'POST',
        body: JSON.stringify({ ...form, category_id: Number(form.category_id), limit_amount: Number(form.limit_amount) }),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Новий бюджет</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ліміт (грн)</label>
            <input required type="number" className="w-full px-3 py-2 border rounded-lg" 
              value={form.limit_amount} onChange={e => setForm({...form, limit_amount: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Від</label>
              <input required type="date" className="w-full px-3 py-2 border rounded-lg" value={form.period_start} onChange={e => setForm({...form, period_start: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">До</label>
              <input required type="date" className="w-full px-3 py-2 border rounded-lg" value={form.period_end} onChange={e => setForm({...form, period_end: e.target.value})} /></div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Скасувати</button>
            <button type="submit" className="px-4 py-2 bg-[#4c5fd5] text-white rounded-lg">Створити</button>
          </div>
        </form>
      </div>
    </div>
  );
}