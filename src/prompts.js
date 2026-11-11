// The bonus round ladder. Finishing every 10 cards in a day unlocks the next
// prompt, in this order. {name} is replaced with the favorite the person picks.
// "actions" lists which buttons to offer for that prompt:
//   sms = Messages, whatsapp = WhatsApp, email = Gmail, call = phone call, facetime = FaceTime
export const GIFT_PROMPTS = [
  { unlockAt: 10, text: 'Send {name} a meme', actions: ['sms', 'whatsapp'] },
  { unlockAt: 20, text: 'Ask {name} for a recommendation', actions: ['sms', 'whatsapp'] },
  { unlockAt: 30, text: 'Message {name}', actions: ['sms', 'whatsapp', 'email'] },
  { unlockAt: 40, text: 'Send {name} a song you have on repeat', actions: ['sms', 'whatsapp'] },
  { unlockAt: 50, text: 'Send a photo to {name}', actions: ['sms', 'whatsapp'] },
  { unlockAt: 60, text: 'Send {name} a voice note', actions: ['sms', 'whatsapp'] },
  { unlockAt: 70, text: 'Hit up a group chat with {name}', actions: ['sms', 'whatsapp'] },
  { unlockAt: 80, text: 'Make a plan with {name} and pick a date', actions: ['sms', 'whatsapp'] },
  { unlockAt: 90, text: 'Audio call {name} right now', actions: ['call', 'whatsapp'] },
  { unlockAt: 100, text: 'Video call {name} right now', actions: ['facetime', 'whatsapp'] },
];
