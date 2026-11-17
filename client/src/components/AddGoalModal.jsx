import { useState } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function AddGoalModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', target_amount: '', deadline: '', priority: 2 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/goals', {
        method: 'POST',
        body: JSON.stringify({ ...form, target_amount: Number(form.target_amount), priority: Number(form.priority) }),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Нова ціль</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-lg" 
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Наприклад, Відпустка" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Потрібна сума</label>
            <input required type="number" className="w-full px-3 py-2 border rounded-lg" 
              value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дедлайн (необов'язково)</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg" 
              value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пріоритет</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              <option value={1}>Високий</option>
              <option value={2}>Середній</option>
              <option value={3}>Низький</option>
            </select>
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