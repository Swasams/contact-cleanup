import { DAILY, DAILY_CAP } from './bag.js';

const Icon = ({ kind }) => {
  const paths = {
    keep: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    delete: <path d="M6 6l12 12M18 6L6 18" />,
    undo: <path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12" transform="translate(0 -3)" />,
    star: <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  };
  return (
    <span className={`chip chip-${kind}`} aria-hidden="true">
      {kind === 'more' ? `+${DAILY}` : <svg viewBox="0 0 24 24">{paths[kind]}</svg>}
    </span>
  );
};

// Everything the controls do, shown in the Instructions popup.
export default function Instructions() {
  return (
    <>
      <ul className="controls">
        <li>
          <Icon kind="keep" />
          <div>
            <strong>Keep</strong>
            <p>Swipe the card right, or tap the green button. On a computer, press the right arrow key.</p>
          </div>
        </li>
        <li>
          <Icon kind="delete" />
          <div>
            <strong>Delete</strong>
            <p>Swipe the card left, or tap the red button. On a computer, press the left arrow key.</p>
          </div>
        </li>
        <li>
          <Icon kind="undo" />
          <div>
            <strong>Undo</strong>
            <p>Takes back your last 3 swipes, one at a time. The button is greyed out when there is nothing left to undo. On a computer, press Backspace or Ctrl+Z.</p>
          </div>
        </li>
        <li>
          <Icon kind="star" />
          <div>
            <strong>Favorite</strong>
            <p>Stars the contact on top. Tap again to remove the star. In Google Contacts this is your Starred list.</p>
          </div>
        </li>
        <li>
          <Icon kind="more" />
          <div>
            <strong>{DAILY} more</strong>
            <p>Deals another {DAILY} cards whenever you want, up to {DAILY_CAP} in a day.</p>
          </div>
        </li>
      </ul>

      <h3>On the card</h3>
      <ul className="plain">
        <li><strong>Tap the card</strong> to message, call or email the person. On a computer, press Enter.</li>
        <li><strong>Swipe the card up</strong> for all their details. On a computer, press the up arrow key.</li>
        <li>In details, tap the tags to record how and when you met. Tap <strong>Edit</strong> to change their name, number and the rest.</li>
        <li>Instagram, TikTok and Discord show up as ways to reach someone once you add their handle in details.</li>
      </ul>

      <h3>How the days work</h3>
      <ul className="plain">
        <li>You get {DAILY} contacts a day. Cards you do not finish come first the next day.</li>
        <li>Nobody shows up twice until you have seen everyone once. Then the deck reshuffles and starts over.</li>
        <li>At {DAILY_CAP} in one day, the app tells you to stop.</li>
      </ul>

      <h3>When a delete is final</h3>
      <ul className="plain">
        <li>A delete can be undone until 3 newer swipes have happened, or until you leave the app or switch tabs.</li>
        <li>After that the contact is removed from your Google Contacts.</li>
        <li>Deleting a favorite always asks you to confirm first.</li>
      </ul>

      <h3>The menu</h3>
      <ul className="plain">
        <li>The button in the top corner lets you sign out, open these instructions, or read the author's note.</li>
      </ul>
    </>
  );
}
