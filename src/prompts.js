// The gift ladder: finishing every 10 cards in a day unlocks the next prompt.
// {name} is replaced with the favorite the person picks.
// "actions" lists which buttons the gift screen should show for that prompt.
// (Used by the gift screen, which is the next build step.)
export const GIFT_PROMPTS = [
  { unlockAt: 10, text: 'Send {name} a meme', actions: ['instagram', 'whatsapp', 'sms'] },
  { unlockAt: 20, text: 'Ask {name} for a recommendation', actions: ['whatsapp', 'sms'] },
  { unlockAt: 30, text: 'Message {name}', actions: ['whatsapp', 'sms', 'email'] },
  { unlockAt: 40, text: 'Send {name} a song you have on repeat', actions: ['whatsapp', 'sms'] },
  { unlockAt: 50, text: 'Send a photo to {name}', actions: ['whatsapp', 'sms'] },
  { unlockAt: 60, text: 'Send {name} a voice note', actions: ['whatsapp', 'sms'] },
  { unlockAt: 70, text: 'Hit up a group chat with {name}', actions: ['whatsapp', 'sms'] },
  { unlockAt: 80, text: 'Make a plan with {name} and pick a date', actions: ['whatsapp', 'sms'] },
  { unlockAt: 90, text: 'Audio call {name} right now', actions: ['call', 'whatsapp'] },
  { unlockAt: 100, text: 'Video call {name} right now', actions: ['facetime', 'whatsapp'] },
];
