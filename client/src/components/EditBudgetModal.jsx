import { useState } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function EditBudgetModal({ budget, onClose, onSuccess }) {
  const [amount, setAmount] = useState(budget.limit_amount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/budgets/${budget.budget_id}`, {
        method: 'PUT',
        body: JSON.stringify({ limit_amount: Number(amount) }),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Редагувати бюджет</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Категорія: <span className="font-semibold text-gray-900">{budget.category}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Новий ліміт (грн)</label>
            <input required type="number" className="w-full px-3 py-2 border rounded-lg" 
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Скасувати</button>
            <button type="submit" className="px-4 py-2 bg-[#4c5fd5] text-white rounded-lg">Зберегти</button>
          </div>
        </form>
      </div>
    </div>
  );
}