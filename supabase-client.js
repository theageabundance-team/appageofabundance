/**
 * Age of Abundance - Supabase Client
 * Cliente centralizado para persistencia de dados.
 * Mantem localStorage como cache/fallback offline.
 */

const SUPABASE_URL = 'https://uaicoxhobzpinkaqvepk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Jowm5dnurL2PDucXh1hZaQ_OzNBIbmt';

let _supabase = null;
let _userId = null;
let _sdkReady = false;
const _readyCallbacks = [];

// ── SDK Loader ──────────────────────────────────────────────
function _loadSupabaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.supabase) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Supabase SDK'));
    document.head.appendChild(s);
  });
}

async function initSupabase() {
  try {
    await _loadSupabaseSDK();
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    _userId = localStorage.getItem('abundance_user_id') || null;
    _sdkReady = true;
    _readyCallbacks.forEach(cb => cb());
    _readyCallbacks.length = 0;
  } catch (e) {
    console.warn('[Supabase] SDK load failed, using localStorage fallback', e);
    _sdkReady = false;
  }
}

function onSupabaseReady(cb) {
  if (_sdkReady) { cb(); } else { _readyCallbacks.push(cb); }
}

function sb() { return _supabase; }
function getUserId() { return _userId || localStorage.getItem('abundance_user_id'); }
function isOnline() { return _sdkReady && _supabase !== null; }

// ── Helper: today as YYYY-MM-DD ─────────────────────────────
function _sbToday() { return new Date().toISOString().split('T')[0]; }


// ── PROFILES ────────────────────────────────────────────────
async function loginOrCreate(name, email) {
  // Always save to localStorage (cache)
  localStorage.setItem('abundance_name', name);
  localStorage.setItem('abundance_email', email);
  if (!localStorage.getItem('abundance_start_date')) {
    localStorage.setItem('abundance_start_date', _sbToday());
  }

  if (!isOnline()) return null;

  try {
    // Try to find existing profile
    let { data, error } = await sb().from('profiles')
      .select('id, start_date')
      .eq('email', email)
      .maybeSingle();

    if (data) {
      // Update name if changed
      await sb().from('profiles').update({ name }).eq('id', data.id);
      _userId = data.id;
      localStorage.setItem('abundance_user_id', data.id);
      localStorage.setItem('abundance_start_date', data.start_date);
      return data.id;
    }

    // Create new profile
    const startDate = localStorage.getItem('abundance_start_date') || _sbToday();
    const { data: newProfile, error: insertErr } = await sb().from('profiles')
      .insert({ name, email, start_date: startDate })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    _userId = newProfile.id;
    localStorage.setItem('abundance_user_id', newProfile.id);
    return newProfile.id;
  } catch (e) {
    console.warn('[Supabase] loginOrCreate failed', e);
    return null;
  }
}

async function loadProfile() {
  const uid = getUserId();
  if (!isOnline() || !uid) return null;
  try {
    const { data } = await sb().from('profiles')
      .select('*').eq('id', uid).single();
    if (data) {
      localStorage.setItem('abundance_name', data.name);
      localStorage.setItem('abundance_email', data.email);
      localStorage.setItem('abundance_start_date', data.start_date);
    }
    return data;
  } catch (e) {
    console.warn('[Supabase] loadProfile failed', e);
    return null;
  }
}

async function ensureUserIdFromEmail() {
  const uid = getUserId();
  if (uid) return uid;
  const email = localStorage.getItem('abundance_email');
  if (!email || !isOnline()) return null;
  try {
    const { data } = await sb().from('profiles')
      .select('id').eq('email', email).maybeSingle();
    if (data) {
      _userId = data.id;
      localStorage.setItem('abundance_user_id', data.id);
      return data.id;
    }
  } catch (e) { console.warn('[Supabase] ensureUserId failed', e); }
  return null;
}

// ── DAILY PROGRESS ──────────────────────────────────────────
async function saveDailyProgress(practiceKey) {
  // Always save to localStorage
  localStorage.setItem(practiceKey + '_done', _sbToday());

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    await sb().from('daily_progress')
      .upsert({ user_id: uid, practice_key: practiceKey, completed_date: _sbToday() },
        { onConflict: 'user_id,practice_key,completed_date' });
  } catch (e) { console.warn('[Supabase] saveDailyProgress failed', e); }
}

async function isDailyDone(practiceKey) {
  // Check localStorage first (fast)
  const local = localStorage.getItem(practiceKey + '_done');
  if (local === _sbToday()) return true;

  const uid = getUserId();
  if (!isOnline() || !uid) return false;
  try {
    const { data } = await sb().from('daily_progress')
      .select('id')
      .eq('user_id', uid)
      .eq('practice_key', practiceKey)
      .eq('completed_date', _sbToday())
      .maybeSingle();
    if (data) {
      localStorage.setItem(practiceKey + '_done', _sbToday());
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[Supabase] isDailyDone failed', e);
    return local === _sbToday();
  }
}

// ── MODULE PROGRESS ─────────────────────────────────────────
async function saveModuleProgress(moduleId, currentLesson, completedLessons) {
  // Always save to localStorage
  localStorage.setItem('current_lesson_' + moduleId, String(currentLesson));
  localStorage.setItem('completed_lessons_' + moduleId, JSON.stringify(completedLessons));

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    await sb().from('module_progress')
      .upsert({
        user_id: uid,
        module_id: moduleId,
        current_lesson: currentLesson,
        completed_lessons: completedLessons,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,module_id' });
  } catch (e) { console.warn('[Supabase] saveModuleProgress failed', e); }
}

async function getModuleProgress(moduleId) {
  // Start with localStorage
  const local = {
    currentLesson: parseInt(localStorage.getItem('current_lesson_' + moduleId) || '0'),
    completedLessons: JSON.parse(localStorage.getItem('completed_lessons_' + moduleId) || '[]')
  };

  const uid = getUserId();
  if (!isOnline() || !uid) return local;
  try {
    const { data } = await sb().from('module_progress')
      .select('current_lesson, completed_lessons')
      .eq('user_id', uid)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (data) {
      localStorage.setItem('current_lesson_' + moduleId, String(data.current_lesson));
      localStorage.setItem('completed_lessons_' + moduleId, JSON.stringify(data.completed_lessons));
      return { currentLesson: data.current_lesson, completedLessons: data.completed_lessons || [] };
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getModuleProgress failed', e);
    return local;
  }
}

// ── LESSON INTERACTIONS (notes, rating) ─────────────────────
async function saveLessonInteraction(lessonId, notes, rating) {
  // Always save to localStorage
  if (notes !== undefined) localStorage.setItem('notes_' + lessonId, notes);
  if (rating !== undefined) localStorage.setItem('rating_' + lessonId, String(rating));

  if (!isOnline()) return;
  // Ensure user_id is resolved (handles users who logged in before Supabase integration)
  const uid = getUserId() || await ensureUserIdFromEmail();
  if (!uid) return;
  try {
    const payload = { user_id: uid, lesson_id: lessonId, updated_at: new Date().toISOString() };
    if (notes !== undefined) payload.notes = notes;
    if (rating !== undefined) payload.rating = rating;
    await sb().from('lesson_interactions')
      .upsert(payload, { onConflict: 'user_id,lesson_id' });
  } catch (e) { console.warn('[Supabase] saveLessonInteraction failed', e); }
}

// ── LESSON COMMENTS ──────────────────────────────────────────
async function saveComment(lessonId, text, rating, userName) {
  // Always save to localStorage (append to existing)
  const key = 'comments_' + lessonId;
  const comments = JSON.parse(localStorage.getItem(key) || '[]');
  comments.unshift({ name: userName, text, rating, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  localStorage.setItem(key, JSON.stringify(comments));

  if (!isOnline()) return;
  const uid = getUserId() || await ensureUserIdFromEmail();
  if (!uid) return;
  try {
    await sb().from('lesson_comments')
      .insert({ user_id: uid, lesson_id: lessonId, comment_text: text, rating: rating || 0, user_name: userName });
  } catch (e) { console.warn('[Supabase] saveComment failed', e); }
}

async function getLessonComments(lessonId) {
  const local = JSON.parse(localStorage.getItem('comments_' + lessonId) || '[]');
  if (!isOnline()) return local;
  try {
    const { data } = await sb().from('lesson_comments')
      .select('user_name, comment_text, rating, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data && data.length > 0) {
      const remote = data.map(r => ({
        name: r.user_name || 'Member',
        text: r.comment_text,
        rating: r.rating,
        date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      localStorage.setItem('comments_' + lessonId, JSON.stringify(remote));
      return remote;
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getLessonComments failed', e);
    return local;
  }
}

async function getLessonInteraction(lessonId) {
  const local = {
    notes: localStorage.getItem('notes_' + lessonId) || '',
    rating: parseInt(localStorage.getItem('rating_' + lessonId) || '0')
  };

  const uid = getUserId();
  if (!isOnline() || !uid) return local;
  try {
    const { data } = await sb().from('lesson_interactions')
      .select('notes, rating')
      .eq('user_id', uid)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (data) {
      if (data.notes) localStorage.setItem('notes_' + lessonId, data.notes);
      if (data.rating) localStorage.setItem('rating_' + lessonId, String(data.rating));
      return { notes: data.notes || '', rating: data.rating || 0 };
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getLessonInteraction failed', e);
    return local;
  }
}

// ── GIFTS / ACHIEVEMENTS ───────────────────────────────────
async function saveGift(giftId) {
  // Always save to localStorage
  const gifts = JSON.parse(localStorage.getItem('abundance_gifts') || '[]');
  if (!gifts.includes(giftId)) {
    gifts.push(giftId);
    localStorage.setItem('abundance_gifts', JSON.stringify(gifts));
  }

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    await sb().from('user_gifts')
      .upsert({ user_id: uid, gift_id: giftId }, { onConflict: 'user_id,gift_id' });
  } catch (e) { console.warn('[Supabase] saveGift failed', e); }
}

async function getGifts() {
  const local = JSON.parse(localStorage.getItem('abundance_gifts') || '[]');

  const uid = getUserId();
  if (!isOnline() || !uid) return local;
  try {
    const { data } = await sb().from('user_gifts')
      .select('gift_id')
      .eq('user_id', uid);
    if (data && data.length > 0) {
      const giftIds = data.map(r => r.gift_id);
      // Merge with local (union)
      const merged = [...new Set([...local, ...giftIds])];
      localStorage.setItem('abundance_gifts', JSON.stringify(merged));
      return merged;
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getGifts failed', e);
    return local;
  }
}

// ── 21-DAY CHALLENGE ────────────────────────────────────────
async function save21DayProgress(startDate, completedDays, notes) {
  // Always save to localStorage
  if (startDate) localStorage.setItem('21day_start', startDate);
  if (completedDays) localStorage.setItem('21day_completed', JSON.stringify(completedDays));
  if (notes) localStorage.setItem('21day_notes', JSON.stringify(notes));

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    const payload = { user_id: uid, updated_at: new Date().toISOString() };
    if (startDate) payload.start_date = startDate;
    if (completedDays) payload.completed_days = completedDays;
    if (notes) payload.notes = notes;
    await sb().from('challenge_21days')
      .upsert(payload, { onConflict: 'user_id' });
  } catch (e) { console.warn('[Supabase] save21DayProgress failed', e); }
}

async function get21DayProgress() {
  const local = {
    startDate: localStorage.getItem('21day_start') || null,
    completedDays: JSON.parse(localStorage.getItem('21day_completed') || '[]'),
    notes: JSON.parse(localStorage.getItem('21day_notes') || '{}')
  };

  const uid = getUserId();
  if (!isOnline() || !uid) return local;
  try {
    const { data } = await sb().from('challenge_21days')
      .select('start_date, completed_days, notes')
      .eq('user_id', uid)
      .maybeSingle();
    if (data) {
      if (data.start_date) localStorage.setItem('21day_start', data.start_date);
      if (data.completed_days) localStorage.setItem('21day_completed', JSON.stringify(data.completed_days));
      if (data.notes) localStorage.setItem('21day_notes', JSON.stringify(data.notes));
      return {
        startDate: data.start_date,
        completedDays: data.completed_days || [],
        notes: data.notes || {}
      };
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] get21DayProgress failed', e);
    return local;
  }
}

// ── COMMUNITY ───────────────────────────────────────────────
async function saveCommunityReaction(reactionType, date) {
  localStorage.setItem(`cr_${reactionType}_${date}`, '1');

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    const userName = localStorage.getItem('abundance_name') || 'Anonymous';
    await sb().from('community_interactions')
      .insert({ user_id: uid, interaction_date: date, reaction_type: reactionType, user_name: userName });
  } catch (e) { console.warn('[Supabase] saveCommunityReaction failed', e); }
}

async function saveCommunityAmen(text, date) {
  // Save to localStorage
  const existing = JSON.parse(localStorage.getItem(`amens_${date}`) || '[]');
  const userName = localStorage.getItem('abundance_name') || 'Blessed Soul';
  const newAmen = { name: userName, text, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  existing.push(newAmen);
  localStorage.setItem(`amens_${date}`, JSON.stringify(existing));

  const uid = getUserId();
  if (!isOnline() || !uid) return newAmen;
  try {
    await sb().from('community_interactions')
      .insert({ user_id: uid, interaction_date: date, amen_text: text, user_name: userName });
  } catch (e) { console.warn('[Supabase] saveCommunityAmen failed', e); }
  return newAmen;
}

async function getCommunityAmens(date) {
  const local = JSON.parse(localStorage.getItem(`amens_${date}`) || '[]');

  if (!isOnline()) return local;
  try {
    const { data } = await sb().from('community_interactions')
      .select('user_name, amen_text, created_at')
      .eq('interaction_date', date)
      .not('amen_text', 'is', null)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      const amens = data.map(r => ({
        name: r.user_name || 'Blessed Soul',
        text: r.amen_text,
        date: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      localStorage.setItem(`amens_${date}`, JSON.stringify(amens));
      return amens;
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getCommunityAmens failed', e);
    return local;
  }
}

async function getCommunityReactions(date) {
  const uid = getUserId();
  if (!isOnline() || !uid) return {};
  try {
    const { data } = await sb().from('community_interactions')
      .select('reaction_type')
      .eq('user_id', uid)
      .eq('interaction_date', date)
      .not('reaction_type', 'is', null);
    if (data) {
      const reacted = {};
      data.forEach(r => {
        reacted[r.reaction_type] = true;
        localStorage.setItem(`cr_${r.reaction_type}_${date}`, '1');
      });
      return reacted;
    }
    return {};
  } catch (e) {
    console.warn('[Supabase] getCommunityReactions failed', e);
    return {};
  }
}

async function saveCircleMember(isMember) {
  localStorage.setItem('circle_member', String(isMember));
  localStorage.setItem('circle_visited', 'true');

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    await sb().from('profiles')
      .update({ circle_member: isMember })
      .eq('id', uid);
  } catch (e) { console.warn('[Supabase] saveCircleMember failed', e); }
}

// ── JOURNAL ─────────────────────────────────────────────────
async function saveJournalEntry(date, content) {
  // localStorage is handled by journal.html — only persist to Supabase here
  if (!isOnline()) return;
  const uid = getUserId() || await ensureUserIdFromEmail();
  if (!uid) return;
  try {
    await sb().from('journal_entries')
      .upsert({ user_id: uid, entry_date: date, content, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,entry_date' });
  } catch (e) { console.warn('[Supabase] saveJournalEntry failed', e); }
}

async function getJournalEntries() {
  const local = JSON.parse(localStorage.getItem('abundance_journal') || '[]');

  const uid = getUserId();
  if (!isOnline() || !uid) return local;
  try {
    const { data } = await sb().from('journal_entries')
      .select('entry_date, content, updated_at')
      .eq('user_id', uid)
      .order('entry_date', { ascending: false });
    if (data && data.length > 0) {
      const entries = data.map(r => ({ date: r.entry_date, content: r.content }));
      localStorage.setItem('abundance_journal', JSON.stringify(entries));
      return entries;
    }
    return local;
  } catch (e) {
    console.warn('[Supabase] getJournalEntries failed', e);
    return local;
  }
}

async function deleteJournalEntry(date) {
  // Remove from localStorage
  const entries = JSON.parse(localStorage.getItem('abundance_journal') || '[]');
  const filtered = entries.filter(e => e.date !== date);
  localStorage.setItem('abundance_journal', JSON.stringify(filtered));

  const uid = getUserId();
  if (!isOnline() || !uid) return;
  try {
    await sb().from('journal_entries')
      .delete()
      .eq('user_id', uid)
      .eq('entry_date', date);
  } catch (e) { console.warn('[Supabase] deleteJournalEntry failed', e); }
}

// ── MIGRATION: localStorage → Supabase ──────────────────────
async function migrateFromLocalStorage() {
  const uid = getUserId();
  if (!isOnline() || !uid) return;
  if (localStorage.getItem('abundance_migrated') === 'true') return;

  console.log('[Supabase] Starting migration from localStorage...');
  try {
    // 1. Migrate gifts
    const gifts = JSON.parse(localStorage.getItem('abundance_gifts') || '[]');
    for (const giftId of gifts) {
      await sb().from('user_gifts')
        .upsert({ user_id: uid, gift_id: giftId }, { onConflict: 'user_id,gift_id' });
    }

    // 2. Migrate daily progress (only today's)
    const dailyKeys = ['daily_focus', 'divine_truth', 'solomons_wisdom', 'daily_decree'];
    for (const key of dailyKeys) {
      const done = localStorage.getItem(key + '_done');
      if (done) {
        await sb().from('daily_progress')
          .upsert({ user_id: uid, practice_key: key, completed_date: done },
            { onConflict: 'user_id,practice_key,completed_date' });
      }
    }

    // 3. Migrate 21-day challenge
    const day21Start = localStorage.getItem('21day_start');
    if (day21Start) {
      await sb().from('challenge_21days')
        .upsert({
          user_id: uid,
          start_date: day21Start,
          completed_days: JSON.parse(localStorage.getItem('21day_completed') || '[]'),
          notes: JSON.parse(localStorage.getItem('21day_notes') || '{}')
        }, { onConflict: 'user_id' });
    }

    // 4. Migrate circle membership
    if (localStorage.getItem('circle_member') === 'true') {
      await sb().from('profiles')
        .update({ circle_member: true })
        .eq('id', uid);
    }

    // 5. Migrate module progress (scan localStorage for known patterns)
    const moduleIds = [
      'secret-of-power', 'solomon', '7frequencies', 'whisper-faith',
      'age-of-abundance', 'dream-journal', 'mindset-reset', 'sacred-chant',
      'vision-board', 'powerful-numbers', 'prayers-michael'
    ];
    for (const mid of moduleIds) {
      const cl = localStorage.getItem('current_lesson_' + mid);
      const comp = localStorage.getItem('completed_lessons_' + mid);
      if (cl !== null || comp !== null) {
        await sb().from('module_progress')
          .upsert({
            user_id: uid,
            module_id: mid,
            current_lesson: parseInt(cl || '0'),
            completed_lessons: JSON.parse(comp || '[]')
          }, { onConflict: 'user_id,module_id' });
      }
    }

    localStorage.setItem('abundance_migrated', 'true');
    console.log('[Supabase] Migration complete!');
  } catch (e) {
    console.warn('[Supabase] Migration failed (will retry next load)', e);
  }
}

// ── LOGOUT ──────────────────────────────────────────────────
function logoutUser() {
  _userId = null;
  localStorage.removeItem('abundance_user_id');
  localStorage.removeItem('abundance_name');
  localStorage.removeItem('abundance_email');
  localStorage.removeItem('abundance_migrated');
}

// ── AUTO-INIT ───────────────────────────────────────────────
initSupabase().then(() => {
  if (isOnline()) {
    ensureUserIdFromEmail().then(uid => {
      if (uid) migrateFromLocalStorage();
    });
  }
});
