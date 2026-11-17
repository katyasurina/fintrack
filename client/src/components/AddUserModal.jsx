import { useState } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ full_name: '', email: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onSuccess();
      onClose();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Новий профіль</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я та прізвище</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-lg" 
              value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Наприклад, Іван Франко" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input required type="email" className="w-full px-3 py-2 border rounded-lg" 
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="example@mail.com" />
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