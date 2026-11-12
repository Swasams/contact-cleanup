// The author's note. Plain text on purpose: edit the words here.
export const REPO_URL = 'https://github.com/Swasams/contact-cleanup';
export const SITE_URL = 'https://swathisambasivam.com';

export default function AuthorsNote() {
  return (
    <div className="note">
      <p>
        Hi, I'm Swathi Sambasivam. I'm crazy and I don't like having contacts of people from like one vacation I took 7 years ago,
        so I made a lil app for cleaning out your contacts. Swipe left to delete, swipe right to keep.
      </p>
      <p>
        Fun bonus feature: this pops up a task to interact with a friend from your favorites (Starred in Google
        Contacts). The deeper the checked pile today, the harder the task. It will ban you from continuing after
        sorting 100 a day. You gotta have better things to do.
      </p>
      <p>
        The code is on <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>, and more of what I make is at{' '}
        <a href={SITE_URL} target="_blank" rel="noreferrer">swathisambasivam.com</a>.
      </p>
      <h3>About your data</h3>
      <p>
        There is no server. Your contacts travel between your browser and Google, and your place in the deck is saved
        on your device.
      </p>
      <p>
        I'm not saving any of your data, but I'm also not well versed in security. I did my best to make sure that
        anything that is saved stays locally on your device. If you know this stuff and see I messed up, please{' '}
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">let me know</a>.
      </p>
    </div>
  );
}
