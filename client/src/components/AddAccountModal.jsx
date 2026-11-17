import { useState } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function AddAccountModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    account_name: '',
    account_type: 'STANDARD',
    currency: 'UAH',
    balance: '0',
    bank: 'Monobank' // Нове поле
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Наш бекенд поки що не зберігає "bank" в базі, тому ми просто додамо його в назву для краси
      // Якщо хочете зберігати в базі, треба буде змінювати schema.sql
      const name = `${form.account_name} (${form.bank})`;
      
      await api('/accounts', {
        method: 'POST',
        body: JSON.stringify({ ...form, account_name: name, balance: Number(form.balance) }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Новий рахунок</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Банк / Система</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})}>
              <option value="Monobank">Monobank</option>
              <option value="ПриватБанк">ПриватБанк</option>
              <option value="Ощадбанк">Ощадбанк</option>
              <option value="Готівка">Готівка</option>
              <option value="Visa">Visa (Інший банк)</option>
              <option value="Mastercard">Mastercard (Інший банк)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва рахунку</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-lg" 
              value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} placeholder="Наприклад, Зарплатна" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})}>
              <option value="STANDARD">Звичайний</option>
              <option value="SAVINGS">Ощадний</option>
              <option value="CREDIT">Кредитний</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
              <input required type="text" maxLength="3" className="w-full px-3 py-2 border rounded-lg uppercase" 
                value={form.currency} onChange={e => setForm({...form, currency: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Початковий баланс</label>
              <input required type="number" className="w-full px-3 py-2 border rounded-lg" 
                value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} />
            </div>
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