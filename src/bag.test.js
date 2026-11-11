import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, reconcile, dealForToday, dealMore, swipe, undoSwipe, progress, bonusDue, pickFavorites, DAILY } from './bag.js';

const ids = (n, prefix = 'c') => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const day = (n) => new Date(2026, 10, n, 9, 0, 0);
const start = (all, d = day(1)) => dealForToday(reconcile(newState(), all), all, d);
const keepAll = (s) => s.hand.reduce((acc, id) => swipe(acc, id, 'keep'), s);

test('first open deals 10', () => {
  const all = ids(35);
  const s = start(all);
  assert.equal(s.hand.length, DAILY);
  assert.equal(s.bag.length, 25);
  assert.equal(new Set([...s.hand, ...s.bag]).size, 35);
});

test('same day does not deal again', () => {
  const all = ids(35);
  const s = keepAll(start(all));
  const again = dealForToday(s, all, day(1));
  assert.equal(again.hand.length, 0);
  assert.equal(again.done, 10);
});

test('+10 more draws from the same bag with no repeats', () => {
  const all = ids(35);
  let s = keepAll(start(all));
  const first = [...s.seen];
  s = dealMore(s, all);
  assert.equal(s.hand.length, 10);
  assert.ok(s.hand.every((id) => !first.includes(id)));
});

test('leftovers come first next day, topped up to 10, skipped days do not stack', () => {
  const all = ids(35);
  let s = start(all);
  const left = s.hand.slice(4);
  for (const id of s.hand.slice(0, 4)) s = swipe(s, id, 'keep');
  s = dealForToday(s, all, day(5)); // skipped three days
  assert.equal(s.hand.length, 10);
  assert.deepEqual(s.hand.slice(0, 6), left);
  assert.equal(s.done, 0);
});

test('nobody repeats until everyone is seen, then the bag refills as cycle 2', () => {
  const all = ids(25);
  let s = start(all);
  const order = [];
  for (let i = 0; i < 3; i++) {
    order.push(...s.hand);
    s = keepAll(s);
    if (i < 2) s = dealMore(s, all);
  }
  assert.equal(order.length, 25);
  assert.equal(new Set(order).size, 25);
  assert.equal(s.cycle, 1);
  assert.equal(progress(s, 25).cycleComplete, true);
  s = dealMore(s, all);
  assert.equal(s.cycle, 2);
  assert.equal(s.hand.length, 10);
  assert.equal(s.seen.length, 0);
});

test('fewer contacts than a full deal', () => {
  const all = ids(4);
  const s = start(all);
  assert.equal(s.hand.length, 4);
  assert.equal(s.bag.length, 0);
});

test('delete then reconcile: gone for good, never comes back', () => {
  let all = ids(12);
  let s = start(all);
  const victim = s.hand[0];
  s = swipe(s, victim, 'delete');
  all = all.filter((id) => id !== victim);
  s = reconcile(s, all);
  s = keepAll(s);
  s = dealMore(s, all); // 2 left in bag
  s = keepAll(s);
  s = dealMore(s, all); // refill, cycle 2
  assert.equal(s.cycle, 2);
  assert.ok(![...s.bag, ...s.hand, ...s.seen].includes(victim));
  assert.equal(s.deleted, 1);
});

test('new contacts are slipped into the current bag', () => {
  const all = ids(20);
  let s = start(all);
  const more = [...all, 'new1', 'new2'];
  s = reconcile(s, more);
  assert.ok(s.bag.includes('new1') && s.bag.includes('new2'));
  assert.equal(s.bag.length, 12);
  assert.equal(s.hand.length, 10);
});

test('undo puts the card back on top and restores counts', () => {
  const all = ids(20);
  const s0 = start(all);
  const id = s0.hand[0];
  for (const action of ['keep', 'delete']) {
    const s1 = swipe(s0, id, action);
    assert.equal(s1.done, 1);
    const s2 = undoSwipe(s1, id, action);
    assert.deepEqual(s2, s0);
  }
});

test('progress line numbers', () => {
  const all = ids(30);
  let s = start(all);
  for (const id of s.hand.slice(0, 4)) s = swipe(s, id, 'keep');
  assert.deepEqual(
    { ...progress(s, 30) },
    { todayDone: 4, todayTotal: 10, seen: 4, total: 30, cycle: 1, cycleComplete: false, capReached: false }
  );
});

test('100 cards in one day reaches the daily cap', () => {
  const all = ids(300);
  let s = start(all);
  for (let i = 0; i < 9; i++) {
    s = keepAll(s);
    assert.equal(progress(s, 300).capReached, false);
    s = dealMore(s, all);
  }
  s = keepAll(s);
  assert.equal(s.done, 100);
  assert.equal(progress(s, 300).capReached, true);
  // a new day clears it
  s = dealForToday(s, all, day(2));
  assert.equal(progress(s, 300).capReached, false);
  assert.equal(s.hand.length, 10);
});

test('bonus round is due after every 10 cards, once each', () => {
  const all = ids(60);
  let s = start(all);
  for (const id of s.hand.slice(0, 9)) s = swipe(s, id, 'keep');
  assert.equal(bonusDue(s), 0);
  const tenth = s.hand[0];
  s = swipe(s, tenth, 'keep');
  assert.equal(bonusDue(s), 1);
  s = { ...s, bonus: 1 }; // shown
  assert.equal(bonusDue(s), 0);
  s = swipe(undoSwipe(s, tenth, 'keep'), tenth, 'keep'); // undo and redo the 10th
  assert.equal(bonusDue(s), 0);
  s = keepAll(dealMore(s, all));
  assert.equal(s.done, 20);
  assert.equal(bonusDue(s), 2);
  s = dealForToday({ ...s, bonus: 2 }, all, day(2)); // new day starts over
  assert.equal(s.bonus, 0);
  s = keepAll(s);
  assert.equal(bonusDue(s), 1);
});

test('favorites rotate so the same three do not repeat', () => {
  const favs = ['a', 'b', 'c', 'd', 'e'];
  const r1 = pickFavorites(favs, []);
  assert.equal(r1.picks.length, 3);
  const r2 = pickFavorites(favs, r1.favSeen);
  const unseen = favs.filter((f) => !r1.picks.includes(f));
  assert.ok(unseen.every((f) => r2.picks.includes(f)), 'the two not yet offered come up next');
  assert.equal(r2.picks.length, 3);
  assert.equal(new Set(r2.picks).size, 3);
  assert.deepEqual(pickFavorites(['a', 'b'], []).picks.sort(), ['a', 'b']);
  assert.deepEqual(pickFavorites([], ['x']).picks, []);
  // someone un-starred is never offered
  assert.ok(!pickFavorites(['a', 'b', 'c'], ['z', 'a']).picks.includes('z'));
});
