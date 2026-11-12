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

// What the controls do, shown in the Instructions popup and the Read me.
export default function Instructions() {
  return (
    <>
      <ul className="controls">
        <li>
          <Icon kind="keep" />
          <div>
            <strong>Keep</strong>
            <p>Swipe the card right, or tap the green button.</p>
          </div>
        </li>
        <li>
          <Icon kind="delete" />
          <div>
            <strong>Delete</strong>
            <p>Swipe the card left, or tap the red button.</p>
          </div>
        </li>
        <li>
          <Icon kind="undo" />
          <div>
            <strong>Undo</strong>
            <p>Resets the most recently swiped card, up to 3 times. The button is greyed out when there is nothing left to undo.</p>
          </div>
        </li>
        <li>
          <Icon kind="star" />
          <div>
            <strong>Favorite</strong>
            <p>Mark your favourite friends! So they can pop up when you have a task. In Google Contacts this is your Starred list.</p>
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
        <li><strong>Tap the card</strong> to reach the person through Messages, Gmail or WhatsApp.</li>
        <li><strong>Swipe the card up</strong> for all their details. You can edit, change or add more details there.</li>
      </ul>
    </>
  );
}
