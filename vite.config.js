import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A browser-enforced allowlist for the published app. Even if a bug or a bad
// dependency tried to send contact data somewhere else, the browser refuses:
//   connect-src  the only place the app may talk to is Google's People API
//   img-src      contact photos (Google's image host) and the app's own files
//   style/font   the app's own styles and Google Fonts
//   script-src   only the app's own code; no inline or third-party scripts
// It is added to the built site only, because the dev server needs inline scripts.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://*.googleusercontent.com",
  "connect-src https://people.googleapis.com",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

const contentSecurityPolicy = () => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// base './' keeps asset paths relative, so the build works on GitHub Pages
// under /your-repo-name/ without extra config.
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
});
