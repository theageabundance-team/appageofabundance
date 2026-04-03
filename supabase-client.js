/**
 * Age of Abundance - Supabase Client (v2 — email as PK)
 * Usa o email como identificador único em todas as tabelas.
 * Mantém localStorage como cache/fallback offline.
 */

const SUPABASE_URL = 'https://uaicoxhobzpinkaqvepk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Jowm5dnurL2PDucXh1hZaQ_OzNBIbmt';

let _supabase = null;
let _initPromise = null;          // singleton — garante init apenas uma vez
let _sdkReady = false;
const _readyCallbacks = [];

// ── SDK Loader ──────────────────────────────────────────────
function initSupabase() {
  if (_initPromise) return _initPromise;
  _initPromise = new Promise((resolve) => {
    if (window.supabase) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      _sdkReady = true;
      _readyCallbacks.forEach(cb => { try { cb(); } catch(e){} });
      _readyCallbacks.length = 0;
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = () => {
      try {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        _sdkReady = true;
        _readyCallbacks.forEach(cb => { try { cb(); } catch(e){} });
        _readyCallbacks.length = 0;
        resolve(true);
      } catch(e) {
        console.warn('[Supabase] createClient failed', e);
        resolve(false);
      }
    };
    s.onerror = () => {
      console.warn('[Supabase] SDK load failed — usando localStorage');
      resolve(false);
    };
    document.head.appendChild(s);
  });
  return _initPromise;
}

/** Registra callback para quando o SDK estiver pronto */
function onSupabaseReady(cb) {
  if (_sdkReady) { try { cb(); } catch(e){} }
  else { _readyCallbacks.push(cb); }
}

function sb() { return _supabase; }
function isOnline() { return _sdkReady && _supabase !== null; }

/** Retorna o email do usuário logado */
function getUserEmail() {
  return localStorage.getItem('abundance_email') || null;
}

/** Helper: today as YYYY-MM-DD */
function _sbToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/** Safe JSON.parse — returns default on null or parse error */
function _safeParse(s, d) { try { return s != null ? JSON.parse(s) : d; } catch(e) { return d; } }

/**
 * Aguarda SDK inicializar e verifica se usuário está logado.
 * @returns {Promise<boolean>} true se pode usar Supabase
 */
async function _ready() {
  await initSupabase();
  return isOnline() && !!getUserEmail();
}


// ── PROFILES ────────────────────────────────────────────────

/**
 * Cria ou atualiza o perfil do usuário no Supabase.
 * Sempre salva em localStorage primeiro (cache).
 * Para usuários existentes, sincroniza start_date do Supabase.
 */
async function loginOrCreate(name, email) {
  // 1. Salva em localStorage imediatamente
  localStorage.setItem('abundance_name', name);
  localStorage.setItem('abundance_email', email);
  if (!localStorage.getItem('abundance_start_date')) {
    localStorage.setItem('abundance_start_date', _sbToday());
  }

  // 2. Aguarda SDK carregar (resolve mesmo se offline)
  const ready = await _ready();
  if (!ready) return null;

  try {
    const startDate = localStorage.getItem('abundance_start_date') || _sbToday();

    // Check if profile already exists
    const { data: existing } = await sb().from('profiles')
      .select('email, name, start_date')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Existing user: update name only — NEVER overwrite start_date
      await sb().from('profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('email', email);
      // Sync original start_date back to localStorage
      if (existing.start_date) {
        localStorage.setItem('abundance_start_date', existing.start_date);
      }
    } else {
      // New user: insert with today as start_date
      await sb().from('profiles')
        .insert({ email, name, start_date: startDate, updated_at: new Date().toISOString() });
    }

    return email;
  } catch (e) {
    console.warn('[Supabase] loginOrCreate failed', e);
    return null;
  }
}

/** Carrega perfil do Supabase e atualiza localStorage */
async function loadProfile() {
  const email = getUserEmail();
  const ready = await _ready();
  if (!ready || !email) return null;
  try {
    const { data } = await sb().from('profiles')
      .select('*').eq('email', email).single();
    if (data) {
      if (data.name) localStorage.setItem('abundance_name', data.name);
      if (data.start_date) localStorage.setItem('abundance_start_date', data.start_date);
      localStorage.setItem('circle_member', String(data.circle_member || false));
    }
    return data;
  } catch (e) {
    console.warn('[Supabase] loadProfile failed', e);
    return null;
  }
}

/**
 * Carrega todos os dados do usuário do Supabase para o localStorage.
 * Chamado após login para hidratar a sessão em qualquer dispositivo.
 */
async function loadAllUserData() {
  const email = getUserEmail();
  const ready = await _ready();
  if (!ready || !email) return;

  try {
    // Perfil (start_date, circle_member)
    await loadProfile();

    // Gifts
    const { data: gifts } = await sb().from('user_gifts')
      .select('gift_id').eq('user_email', email);
    if (gifts && gifts.length > 0) {
      const localGifts = _safeParse(localStorage.getItem('abundance_gifts'), []);
      const merged = [...new Set([...localGifts, ...gifts.map(g => g.gift_id)])];
      localStorage.setItem('abundance_gifts', JSON.stringify(merged));
    }

    // Daily progress (hoje)
    const today = _sbToday();
    const { data: daily } = await sb().from('daily_progress')
      .select('practice_key').eq('user_email', email).eq('completed_date', today);
    if (daily) {
      daily.forEach(r => localStorage.setItem(r.practice_key + '_done', today));
    }

    // Module progress (todos os módulos)
    const { data: modules } = await sb().from('module_progress')
      .select('module_id, current_lesson, completed_lessons').eq('user_email', email);
    if (modules) {
      modules.forEach(r => {
        localStorage.setItem('current_lesson_' + r.module_id, String(r.current_lesson));
        localStorage.setItem('completed_lessons_' + r.module_id, JSON.stringify(r.completed_lessons || []));
      });
    }

    // 21-day challenge
    const { data: challenge } = await sb().from('challenge_21days')
      .select('start_date, completed_days, notes').eq('user_email', email).maybeSingle();
    if (challenge) {
      if (challenge.start_date) localStorage.setItem('21day_start', challenge.start_date);
      if (challenge.completed_days) localStorage.setItem('21day_completed', JSON.stringify(challenge.completed_days));
      if (challenge.notes) localStorage.setItem('21day_notes', JSON.stringify(challenge.notes));
    }

    // Journal entries
    const { data: journal } = await sb().from('journal_entries')
      .select('entry_date, content').eq('user_email', email).order('entry_date', { ascending: false });
    if (journal && journal.length > 0) {
      const entries = journal.map(r => {
        let parsed;
        try { parsed = JSON.parse(r.content); } catch(e) { parsed = { text: r.content }; }
        return { date: r.entry_date, isoDate: r.entry_date, ...parsed };
      });
      localStorage.setItem('abundance_journal', JSON.stringify(entries));
    }

    console.log('[Supabase] loadAllUserData complete');
  } catch (e) {
    console.warn('[Supabase] loadAllUserData partial failure', e);
  }
}


// ── DAILY PROGRESS ──────────────────────────────────────────

async function saveDailyProgress(practiceKey) {
  localStorage.setItem(practiceKey + '_done', _sbToday());

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('daily_progress')
      .upsert({ user_email: email, practice_key: practiceKey, completed_date: _sbToday() },
        { onConflict: 'user_email,practice_key,completed_date' });
  } catch (e) { console.warn('[Supabase] saveDailyProgress failed', e); }
}

async function isDailyDone(practiceKey) {
  const local = localStorage.getItem(practiceKey + '_done');
  if (local === _sbToday()) return true;

  if (!await _ready()) return false;
  const email = getUserEmail();
  try {
    const { data } = await sb().from('daily_progress')
      .select('id')
      .eq('user_email', email)
      .eq('practice_key', practiceKey)
      .eq('completed_date', _sbToday())
      .maybeSingle();
    if (data) {
      localStorage.setItem(practiceKey + '_done', _sbToday());
      return true;
    }
    return false;
  } catch (e) {
    return local === _sbToday();
  }
}


// ── MODULE PROGRESS ─────────────────────────────────────────

async function saveModuleProgress(moduleId, currentLesson, completedLessons) {
  localStorage.setItem('current_lesson_' + moduleId, String(currentLesson));
  localStorage.setItem('completed_lessons_' + moduleId, JSON.stringify(completedLessons));

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('module_progress')
      .upsert({
        user_email: email,
        module_id: moduleId,
        current_lesson: currentLesson,
        completed_lessons: completedLessons,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_email,module_id' });
  } catch (e) { console.warn('[Supabase] saveModuleProgress failed', e); }
}

async function getModuleProgress(moduleId) {
  const local = {
    currentLesson: parseInt(localStorage.getItem('current_lesson_' + moduleId) || '0'),
    completedLessons: _safeParse(localStorage.getItem('completed_lessons_' + moduleId), [])
  };

  if (!await _ready()) return local;
  const email = getUserEmail();
  try {
    const { data } = await sb().from('module_progress')
      .select('current_lesson, completed_lessons')
      .eq('user_email', email)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (data) {
      localStorage.setItem('current_lesson_' + moduleId, String(data.current_lesson));
      localStorage.setItem('completed_lessons_' + moduleId, JSON.stringify(data.completed_lessons || []));
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
  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    const payload = { user_email: email, lesson_id: lessonId, updated_at: new Date().toISOString() };
    if (notes !== undefined) payload.notes = notes;
    if (rating !== undefined) payload.rating = rating;
    await sb().from('lesson_interactions')
      .upsert(payload, { onConflict: 'user_email,lesson_id' });
  } catch (e) { console.warn('[Supabase] saveLessonInteraction failed', e); }
}

async function getLessonInteraction(lessonId) {
  if (!await _ready()) return { notes: '', rating: 0 };
  const email = getUserEmail();
  try {
    const { data } = await sb().from('lesson_interactions')
      .select('notes, rating')
      .eq('user_email', email)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    return { notes: (data && data.notes) || '', rating: (data && data.rating) || 0 };
  } catch (e) {
    console.warn('[Supabase] getLessonInteraction failed', e);
    return { notes: '', rating: 0 };
  }
}


// ── LESSON COMMENTS ──────────────────────────────────────────

async function saveComment(lessonId, text, rating, userName) {
  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('lesson_comments')
      .insert({ user_email: email, lesson_id: lessonId, comment_text: text, rating: rating || 0, user_name: userName });
  } catch (e) { console.warn('[Supabase] saveComment failed', e); }
}

async function getLessonComments(lessonId) {
  if (!await _ready()) return [];
  try {
    const { data } = await sb().from('lesson_comments')
      .select('user_name, comment_text, rating, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(50);
    return (data || []).map(r => ({
      name: r.user_name || 'Member',
      text: r.comment_text,
      rating: r.rating,
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  } catch (e) {
    console.warn('[Supabase] getLessonComments failed', e);
    return [];
  }
}


// ── GIFTS / ACHIEVEMENTS ────────────────────────────────────

async function saveGift(giftId) {
  const gifts = _safeParse(localStorage.getItem('abundance_gifts'), []);
  if (!gifts.includes(giftId)) {
    gifts.push(giftId);
    localStorage.setItem('abundance_gifts', JSON.stringify(gifts));
  }

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('user_gifts')
      .upsert({ user_email: email, gift_id: giftId }, { onConflict: 'user_email,gift_id' });
  } catch (e) { console.warn('[Supabase] saveGift failed', e); }
}

async function getGifts() {
  const local = _safeParse(localStorage.getItem('abundance_gifts'), []);

  if (!await _ready()) return local;
  const email = getUserEmail();
  try {
    const { data } = await sb().from('user_gifts')
      .select('gift_id').eq('user_email', email);
    if (data && data.length > 0) {
      const giftIds = data.map(r => r.gift_id);
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
  if (startDate) localStorage.setItem('21day_start', startDate);
  if (completedDays) localStorage.setItem('21day_completed', JSON.stringify(completedDays));
  if (notes) localStorage.setItem('21day_notes', JSON.stringify(notes));

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    const payload = { user_email: email, updated_at: new Date().toISOString() };
    if (startDate) payload.start_date = startDate;
    if (completedDays) payload.completed_days = completedDays;
    if (notes) payload.notes = notes;
    await sb().from('challenge_21days')
      .upsert(payload, { onConflict: 'user_email' });
  } catch (e) { console.warn('[Supabase] save21DayProgress failed', e); }
}

async function get21DayProgress() {
  const local = {
    startDate: localStorage.getItem('21day_start') || null,
    completedDays: _safeParse(localStorage.getItem('21day_completed'), []),
    notes: _safeParse(localStorage.getItem('21day_notes'), {})
  };

  if (!await _ready()) return local;
  const email = getUserEmail();
  try {
    const { data } = await sb().from('challenge_21days')
      .select('start_date, completed_days, notes')
      .eq('user_email', email)
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

  if (!await _ready()) return;
  const email = getUserEmail();
  const userName = localStorage.getItem('abundance_name') || 'Anonymous';
  try {
    await sb().from('community_interactions')
      .upsert(
        { user_email: email, interaction_date: date, reaction_type: reactionType, user_name: userName },
        { onConflict: 'user_email,interaction_date,reaction_type' }
      );
  } catch (e) { console.warn('[Supabase] saveCommunityReaction failed', e); }
}

async function saveCommunityAmen(text, date) {
  const userName = localStorage.getItem('abundance_name') || 'Blessed Soul';
  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('community_interactions')
      .insert({ user_email: email, interaction_date: date, amen_text: text, user_name: userName });
  } catch (e) { console.warn('[Supabase] saveCommunityAmen failed', e); }
}

async function getCommunityAmens(date) {
  const local = _safeParse(localStorage.getItem(`amens_${date}`), []);

  if (!await _ready()) return local;
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
  if (!await _ready()) return {};
  const email = getUserEmail();
  try {
    const { data } = await sb().from('community_interactions')
      .select('reaction_type')
      .eq('user_email', email)
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

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('profiles')
      .update({ circle_member: isMember, updated_at: new Date().toISOString() })
      .eq('email', email);
  } catch (e) { console.warn('[Supabase] saveCircleMember failed', e); }
}


// ── JOURNAL ─────────────────────────────────────────────────

async function saveJournalEntry(date, content) {
  // localStorage é gerenciado pelo journal.html — aqui só persiste no Supabase
  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('journal_entries')
      .upsert(
        { user_email: email, entry_date: date, content, updated_at: new Date().toISOString() },
        { onConflict: 'user_email,entry_date' }
      );
  } catch (e) { console.warn('[Supabase] saveJournalEntry failed', e); }
}

async function getJournalEntries() {
  const local = _safeParse(localStorage.getItem('abundance_journal'), []);

  if (!await _ready()) return local;
  const email = getUserEmail();
  try {
    const { data } = await sb().from('journal_entries')
      .select('entry_date, content, updated_at')
      .eq('user_email', email)
      .order('entry_date', { ascending: false });
    if (data && data.length > 0) {
      const entries = data.map(r => {
        let parsed;
        try { parsed = JSON.parse(r.content); } catch(e) { parsed = { text: r.content }; }
        return { date: r.entry_date, isoDate: r.entry_date, ...parsed };
      });
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
  const entries = _safeParse(localStorage.getItem('abundance_journal'), []);
  localStorage.setItem('abundance_journal', JSON.stringify(entries.filter(e => e.date !== date)));

  if (!await _ready()) return;
  const email = getUserEmail();
  try {
    await sb().from('journal_entries')
      .delete()
      .eq('user_email', email)
      .eq('entry_date', date);
  } catch (e) { console.warn('[Supabase] deleteJournalEntry failed', e); }
}


// ── MIGRATION: localStorage → Supabase ──────────────────────
async function migrateFromLocalStorage() {
  if (localStorage.getItem('abundance_migrated_v2') === 'true') return;
  if (!await _ready()) return;

  const email = getUserEmail();
  console.log('[Supabase] Starting migration from localStorage...');
  try {
    // 1. Gifts
    const gifts = _safeParse(localStorage.getItem('abundance_gifts'), []);
    for (const giftId of gifts) {
      await sb().from('user_gifts')
        .upsert({ user_email: email, gift_id: giftId }, { onConflict: 'user_email,gift_id' });
    }

    // 2. Daily progress (apenas datas salvas)
    const dailyKeys = ['daily_focus', 'divine_truth', 'solomons_wisdom', 'daily_decree'];
    for (const key of dailyKeys) {
      const done = localStorage.getItem(key + '_done');
      if (done) {
        await sb().from('daily_progress')
          .upsert({ user_email: email, practice_key: key, completed_date: done },
            { onConflict: 'user_email,practice_key,completed_date' });
      }
    }

    // 3. 21-day challenge
    const day21Start = localStorage.getItem('21day_start');
    if (day21Start) {
      await sb().from('challenge_21days')
        .upsert({
          user_email: email,
          start_date: day21Start,
          completed_days: _safeParse(localStorage.getItem('21day_completed'), []),
          notes: _safeParse(localStorage.getItem('21day_notes'), {})
        }, { onConflict: 'user_email' });
    }

    // 4. Circle membership
    if (localStorage.getItem('circle_member') === 'true') {
      await sb().from('profiles')
        .update({ circle_member: true, updated_at: new Date().toISOString() })
        .eq('email', email);
    }

    // 5. Module progress
    const moduleIds = [
      'secret-of-power', 'king-solomon', '7-frequencies', 'whisper-faith',
      'age-of-abundance', 'dream-journal', 'mindset-reset', 'sacred-chant',
      'vision-board', 'powerful-numbers', 'prayers-michael'
    ];
    for (const mid of moduleIds) {
      const cl = localStorage.getItem('current_lesson_' + mid);
      const comp = localStorage.getItem('completed_lessons_' + mid);
      if (cl !== null || comp !== null) {
        await sb().from('module_progress')
          .upsert({
            user_email: email,
            module_id: mid,
            current_lesson: parseInt(cl || '0'),
            completed_lessons: _safeParse(comp, [])
          }, { onConflict: 'user_email,module_id' });
      }
    }

    localStorage.setItem('abundance_migrated_v2', 'true');
    console.log('[Supabase] Migration complete!');
  } catch (e) {
    console.warn('[Supabase] Migration failed (will retry next load)', e);
  }
}


// ── LOGOUT ──────────────────────────────────────────────────
function logoutUser() {
  localStorage.clear();
}


// ── AUTO-INIT ───────────────────────────────────────────────
initSupabase().then(() => {
  if (isOnline() && getUserEmail()) {
    migrateFromLocalStorage();
  }
});
