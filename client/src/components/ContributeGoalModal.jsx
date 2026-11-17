import { useState, useEffect } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function ContributeGoalModal({ goal, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    api('/accounts').then(data => {
      setAccounts(data);
      // За замовчуванням вибираємо перший рахунок
      if (data.length > 0) setAccountId(data[0].account_id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) return alert('Оберіть рахунок');
    try {
      await api(`/goals/${goal.goal_id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ 
          amount: Number(amount), 
          account_id: Number(accountId) // <-- ПЕРЕДАЄМО РАХУНОК
        }),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Поповнити ціль</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Ціль: <span className="font-semibold text-gray-900">{goal.title}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">З рахунку</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.length === 0 && <option value="">Немає рахунків</option>}
              {accounts.map(a => (
                <option key={a.account_id} value={a.account_id}>
                  {a.account_name} ({a.balance} {a.currency})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сума</label>
            <input required type="number" className="w-full px-3 py-2 border rounded-lg" 
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Скасувати</button>
            <button type="submit" className="px-4 py-2 bg-[#4c5fd5] text-white rounded-lg">Поповнити</button>
          </div>
        </form>
      </div>
    </div>
  );
}