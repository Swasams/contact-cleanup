// The "bag": a shuffled list of every contact ID. Cards are drawn from it,
// so nobody repeats until everyone has been shown once. All functions here
// are pure (state in, new state out) so they are easy to test.

export const DAILY = 10; // cards per deal
export const DAILY_CAP = 100; // after this many in one day, the app says stop

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newState() {
  return {
    v: 1,
    started: false,
    bag: [], // not yet shown this cycle, in shuffled order
    hand: [], // dealt and waiting to be swiped
    seen: [], // kept this cycle
    date: null, // day the current deal belongs to
    done: 0, // cards swiped today
    cycle: 1,
    kept: 0, // lifetime totals
    deleted: 0,
  };
}

const clone = (s) => ({ ...s, bag: [...s.bag], hand: [...s.hand], seen: [...s.seen] });

// Sync saved state with the contact list as it is right now:
// drop people who no longer exist, slip brand-new people into the bag.
export function reconcile(state, ids, rnd = Math.random) {
  const s = clone(state);
  const valid = new Set(ids);
  s.bag = s.bag.filter((id) => valid.has(id));
  s.hand = s.hand.filter((id) => valid.has(id));
  s.seen = s.seen.filter((id) => valid.has(id));
  if (!s.started) {
    s.bag = shuffle(ids, rnd);
    s.started = true;
    return s;
  }
  const known = new Set([...s.bag, ...s.hand, ...s.seen]);
  for (const id of ids) {
    if (!known.has(id)) {
      s.bag.splice(Math.floor(rnd() * (s.bag.length + 1)), 0, id);
    }
  }
  return s;
}

// Take up to n cards from the bag. A deal never crosses from one cycle into
// the next: if the bag runs dry part-way, the deal is just shorter, so there
// is a clear "you've seen everyone" moment. The next deal after that refills
// the bag, reshuffles, and starts the next cycle.
function draw(s, n, ids, rnd) {
  const out = [];
  while (out.length < n) {
    if (s.bag.length === 0) {
      if (out.length > 0) break;
      const inPlay = new Set([...s.hand, ...out]);
      const refill = ids.filter((id) => !inPlay.has(id));
      if (refill.length === 0) break;
      s.bag = shuffle(refill, rnd);
      s.seen = [];
      s.cycle += 1;
    }
    out.push(s.bag.shift());
  }
  return out;
}

// First open of a new day: leftovers come first, then top up to DAILY.
// Skipping days never stacks up extra cards.
export function dealForToday(state, ids, now = new Date(), rnd = Math.random) {
  const t = todayStr(now);
  if (state.date === t) return state;
  const s = clone(state);
  const need = Math.max(0, DAILY - s.hand.length);
  s.hand.push(...draw(s, need, ids, rnd));
  s.date = t;
  s.done = 0;
  return s;
}

// The "+10 more" button.
export function dealMore(state, ids, n = DAILY, rnd = Math.random) {
  const s = clone(state);
  s.hand.push(...draw(s, n, ids, rnd));
  return s;
}

// action: 'keep' | 'delete'
export function swipe(state, id, action) {
  const s = clone(state);
  s.hand = s.hand.filter((x) => x !== id);
  s.done += 1;
  if (action === 'keep') {
    s.seen.push(id);
    s.kept += 1;
  } else {
    s.deleted += 1;
  }
  return s;
}

export function undoSwipe(state, id, action) {
  const s = clone(state);
  s.hand.unshift(id);
  s.done = Math.max(0, s.done - 1);
  if (action === 'keep') {
    s.seen = s.seen.filter((x) => x !== id);
    s.kept = Math.max(0, s.kept - 1);
  } else {
    s.deleted = Math.max(0, s.deleted - 1);
  }
  return s;
}

// Numbers for the progress line.
export function progress(state, total) {
  return {
    todayDone: state.done,
    todayTotal: state.done + state.hand.length,
    seen: Math.min(state.seen.length, total),
    total,
    cycle: state.cycle,
    cycleComplete: state.bag.length === 0 && state.hand.length === 0 && total > 0,
    capReached: state.done + state.hand.length >= DAILY_CAP,
  };
}
