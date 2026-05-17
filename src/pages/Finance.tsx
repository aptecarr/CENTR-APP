import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  comment: string;
  authorName: string;
  createdAt?: any;
}

export const Finance: React.FC = () => {
  const { profile, user } = useAuth();
  
  const isAdmin = profile?.permissions?.isAdmin === true || user?.email === 'aptecar87@gmail.com';
  const isFinanceResponsible = profile?.permissions?.isFinanceResponsible === true;
  const canEdit = isAdmin || isFinanceResponsible;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState<string>('');

  const incomeCategories = ['Церква', 'Пожертви', 'Баня (Внутрішній дохід)'];
  const expenseCategories = ['Продукти', 'Господарство', 'Комунальні', 'Медицина', 'Інше'];

  useEffect(() => {
    const q = query(collection(db, 'finance_transactions'), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const tData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(tData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'finance_transactions');
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setAmount(0);
    setCategory(type === 'income' ? incomeCategories[0] : expenseCategories[0]);
    setDate(new Date().toISOString().split('T')[0]);
    setComment('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    try {
      await addDoc(collection(db, 'finance_transactions'), {
        amount: Number(amount),
        type: modalType,
        category,
        date,
        comment,
        authorName: profile?.name || user?.displayName || 'Невідомий',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finance_transactions');
    }
  };

  // Calculate stats for current month
  const today = new Date();
  const currentMonthPrefix = today.toISOString().substring(0, 7); // "YYYY-MM"

  let totalIncomeMonth = 0;
  let totalExpenseMonth = 0;
  let currentBalance = 0;

  transactions.forEach(t => {
    if (t.type === 'income') {
      currentBalance += t.amount;
      if (t.date.startsWith(currentMonthPrefix)) {
        totalIncomeMonth += t.amount;
      }
    } else {
      currentBalance -= t.amount;
      if (t.date.startsWith(currentMonthPrefix)) {
        totalExpenseMonth += t.amount;
      }
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto pb-24 bg-gray-50 dark:bg-gray-950 transition-colors duration-300 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Фінанси</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Прозорість та планування</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button 
              onClick={() => openModal('income')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-xl font-bold text-sm transition-colors"
            >
              <Plus size={16} /> Додати надходження
            </button>
            <button 
              onClick={() => openModal('expense')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 rounded-xl font-bold text-sm transition-colors"
            >
              <Plus size={16} /> Додати витрату
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
          />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Завантаження...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                <Wallet size={20} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Поточний баланс каси</p>
              <div className="text-3xl font-black font-display text-gray-900 dark:text-white">
                {currentBalance.toLocaleString('uk-UA')} <span className="text-lg text-gray-400">₴</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 p-2 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Надходжень за місяць</p>
              <div className="text-3xl font-black font-display text-green-600 dark:text-green-400">
                +{totalIncomeMonth.toLocaleString('uk-UA')} <span className="text-lg text-gray-400">₴</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl">
                <TrendingDown size={20} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Витрат за місяць</p>
              <div className="text-3xl font-black font-display text-orange-600 dark:text-orange-400">
                -{totalExpenseMonth.toLocaleString('uk-UA')} <span className="text-lg text-gray-400">₴</span>
              </div>
            </motion.div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-widest">Останні операції</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Дата</th>
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Категорія</th>
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Коментар</th>
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Сума</th>
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Хто вніс</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-gray-400 italic">Транзакції відсутні</td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                              t.type === 'income' ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                            )}>
                              {t.type === 'income' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            </div>
                            {t.category}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{t.comment || '-'}</td>
                        <td className={cn(
                          "p-4 text-sm font-bold text-right",
                          t.type === 'income' ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
                        )}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('uk-UA')} ₴
                        </td>
                        <td className="p-4 text-xs text-gray-500">{t.authorName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && canEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-3xl w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900"
              >
                <X size={16} />
              </button>
              
              <h3 className="text-xl font-bold font-display dark:text-white mb-6">
                {modalType === 'income' ? 'Нове надходження' : 'Нова витрата'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Сума (₴)<span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white text-gray-900 font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Категорія<span className="text-red-500">*</span></label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                  >
                    {modalType === 'income' 
                      ? incomeCategories.map(c => <option key={c} value={c}>{c}</option>)
                      : expenseCategories.map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Дата<span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Коментар</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Призначення, деталі..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={!amount || amount <= 0}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-bold shadow-lg transition-smooth mt-6 uppercase tracking-widest text-xs text-white",
                    modalType === 'income' ? "bg-green-500 hover:bg-green-600 shadow-green-500/20" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
                    (!amount || amount <= 0) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Зберегти запис
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
