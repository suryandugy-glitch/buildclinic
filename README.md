<img src="public/cellar-logo.png" width="64" height="64" alt="BuildClinic logo">

# BuildClinic by Cellar

[Launch BuildClinic](https://buildclinic.vercel.app/) · [Report an issue](https://github.com/suryandugy-glitch/buildclinic/issues)

Paste a build log or select Multiple errors. Expand a finding to jump to the matching line, then download the diagnosis.


**BuildClinic by Cellar**

*Find the error. Fix the build.*

[Open BuildClinic](https://buildclinic.vercel.app)

Cellar makes tools that help developers diagnose and fix problems across their software stack. BuildClinic is the first.

BuildClinic checks deployment and build logs for common React, Next.js, Vite, and Vercel build failures. It locates the matching error lines in your log, provides actionable step-by-step repair instructions with ready-to-run terminal commands, and explains how to verify each fix before redeploying. Users can paste a log, drag and drop or open a text log file, or test the checker using built-in interactive samples.

The checker inspects build logs entirely in the browser using predefined diagnostic patterns covering:
- **Imports & Packages:** Unresolved local relative paths, missing npm/yarn/pnpm packages, missing exports, peer dependency conflicts (`ERESOLVE`), and stale or desynchronized lockfiles (`frozen-lockfile`).
- **Frameworks & SSR:** Server-side rendering reference errors (`window is not defined`, `document is not defined`, `localStorage`), React hydration mismatches, Next.js static prerender errors, and dynamic server usage conflicts.
- **Styling & Tooling:** PostCSS plugin errors, missing Tailwind CSS packages, and `@tailwind` / `@import` version syntax mismatches.
- **Build Settings & Commands:** Missing build scripts, missing executables or commands (`command not found`), incorrect deployment output directories, and Node.js engine version mismatches.
- **Code & Linters:** TypeScript compiler errors (`error TS...`), syntax and JSX parsing errors, and fatal ESLint rule failures.
- **System & Infrastructure:** Missing required environment variables, JavaScript heap out-of-memory errors, disk capacity and inotify file watcher limits (`ENOSPC`), API timeouts during static build, and Git submodule initialization failures.

Use **Show in log** to jump directly to the exact error line with an animated highlight. When multiple errors occur, BuildClinic displays findings in log order and allows expanding individual issues or toggling all matches with a single click. Click **Copy diagnosis** to copy structured repair instructions to your clipboard, or **Download report (.md)** to export a complete markdown report.

Logs stay strictly in your browser. BuildClinic uses no external APIs, server endpoints, databases, trackers, or analytics. The application operates under a strict Content Security Policy and is served as pure static HTML, CSS, and vanilla JavaScript.

## Features

- **Instant Browser-Based Analysis:** Analyzes build logs up to 250,000 characters in milliseconds with zero server roundtrips.
- **Drag-and-Drop & File Upload:** Drop `.log` or `.txt` files directly onto the editor or browse via the file dialog.
- **Precise Line Tracking:** Jumps directly to the error line in the editor, scrolling it into view and highlighting the code.
- **Step-by-Step Fix Recipes:** Clear, copyable shell commands tailored to the diagnosed issue.
- **Export & Share:** Copy diagnosis to clipboard or export a clean Markdown (`.md`) diagnosis report.
- **Keyboard Shortcuts:** Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd> on macOS) to instantly check the log.

## Run locally

Clone or download this repository. Open `public/index.html` directly in any modern browser, then select **Broken import** or another sample.

To serve it locally with Python 3, open a terminal in the project directory:

```bash
python -m http.server 8000 --directory public
```

On Windows, use `py` instead of `python` if needed. Visit `http://localhost:8000` to test the app. Serving via localhost or HTTPS enables clipboard copying and file reading APIs.

Alternatively, if you use Node.js:

```bash
npx serve public
```

## Upload to GitHub

1. Create a new GitHub repository named `buildclinic` (owner: `suryandugy-glitch`).
2. In the repository, choose **Add file → Upload files** or use Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of BuildClinic"
   git remote add origin https://github.com/<owner>/buildclinic.git
   git push -u origin main
   ```
3. Confirm that `README.md`, `vercel.json`, and the `public` directory sit at the repository root.
4. The included `.gitignore` keeps operating system and editor temporary files out of version control.

## Deploy to Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Import the `buildclinic` repository. Leave the root directory at the repository root.
3. The included `vercel.json` configures a static deployment with `public` as the output directory and the build step skipped. The framework preset is **Other**. No environment variables are required.
4. Deploy and open the generated `vercel.app` URL. Test a sample log to confirm the diagnosis highlights the error line.

- [Vercel Git deployment documentation](https://vercel.com/docs/git)
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)

## Connect a custom domain

1. Open **Project → Settings → Domains** in the Vercel dashboard.
2. Add your domain (e.g. `yourdomain.xyz` and `www.yourdomain.xyz`).
3. In your DNS provider, configure the DNS records according to Vercel's instructions.
4. Once Vercel verifies DNS and provisions an automatic SSL certificate, open your domain in a browser.

- [Vercel custom domain documentation](https://vercel.com/docs/domains/set-up-custom-domain)

## Source files

| File | Purpose |
| --- | --- |
| `public/index.html` | Semantic HTML structure, accessible editor, results view, and coverage matrix |
| `public/assets/styles.css` | Responsive stylesheet with light and dark theme variable systems |
| `public/assets/diagnostics.js` | Diagnostic pattern matching engine, rule definitions, and sample logs |
| `public/assets/app.js` | UI logic, drag-and-drop file handling, editor telemetry, report export, and theme switcher |
| `vercel.json` | Deployment routing, output directory, and strict Content Security Policy headers |
| `.gitignore` | Standard Git ignore patterns for OS files and local development artifacts |
