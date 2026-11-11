# Who Dis?

Swipe through your Google contacts, 10 a day. Left to delete, right to keep.

It is a small web app that runs entirely in your browser and can be added to a phone's Home Screen.

## What works today

- **Swipe deck:** swipe right (or tap the green button) to keep, swipe left (or tap the red button) to delete.
- **Undo:** the undo button takes back your last 3 swipes, keeps or deletes. A delete is only sent to Google once it can no longer be undone: when 3 newer swipes have happened, or when you leave the app.
- **Star:** the star button marks the contact as a favorite. In Google Contacts this is the Starred group.
- **Tap a card** to message, call or email the person (Messages, WhatsApp, phone, email, plus Instagram, TikTok and Discord once you add a handle).
- **Swipe a card up** for details: quick tags for how and when you met, and an Edit button for the contact's fields. Tags and handles are saved to Google as custom fields.
- **Settings** (in the menu): edit the list of how-we-met tags, and switch each contact field on or off. On shows it in details and makes it editable; off hides it.
- **Deleting a favorite** asks you to confirm first.
- **Instructions and Author's note** on the welcome screen and in the menu.
- **On a computer:** right arrow keeps, left arrow deletes, up arrow opens details, Enter opens ways to reach, Backspace or Ctrl+Z undoes.
- **10 a day:** the first open of the day deals 10 cards. Unfinished cards come first the next day. Skipped days do not stack up.
- **+10:** the +10 button deals another 10 whenever you want, up to 100 in a day. At 100 the app tells you to stop.
- **Bag system:** nobody repeats until every contact has been shown once. Then the bag refills, reshuffles, and the next cycle starts.
- **Demo mode:** made-up contacts, so anyone can try it without signing in.

Not built yet: choosing which fields show on the card, and the gift prompts (the prompt list is already in `src/prompts.js`).

Not yet tested against a real Google account: sign-in, deleting, starring, and saving edits. All of it is tested in demo mode.

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm run dev
```

Open the address it prints (usually `http://localhost:5173/`) and tap **Try the demo**.

## 2. Connect Google Contacts

This is a one-time setup in [Google Cloud Console](https://console.cloud.google.com). Menu names move around, so treat these as a guide.

1. Create a project.
2. Enable the **People API** for it (APIs & Services, Library).
3. Set up the OAuth consent screen: External, give it a name, and add your own Google address as a **test user**.
4. Add the scope `https://www.googleapis.com/auth/contacts`.
5. Create an **OAuth client ID** of type **Web application**.
6. Under **Authorized redirect URIs**, add every address the app will run at, exactly as shown, including the trailing slash:
   - `http://localhost:5173/`
   - `https://YOUR-USERNAME.github.io/YOUR-REPO/`

   The app's welcome screen shows the exact address it needs.
7. Copy `.env.example` to `.env` and paste the client ID:

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

8. Restart `npm run dev`. The **Connect Google Contacts** button is now active.

A client ID is not a secret, so it is fine for it to end up in the built site.

Before the first real run, export a backup from [Google Contacts](https://contacts.google.com) (Export, Google CSV).

## 3. Put it online with GitHub Pages

1. Push this folder to a GitHub repository, on the `main` branch.
2. In the repository: Settings, Pages, set **Source** to **GitHub Actions**.
3. In Settings, Secrets and variables, Actions, **Variables**, add `GOOGLE_CLIENT_ID` with your client ID.
4. Push again or run the **Deploy to GitHub Pages** workflow by hand. The site appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

On an iPhone, open that address in Safari, then Share, **Add to Home Screen**. That keeps your progress from being cleared and makes it open like an app.

## Things to know

- **Other people using it:** while the Google project is in testing, only the test users you list can sign in. Publishing it lets anyone sign in, but Google shows an "unverified app" warning and limits the number of users until the app is verified.
- **Sign-in lasts about an hour.** After that the app asks you to sign in again. Your progress is kept.
- **Sign-in from the iPhone Home Screen** uses a full-page redirect and has not been tested on a real iPhone yet. If it misbehaves, sign in from Safari.
- **Deleted contacts:** Google Contacts normally keeps deleted contacts in its Trash for 30 days. Check that this holds for contacts deleted by this app before relying on it.
- **Progress is stored on the device** (browser storage). Clearing site data resets the cycle, never your contacts.

## Privacy

There is no server. Your contacts travel only between your browser and Google. The app stores your place in the cycle (contact IDs and counts) in the browser, and the Google sign-in token for the current session only.

## Project layout

| File | What it does |
|---|---|
| `src/bag.js` | The bag, daily deal, +10 more, refill, daily cap. Pure functions. |
| `src/bag.test.js` | Tests for the bag (`npm test`). |
| `src/google.js` | Google sign-in and the People API calls. |
| `src/App.jsx` | Screens and swipe handling. |
| `src/Card.jsx` | The contact card and its drag behaviour. |
| `src/Details.jsx` | Swipe-up details: tags, year, edit form. |
| `src/Reach.jsx` | Tap: ways to message or call. |
| `src/Settings.jsx` | Settings popup: tags tab and field switches tab. |
| `src/contact.js` | The list of fields, the starting tag list, message links, shared helpers. |
| `src/Modal.jsx` | The popup used everywhere. |
| `src/Instructions.jsx` | The Instructions popup text. |
| `src/AuthorsNote.jsx` | The Author's note text. Edit your words here. |
| `src/prompts.js` | The gift prompt ladder (for the gift screen, not built yet). |
| `src/demo.js` | Made-up contacts for demo mode. |
| `src/styles.css` | All styling. Colours and fonts are variables at the top. |
