import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ChevronRight, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  date: any;
}

export const Finance: React.FC = () => {
  const { canEditFinance } = useAuth();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(15420); // Fallback mock balance
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [monthlyExpense, setMonthlyExpense] = useState(9700.50);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Firebase logic
    const q = query(collection(db, 'finances'), orderBy('date', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snapshot) => {
      const tData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(tData);
      
      // Basic calculation for demo (in production should be server-side or more complex aggregation)
      let inc = 0;
      let exp = 0;
      tData.forEach(t => {
        if (t.type === 'income') inc += t.amount;
        else exp += Math.abs(t.amount);
      });
      if (tData.length > 0) {
        setMonthlyIncome(inc);
        setMonthlyExpense(exp);
      }

      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'finances');
      setIsLoading(false);
    });

    return () => {
      observer.disconnect();
      unsub();
    };
  }, []);

  const theme = isDark ? 'dark' : 'light';
  
  // Calculate dynamic chart data based on transactions
  const chartData = [
    { name: 'Пн', amount: 0 },
    { name: 'Вт', amount: 0 },
    { name: 'Ср', amount: 0 },
    { name: 'Чт', amount: 0 },
    { name: 'Пт', amount: 0 },
    { name: 'Сб', amount: 0 },
    { name: 'Нд', amount: 0 },
  ];

  if (transactions.length > 0) {
    transactions.forEach(t => {
      if (t.type === 'expense') {
        // Simple mock mapping to days for demo
        const dayIdx = Math.floor(Math.random() * 7);
        chartData[dayIdx].amount += t.amount;
      }
    });
  } else {
    // Default fallback mock data if no real transactions
    chartData[0].amount = 4000;
    chartData[1].amount = 3000;
    chartData[2].amount = 2000;
    chartData[3].amount = 2780;
    chartData[4].amount = 1890;
    chartData[5].amount = 2390;
    chartData[6].amount = 3490;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto pb-24 bg-gray-50 dark:bg-gray-950 transition-colors duration-300 min-h-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Фінанси та Звіти</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Прозорість та планування</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
          />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Завантаження даних...</p>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.01 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-6 relative overflow-hidden transition-colors"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 text-primary dark:text-white">
              <Wallet size={120} />
            </div>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 rounded-2xl">
                <Wallet size={24} />
              </div>
              <button className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1 group">
                Травень 2026 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Поточний баланс</p>
              <div className="text-4xl font-black font-display text-gray-900 dark:text-white tracking-tight">
                {balance.toLocaleString('uk-UA')}.00 <span className="text-lg text-gray-400 dark:text-gray-600 font-bold">₴</span>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">
                  <TrendingUp size={12} /> Дохід
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-tight">+ {monthlyIncome.toLocaleString('uk-UA')} ₴</p>
              </div>
              <div className="w-px bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1 space-y-1 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                  <TrendingDown size={12} /> Витрати
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-tight">- {monthlyExpense.toLocaleString('uk-UA')} ₴</p>
              </div>
            </div>
          </motion.div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 transition-colors">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Динаміка витрат</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1f2937' : '#f3f4f6'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(30, 58, 95, 0.05)' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      backgroundColor: theme === 'dark' ? '#111827' : '#fff',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      color: theme === 'dark' ? '#fff' : '#000'
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : (theme === 'dark' ? '#374151' : '#e5e7eb')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-widest">Останні операції</h3>
              <button className="text-primary dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">Реєстр</button>
            </div>

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 italic">Операцій поки що немає</p>
                </div>
              ) : (
                transactions.map((t, i) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 5 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-gray-900 p-4 rounded-[28px] shadow-sm border border-transparent dark:border-gray-800 hover:border-primary/20 dark:hover:border-primary/40 transition-smooth flex items-center gap-4"
                  >
                    <div className={cn(
                      "p-3 rounded-2xl shrink-0 shadow-sm",
                      t.type === 'income' ? "bg-green-50 dark:bg-green-900/30 text-green-500" : "bg-orange-50 dark:bg-orange-900/30 text-orange-500"
                    )}>
                      {t.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{t.category} • {t.date?.toDate ? t.date.toDate().toLocaleDateString('uk-UA') : String(t.date)}</p>
                    </div>

                    <div className={cn(
                      "font-bold text-sm tracking-tight",
                      t.type === 'income' ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"
                    )}>
                      {t.type === 'income' ? '+' : ''}{t.amount.toLocaleString('uk-UA')} ₴
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Generate Report Button */}
          {canEditFinance && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-14 rounded-3xl bg-primary dark:bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-smooth"
            >
              <FileText size={20} /> Сформувати місячний звіт
            </motion.button>
          )}
        </>
      )}
    </div>
  );
};
