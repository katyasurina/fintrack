import { useState } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function TransferModal({ accounts, onClose, onSuccess }) {
  const [form, setForm] = useState({ from: accounts[0]?.account_id || '', to: accounts[1]?.account_id || '', amount: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/transfer', {
        method: 'POST',
        body: JSON.stringify({ from: Number(form.from), to: Number(form.to), amount: Number(form.amount) }),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Переказ</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">З рахунку</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.from} onChange={e => setForm({...form, from: e.target.value})}>
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">На рахунок</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.to} onChange={e => setForm({...form, to: e.target.value})}>
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сума</label>
            <input required type="number" className="w-full px-3 py-2 border rounded-lg" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Скасувати</button>
            <button type="submit" className="px-4 py-2 bg-[#4c5fd5] text-white rounded-lg">Переказати</button>
          </div>
        </form>
      </div>
    </div>
  );
}