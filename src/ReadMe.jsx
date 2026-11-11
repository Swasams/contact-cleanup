import AuthorsNote from './AuthorsNote.jsx';
import Instructions from './Instructions.jsx';

// The Read me: the author's note first, then how everything works.
export default function ReadMe() {
  return (
    <div className="readme">
      <AuthorsNote />
      <h3 className="readme-split">How it works</h3>
      <Instructions />
    </div>
  );
}
