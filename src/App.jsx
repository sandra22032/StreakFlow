import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  Plus,
  Trash2,
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  X,
  Edit2,
  Clock,
  Moon,
  Sun,
  User,
  Share2,
  Quote,
  ChevronRight,
  ChevronDown,
  Menu,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import {
  loadHabits,
  saveHabit,
  deleteHabit as deleteHabitFromDB,
  completeHabitInDB,
  loadProfile,
  saveProfile,
  getTodayStr,
  calculateNewStreak,
  isCompletedToday,
  processHabitsOnLoad,
  getStats,
  MOTIVATIONAL_QUOTES
} from './utils/habitUtils';
import { supabase } from './supabaseClient';
import './index.css';

// --- Sub-components ---

const CategoryChipSelector = ({ value, onChange, options }) => {
  return (
    <div className="category-chip-grid">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`category-chip ${value === option.value ? 'selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <span style={{ fontSize: '1.1rem' }}>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: color }}>{value}</div>
      </div>
      {Icon && <Icon size={20} color={color || 'var(--text-muted)'} style={{ opacity: 0.6 }} />}
    </div>
  </div>
);

const HabitCard = ({ habit, onComplete, onDelete, onEdit }) => {
  const completed = isCompletedToday(habit.lastCompletedDate);

  return (
    <div className={`habit-card ${completed ? 'completed' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {habit.category && <span className="category-tag">{habit.category}</span>}
            {habit.timeLimit && (
              <span className="category-tag" style={{ background: 'rgba(224, 122, 95, 0.1)', color: 'var(--primary)', textTransform: 'none' }}>
                <Clock size={10} style={{ marginRight: '2px' }} />
                {habit.timeLimit >= 60
                  ? `${Math.floor(habit.timeLimit / 60)}h ${habit.timeLimit % 60}m`
                  : `${habit.timeLimit}m`}
              </span>
            )}
          </div>
          <div className="habit-name">{habit.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {!completed && (
            <button className="btn btn-ghost" onClick={() => onEdit(habit)} style={{ padding: '0.25rem', height: 'auto', minWidth: 'auto' }}>
              <Edit2 size={16} />
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onDelete(habit.id)} style={{ padding: '0.25rem', height: 'auto', minWidth: 'auto' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="habit-streak" style={{ margin: '1rem 0' }}>
        <Flame size={18} fill={habit.currentStreak > 0 ? "var(--streak)" : "transparent"} color="var(--streak)" />
        <span>{habit.currentStreak} day streak</span>
      </div>

      <button
        className={`btn ${completed ? 'btn-success' : 'btn-primary'}`}
        onClick={() => onComplete(habit.id)}
        disabled={completed}
        style={{ width: '100%', marginTop: 'auto' }}
      >
        {completed ? (
          <><CheckCircle2 size={18} /> Done Today</>
        ) : (
          'Complete Habit'
        )}
      </button>
    </div>
  );
};

const HabitModal = ({ isOpen, onClose, onSave, editingHabit }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setCategory(editingHabit.category || '');
      setTimeLimit(editingHabit.timeLimit || 15);
    } else {
      setName('');
      setCategory('');
      setTimeLimit(15);
    }
  }, [editingHabit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, category, timeLimit, id: editingHabit?.id });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{editingHabit ? 'Edit Habit' : 'New Habit'}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem', height: 'auto', minWidth: 'auto' }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Habit Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Read for 30 mins"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <CategoryChipSelector
              value={category}
              onChange={setCategory}
              options={[
                { value: 'Learning', label: 'Learning', icon: '📚' },
                { value: 'Productivity', label: 'Productivity', icon: '🚀' },
                { value: 'Fitness', label: 'Fitness', icon: '💪' },
                { value: 'Health', label: 'Health', icon: '🏥' },
                { value: 'Mindfulness', label: 'Mindfulness', icon: '🧘' },
                { value: 'Work', label: 'Work', icon: '💼' },
                { value: 'Personal', label: 'Personal', icon: '❤️' },
                { value: 'Finance', label: 'Finance', icon: '💰' },
              ]}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="form-label">Daily Time Limit</label>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                {timeLimit >= 60
                  ? `${Math.floor(timeLimit / 60)}h ${timeLimit % 60}m`
                  : `${timeLimit} mins`}
              </span>
            </div>
            <div className="time-scroll-container">
              {[1, ...Array.from({ length: 288 }, (_, i) => (i + 1) * 5)].map(val => (
                <div
                  key={val}
                  className={`time-option ${timeLimit === val ? 'selected' : ''}`}
                  onClick={() => setTimeLimit(val)}
                  ref={el => { if (timeLimit === val && el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }}
                >
                  {val >= 60
                    ? `${Math.floor(val / 60)}h ${val % 60}m`
                    : `${val} min`}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {editingHabit ? 'Update Habit' : 'Create Habit'}
          </button>
        </form>
      </div>
    </div>
  );
};

const RandomTaskWheel = ({ habits, onAddHabit }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [added, setAdded] = useState(false);

  const defaultTasks = [
    "Read 10 pages of a book",
    "Do 20 pushups",
    "Meditate for 5 minutes",
    "Clean your desk",
    "Write in your journal",
    "Drink a glass of water",
    "Call a friend or family member",
    "Take a 10-minute walk",
    "Plan your tomorrow",
    "Learn 5 new words",
    "Declutter one drawer",
    "Listen to a podcast",
    "Practice deep breathing",
    "Stretch for 5 minutes",
    "Review your weekly goals"
  ];

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setAdded(false);

    setTimeout(() => {
      const habitNames = habits.map(h => h.name);
      const pool = [...new Set([...habitNames, ...defaultTasks])];

      const available = pool.filter(name => name !== result?.name);
      const randomName = available[Math.floor(Math.random() * available.length)];

      setResult({ name: randomName });
      setSpinning(false);
    }, 2000);
  };

  const handleAdd = () => {
    if (!result || added) return;
    onAddHabit({ name: result.name });
    setAdded(true);
  };

  return (
    <>
      <button
        className="wheel-toggle-btn"
        onClick={() => { setShowModal(true); setResult(null); setAdded(false); }}
        title="Can't decide? Spin the wheel!"
      >
        <div className="wheel-icon">🎡</div>
        <span className="wheel-tooltip">Decide for me</span>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal wheel-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>The Wheel of Focus</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get a unique challenge</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '0.25rem', height: 'auto', minWidth: 'auto' }}>
                <X size={20} />
              </button>
            </div>

            <div className="wheel-container">
              <div className={`wheel ${spinning ? 'spinning' : ''}`}>
                <div className="wheel-center"></div>
                <div className="wheel-pointer"></div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              {result ? (
                <div className="result-container animate-fade-in" style={{ padding: '1.5rem', background: added ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-main)', borderRadius: '1rem', border: added ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Your unique task:</p>
                  <h3 style={{ fontSize: '1.5rem', color: added ? 'var(--success)' : 'var(--primary)', marginBottom: '1.5rem' }}>{result.name}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className={`btn ${added ? 'btn-success' : 'btn-primary'}`}
                      onClick={handleAdd}
                      disabled={added}
                      style={{ flex: 2 }}
                    >
                      {added ? <><CheckCircle2 size={18} /> Added</> : 'Add to My Day'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={spin}
                      disabled={spinning}
                      style={{ flex: 1, border: '1px solid var(--border)' }}
                    >
                      Spin Again
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: spinning ? '0' : '2rem' }}>
                    {spinning ? "Selecting your unique task..." : "Let the wheel pick one thing for you to crush!"}
                  </p>
                  {!spinning && (
                    <button
                      className="btn btn-primary"
                      onClick={spin}
                      style={{ width: '200px' }}
                    >
                      Spin the Wheel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ProfileModal = ({ isOpen, onClose, profile, onSave }) => {
  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Your Profile</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem', height: 'auto', minWidth: 'auto' }}>
            <X size={20} />
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Age</label>
            <input
              type="number"
              className="form-input"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Occupation</label>
            <input
              className="form-input"
              value={formData.occupation}
              onChange={e => setFormData({ ...formData, occupation: e.target.value })}
            />
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={() => { onSave(formData); onClose(); }}
        >
          Save Details
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [habits, setHabits] = useState([]);
  const [profile, setProfile] = useState({ name: 'User', age: '', occupation: '' });
  const [theme, setTheme] = useState(localStorage.getItem('streakflow_theme') || 'light');
  const [statsPeriod, setStatsPeriod] = useState('weekly');
  const [quote, setQuote] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [currentView, setCurrentView] = useState('home');

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data once user is known
  useEffect(() => {
    if (!user) return;
    const initialize = async () => {
      const [loadedHabits, loadedProfile] = await Promise.all([
        loadHabits(user.id),
        loadProfile(user.id),
      ]);
      setHabits(processHabitsOnLoad(loadedHabits));
      setProfile(loadedProfile);
    };
    initialize();
    document.documentElement.setAttribute('data-theme', theme);

    const initialQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(initialQuote);
    const hideTimeout = setTimeout(() => setQuote(''), 7000);
    const quoteInterval = setInterval(() => {
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setQuote(randomQuote);
      setTimeout(() => setQuote(''), 7000);
    }, 40000);
    return () => { clearInterval(quoteInterval); clearTimeout(hideTimeout); };
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('streakflow_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSaveHabit = async (data) => {
    if (!user) return;
    const saved = await saveHabit(user.id, data);
    if (!saved) return;
    if (data.id) {
      setHabits(habits.map(h => h.id === saved.id ? saved : h));
    } else {
      setHabits([...habits, saved]);
    }
    setEditingHabit(null);
  };

  const completeHabit = async (id) => {
    if (!user) return;
    const habit = habits.find(h => h.id === id);
    if (!habit || isCompletedToday(habit.lastCompletedDate)) return;
    const updated = await completeHabitInDB(user.id, habit);
    setHabits(habits.map(h => h.id === id ? updated : h));
  };

  const deleteHabit = async (id) => {
    if (!window.confirm('Delete this habit and all its progress?')) return;
    await deleteHabitFromDB(id);
    setHabits(habits.filter(h => h.id !== id));
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut();
      setHabits([]);
      setProfile({ name: 'Friend', age: '', occupation: '' });
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const totalHabits = habits.length;
  const completedTodayCount = habits.filter(h => isCompletedToday(h.lastCompletedDate)).length;
  const completionRate = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;
  const currentStats = getStats(habits, statsPeriod);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost menu-btn" onClick={() => setIsMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="logo" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
            <Flame size={28} strokeWidth={3} fill="#3B82F6" color="#3B82F6" />
            <span>StreakFlow</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </nav>

      {currentView === 'home' ? (
        <>
          <div className="welcome-section" style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem' }}>Hello, {profile.name || 'User'} 👋</h1>
            <p style={{ color: 'var(--text-muted)' }}>Ready to win the day?</p>
          </div>

          <div className="stats-grid">
            <StatCard label="Total Habits" value={totalHabits} icon={Target} />
            <StatCard label="Done Today" value={completedTodayCount} color="var(--success)" icon={CheckCircle2} />
            <StatCard label="Top Streak" value={Math.max(...habits.map(h => h.currentStreak), 0) + "d"} color="var(--streak)" icon={TrendingUp} />
            <StatCard label="Focus Time" value={(habits.reduce((acc, h) => acc + (h.timeLimit || 0), 0)) + "m"} icon={Clock} />
          </div>

          {habits.length > 0 && (
            <div className="daily-progress-container">
              <div className="progress-header">
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Daily Progress</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{completionRate}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {completedTodayCount === totalHabits
                  ? "🎉 Amazing! You've crushed all your goals for today!"
                  : `You've completed ${completedTodayCount} out of ${totalHabits} habits today.`}
              </p>
            </div>
          )}

          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2>Today's Focus</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--border)', padding: '0.1rem 0.6rem', borderRadius: '1rem' }}>
                <Calendar size={12} />
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {habits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-card)', borderRadius: '1.25rem', border: '2px dashed var(--border)' }}>
              <Target size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3>No habits yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>Build consistency by tracking your daily routines. Add your first habit to start!</p>
              <button className="btn btn-primary" onClick={() => setIsHabitModalOpen(true)} style={{ margin: '1.5rem auto 0' }}>
                <Plus size={18} /> Create Habit
              </button>
            </div>
          ) : (
            <>
              <div className="habit-grid">
                {habits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={completeHabit}
                    onDelete={deleteHabit}
                    onEdit={(h) => { setEditingHabit(h); setIsHabitModalOpen(true); }}
                  />
                ))}
              </div>
              <button
                className="btn btn-outline add-habit-btn"
                onClick={() => { setEditingHabit(null); setIsHabitModalOpen(true); }}
              >
                <Plus size={18} /> Add New Habit
              </button>
            </>
          )}
          {quote && (
            <div className="quote-popup">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Quote size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Daily Motivation</span>
              </div>
              <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-main)' }}>"{quote}"</p>
            </div>
          )}

          <RandomTaskWheel habits={habits} onAddHabit={handleSaveHabit} />
        </>
      ) : (
        <div className="analytics-page animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button className="btn btn-ghost" onClick={() => setCurrentView('home')} style={{ padding: '0.5rem' }}>
              <ArrowLeft size={24} />
            </button>
            <h1 style={{ fontSize: '2rem' }}>Performance Analytics</h1>
          </div>

          <div className="stats-section" style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-header">
                  <div className="analytics-type">Weekly Stats</div>
                  <div className="analytics-value" style={{ color: '#3B82F6' }}>{getStats(habits, 'weekly').rate}%</div>
                </div>
                <div className="analytics-bar-bg">
                  <div className="analytics-bar-fill" style={{ width: `${getStats(habits, 'weekly').rate}%`, backgroundColor: '#3B82F6' }}></div>
                </div>
                <div className="analytics-footer">
                  <span>{getStats(habits, 'weekly').completed} completed</span>
                  <span>Last 7 days</span>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-header">
                  <div className="analytics-type">Monthly Stats</div>
                  <div className="analytics-value" style={{ color: '#8B5CF6' }}>{getStats(habits, 'monthly').rate}%</div>
                </div>
                <div className="analytics-bar-bg">
                  <div className="analytics-bar-fill" style={{ width: `${getStats(habits, 'monthly').rate}%`, backgroundColor: '#8B5CF6' }}></div>
                </div>
                <div className="analytics-footer">
                  <span>{getStats(habits, 'monthly').completed} completed</span>
                  <span>Last 30 days</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Detailed Breakdown</h3>
              <div className="stats-grid">
                <StatCard label="Consistency Score" value={completionRate + "%"} color="var(--primary)" icon={Target} />
                <StatCard label="Total Completions" value={habits.reduce((acc, h) => acc + (h.history?.length || 0), 0)} color="#3B82F6" icon={CheckCircle2} />
                <StatCard label="Active Streaks" value={habits.filter(h => h.currentStreak > 0).length} color="var(--streak)" icon={Flame} />
                <StatCard label="Historical Peak" value={Math.max(...habits.map(h => h.currentStreak), 0) + "d"} icon={TrendingUp} />
              </div>
            </div>
          </div>
        </div>
      )
      }

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setEditingHabit(null); }}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSave={(data) => { setProfile(data); if (user) saveProfile(user.id, data); }}
      />

      {
        isMenuOpen && (
          <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <div className="side-menu" onClick={e => e.stopPropagation()}>
              <div className="menu-header">
                <div className="logo">
                  <Flame size={24} fill="#3B82F6" color="#3B82F6" />
                  <span>StreakFlow</span>
                </div>
                <button className="btn btn-ghost" onClick={() => setIsMenuOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="menu-content">
                <button className="menu-item" onClick={() => { setCurrentView('analytics'); setIsMenuOpen(false); }}>
                  <div className="menu-item-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <BarChart3 size={20} color="#3B82F6" />
                  </div>
                  <span>Performance Analytics</span>
                </button>

                <button className="menu-item" onClick={() => { setIsProfileModalOpen(true); setIsMenuOpen(false); }}>
                  <div className="menu-item-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <User size={20} color="#8B5CF6" />
                  </div>
                  <span>Profile Settings</span>
                </button>

                <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border)' }}></div>

                <button className="menu-item logout" onClick={handleLogout}>
                  <div className="menu-item-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <LogOut size={20} color="#EF4444" />
                  </div>
                  <span>Logout</span>
                </button>
              </div>

              <div className="menu-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                  <Flame size={14} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>StreakFlow v1.0</span>
                </div>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}
