import { supabase } from '../supabaseClient';

export const THEME_KEY = 'streakflow_theme';

// ─── Helpers ────────────────────────────────────────────────────────────────
export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const getYesterdayStr = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

export const isCompletedToday = (lastCompletedDate) =>
  lastCompletedDate === getTodayStr();

export const calculateNewStreak = (lastCompletedDate, currentStreak) => {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  if (lastCompletedDate === today) return currentStreak;
  if (lastCompletedDate === yesterday) return currentStreak + 1;
  return 1;
};

// ─── Map Supabase row → App habit object ────────────────────────────────────
const toAppHabit = (row, history = []) => ({
  id: row.id,
  name: row.name,
  category: row.category || '',
  timeLimit: row.time_limit || 15,
  currentStreak: row.current_streak || 0,
  lastCompletedDate: row.last_completed_date || null,
  createdAt: row.created_at,
  isActive: row.is_active !== false, // Treat true and null as active
  history,
});

// ─── Habits ─────────────────────────────────────────────────────────────────
export const loadHabits = async (userId) => {
  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) { console.error('loadHabits:', error); return []; }
  if (!habits || habits.length === 0) return [];

  // Fetch completion history for all habits
  const habitIds = habits.map(h => h.id);
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date')
    .in('habit_id', habitIds);

  const historyMap = {};
  (completions || []).forEach(c => {
    if (!historyMap[c.habit_id]) historyMap[c.habit_id] = [];
    historyMap[c.habit_id].push(c.completed_date);
  });

  return habits.map(h => toAppHabit(h, historyMap[h.id] || []));
};

export const saveHabit = async (userId, habit) => {
  const row = {
    user_id: userId,
    name: habit.name,
    category: habit.category || '',
    time_limit: habit.timeLimit || 15,
    current_streak: habit.currentStreak || 0,
    last_completed_date: habit.lastCompletedDate || null,
    is_active: habit.isActive !== undefined ? habit.isActive : true,
  };

  if (habit.id) {
    // Update existing
    const { data, error } = await supabase
      .from('habits')
      .update(row)
      .eq('id', habit.id)
      .select()
      .single();
    if (error) {
      console.error('saveHabit update:', error);
      if (error.code === '42703') {
        const { is_active, ...rowWithoutActive } = row;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('habits')
          .update(rowWithoutActive)
          .eq('id', habit.id)
          .select()
          .single();
        if (fallbackError) return null;
        return toAppHabit(fallbackData, habit.history || []);
      }
      return null;
    }
    return toAppHabit(data, habit.history || []);
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...row, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      console.error('saveHabit insert:', error);
      // If the error is that the column doesn't exist, try saving without it
      if (error.code === '42703') {
        const { is_active, ...rowWithoutActive } = row;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('habits')
          .insert({ ...rowWithoutActive, created_at: new Date().toISOString() })
          .select()
          .single();
        if (fallbackError) {
          console.error('saveHabit fallback insert failed:', fallbackError);
          return null;
        }
        return toAppHabit(fallbackData, []);
      }
      return null;
    }
    return toAppHabit(data, []);
  }
};

export const deleteHabit = async (habitId) => {
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  if (error) console.error('deleteHabit:', error);
};

export const completeHabitInDB = async (userId, habit) => {
  const today = getTodayStr();

  // Upsert completion record
  await supabase.from('habit_completions').upsert({
    habit_id: habit.id,
    user_id: userId,
    completed_date: today,
  }, { onConflict: 'habit_id,completed_date', ignoreDuplicates: true });

  const newStreak = calculateNewStreak(habit.lastCompletedDate, habit.currentStreak);

  // Update habit's streak
  const { data, error } = await supabase
    .from('habits')
    .update({ current_streak: newStreak, last_completed_date: today })
    .eq('id', habit.id)
    .select()
    .single();

  if (error) { console.error('completeHabitInDB:', error); return habit; }

  const history = [...(habit.history || []).filter(d => d !== today), today];
  return toAppHabit(data, history);
};

// ─── Profile ─────────────────────────────────────────────────────────────────
export const loadProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return { name: 'Friend', age: '', occupation: '' };
  return { name: data.name || 'Friend', age: data.age || '', occupation: data.occupation || '' };
};

export const saveProfile = async (userId, profile) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
  if (error) console.error('saveProfile:', error);
};

// ─── Process habits on load (deactivate missed and reset streaks) ──────────
export const processHabitsOnLoad = (habits) => {
  const yesterday = getYesterdayStr();
  const today = getTodayStr();

  return habits.map(habit => {
    // 1. Identify if it was missed yesterday
    // If it was created before today and last completed before yesterday (or never)
    const creationDate = habit.createdAt ? habit.createdAt.split('T')[0] : today;
    const wasCreatedBeforeToday = creationDate < today;
    const wasNotCompletedYesterday = !habit.history?.includes(yesterday);
    const wasNotCompletedToday = !habit.history?.includes(today);

    // If it's currently active and was missed yesterday, deactivate it
    if (habit.isActive && wasCreatedBeforeToday && wasNotCompletedYesterday && wasNotCompletedToday) {
      return { ...habit, isActive: false, currentStreak: 0 };
    }

    // 2. Legacy streak reset (for habits that stay active but skipped a day)
    // Actually, with the new rule, habits that skip a day are deactivated.
    // But if we ever allow recurring habits that skip days, we keep this.
    if (
      habit.lastCompletedDate &&
      habit.lastCompletedDate !== today &&
      habit.lastCompletedDate !== yesterday
    ) {
      return { ...habit, currentStreak: 0 };
    }

    return habit;
  });
};

export const deactivateHabits = async (userId, habitIds) => {
  if (!habitIds || habitIds.length === 0) return;
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false, current_streak: 0 })
    .in('id', habitIds)
    .eq('user_id', userId);
  if (error) console.error('deactivateHabits:', error);
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getStats = (habits, period = 'weekly') => {
  const today = new Date();
  let daysToLookBack = 7;
  if (period === 'monthly') daysToLookBack = 30;
  if (period === 'yearly') daysToLookBack = 365;

  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() - daysToLookBack);
  // Set to start of day for accurate comparison
  thresholdDate.setHours(0, 0, 0, 0);
  const thresholdStr = thresholdDate.toISOString().split('T')[0];

  let totalPossible = 0;
  let totalDone = 0;

  habits.forEach(habit => {
    const completionsInPeriod = (habit.history || []).filter(d => d >= thresholdStr).length;
    totalDone += completionsInPeriod;

    // Calculate possible days since creation or threshold
    const creationDate = new Date(habit.createdAt);
    creationDate.setHours(0, 0, 0, 0);

    const startDate = creationDate > thresholdDate ? creationDate : thresholdDate;

    // Calculate days between startDate and "yesterday" (since today isn't failed yet)
    // Or between startDate and today if we want to include today's possibility
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - startDate;
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // If it's completed today, we count today as a possible day
    const isDoneToday = isCompletedToday(habit.lastCompletedDate);
    const possibleForHabit = diffDays + (isDoneToday ? 1 : 0);

    totalPossible += possibleForHabit;
  });

  const failedCount = Math.max(0, totalPossible - totalDone);

  return {
    completed: totalDone,
    failed: failedCount,
    possible: totalPossible,
    rate: totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0,
  };
};

// ─── Quotes ──────────────────────────────────────────────────────────────────
export const MOTIVATIONAL_QUOTES = [
  "Consistency is what transforms average into excellence.",
  "Your future is created by what you do today, not tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "Small daily improvements over time lead to stunning results.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Discipline is choosing between what you want now and what you want most.",
  "The secret of your future is hidden in your daily routine.",
  "You don't have to be great to start, but you have to start to be great.",
];
