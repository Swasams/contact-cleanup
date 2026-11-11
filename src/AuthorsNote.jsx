// The author's note. Plain text on purpose: edit the words here.
export const REPO_URL = 'https://github.com/Swasams/contact-cleanup';
export const SITE_URL = 'https://swathisambasivam.com';

export default function AuthorsNote() {
  return (
    <div className="note">
      <p>Hi, I'm Swathi. I make games, and I miss making things purely for the joy of creation.</p>
      <p>
        So I'm making small things for very specific audiences. This one's audience is me. I mean, who do I know
        better?
      </p>
      <p>
        I have so many contacts from my past that I wanted a dating-app swipe for my phone book. Who Dis? gives you 10
        contacts a day. Swipe left to delete, swipe right to keep.
      </p>
      <h3>About your data</h3>
      <p>
        There is no server. Your contacts travel between your browser and Google, and your place in the deck is saved
        on your device.
      </p>
      <p>
        I'm not saving any of your data, but I'm also not well versed in security. I did my best to make sure that anything
        that is saved stays locally on your device. If you know this stuff and see I messed up, please{' '}
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">let me know</a>.
      </p>
      <h3>Say hi</h3>
      <p>
        The code is on <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>, and more of what I make is at{' '}
        <a href={SITE_URL} target="_blank" rel="noreferrer">swathisambasivam.com</a>.
      </p>
    </div>
  );
}
