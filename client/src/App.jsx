import { useState, useEffect } from 'react';
import { Home, List, Wallet, PieChart, Target, User, X, Plus } from 'lucide-react';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import AddUserModal from './components/AddUserModal'; // <-- Імпорт
import { api, setUid } from './api';

const NAV = [
  { id: 'overview', label: 'Огляд', icon: Home },
  { id: 'transactions', label: 'Операції', icon: List },
  { id: 'accounts', label: 'Рахунки', icon: Wallet },
  { id: 'budgets', label: 'Бюджети', icon: PieChart },
  { id: 'goals', label: 'Цілі', icon: Target },
];

export default function App() {
  const [active, setActive] = useState('overview');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false); // <-- Новий стан

  const loadUsers = () => {
    api('/users').then(data => {
      setUsers(data);
      const savedId = Number(localStorage.getItem('ft_uid')) || 1;
      setCurrentUser(data.find(u => u.user_id === savedId) || data[0]);
    }).catch(console.error);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSwitchUser = (id) => {
    setUid(id);
    setCurrentUser(users.find(u => u.user_id === id));
    setIsProfileOpen(false);
    window.location.reload();
  };

  const renderPage = () => {
    switch (active) {
      case 'overview': return <Overview setActive={setActive} />;
      case 'transactions': return <Transactions />;
      case 'accounts': return <Accounts />;
      case 'budgets': return <Budgets />;
      case 'goals': return <Goals />;
      default: return <Overview setActive={setActive} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f7f7f5] text-[#1b1b1f]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#e7e6e1] bg-[#f7f7f5] flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#4c5fd5] flex items-center justify-center text-white font-bold">F</div>
          <span className="font-bold text-xl tracking-tight">FinTrack</span>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active === item.id ? 'bg-[#eceefc] text-[#4c5fd5]' : 'text-[#5d5d66] hover:bg-[#e7e6e1]'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#e7e6e1]">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-3 p-3 bg-white border border-[#e7e6e1] rounded-xl hover:border-gray-300 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#eceefc] text-[#4c5fd5] flex items-center justify-center font-bold">
              {currentUser ? currentUser.full_name.split(' ').map(n => n[0]).join('') : <User size={20} />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold">{currentUser ? currentUser.full_name : 'Завантаження...'}</span>
              <span className="text-xs text-gray-500">Змінити профіль</span>
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10">
        {renderPage()}
      </main>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Оберіть профіль</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              {users.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => handleSwitchUser(u.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    currentUser?.user_id === u.user_id ? 'border-[#4c5fd5] bg-[#eceefc]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                    {u.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold">{u.full_name}</span>
                    <span className="text-xs text-gray-500">{u.email}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Кнопка створення нового профілю */}
            <button 
              onClick={() => { setIsProfileOpen(false); setIsAddUserOpen(true); }}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-[#4c5fd5] hover:text-[#4c5fd5] transition-colors mt-4"
            >
              <Plus size={18} /> Новий профіль
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <AddUserModal 
          onClose={() => setIsAddUserOpen(false)} 
          onSuccess={() => {
            loadUsers(); // Оновлюємо список профілів
          }} 
        />
      )}
    </div>
  );
}