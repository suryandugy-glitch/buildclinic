# BuildClinic

BuildClinic checks deployment logs for common React and Vercel build failures. It shows the matching error lines, gives step-by-step repair instructions with command examples, and explains how to verify each fix. Users can paste a log, open a UTF-8 text file, or try one of the built-in samples.

The checker uses predefined patterns for unresolved imports, missing exports, npm peer dependency conflicts, lockfile mismatches, missing scripts or executables, missing output directories or environment variables, Node.js version mismatches, heap errors, and common TypeScript and syntax errors.

Use **Show in log** to select an error line. The checker displays up to five findings in log order. Expand additional findings to read their steps. **Copy diagnosis** includes the steps for each displayed finding. Unknown errors get a checklist for capturing a more specific log. Review each fix and adapt example commands to your project before running them.

Logs stay in the browser. BuildClinic uses no API, database, analytics, or browser storage. HTML, CSS, and JavaScript are served as static files.

## Run locally

Extract the ZIP. Open public/index.html in your browser, then select **Broken import**.

To serve it locally with Python 3, open a terminal in the extracted directory:

    python -m http.server 8000 --directory public

On Windows, use py instead of python if needed. Visit http://localhost:8000 and try a sample. HTTPS or localhost gives the copy button access to the browser clipboard.

## Upload to GitHub

1. Create a new GitHub repository named buildclinic.
2. In the repository, choose **Add file → Upload files** or the upload link on the empty repository page.
3. Drag the extracted contents into the uploader. Confirm that README.md, vercel.json, and the public folder sit at the repository root.
4. Commit the files. The .gitignore file is included for Git users and may be hidden in your file manager.

## Deploy to Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Import the buildclinic repository. Leave the root directory at the repository root.
3. The included vercel.json configures a static deployment with public as the output directory and the build step skipped. The framework preset is **Other**. No environment variables are needed.
4. Deploy and open the generated vercel.app URL. Select **Broken import** and confirm the diagnosis highlights line 6.

[Vercel Git deployment documentation](https://vercel.com/docs/git) · [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)

## Connect your .xyz domain

1. Open **Project → Settings → Domains** in Vercel.
2. Add the .xyz domain you own. Add www separately if you want it to work too.
3. At your DNS provider, create or update the records using the exact names and values Vercel displays. Keep unrelated records such as email records in place.
4. Wait for Vercel to verify the DNS and provision HTTPS. Open your domain in a browser and check a sample log again.

[Vercel custom domain documentation](https://vercel.com/docs/domains/set-up-custom-domain)

## Source files

| File | Purpose |
| --- | --- |
| public/index.html | Page structure and log checker |
| public/assets/styles.css | Responsive layout and styling |
| public/assets/diagnostics.js | Matching rules, evidence line numbers, sample logs |
| public/assets/app.js | Log input, file opening, results, clipboard |
| vercel.json | Static deployment and response headers |
