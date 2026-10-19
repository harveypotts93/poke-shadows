# PokéQuiz

A mobile-friendly, installable Pokémon shadow quiz. The app shell and previously loaded Pokémon data and artwork are cached for offline play. An internet connection is required the first time you open the quiz and for uncached Pokémon artwork.

## Install on a phone or tablet

Open the deployed site over HTTPS in your browser and tap **Install app**. If the browser does not offer an install prompt, follow the on-screen instructions: in iOS Safari, use **Share → Add to Home Screen**; in Android browsers, use the browser menu and select **Install app** or **Add to Home screen**.

## Publish with GitHub Pages

1. Create a **public** repository on [GitHub](https://github.com/new).
2. Add `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-180.png`, `icon-192.png`, `icon-512.png`, and this `README.md` to the repository. In GitHub, use **Add file → Upload files**.
3. Add the deployment workflow from this project at `.github/workflows/deploy-pages.yml`. In GitHub, use **Add file → Create new file**, enter that path as the filename, and paste in the workflow contents.
4. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
5. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to complete successfully.
6. Visit `https://<your-github-username>.github.io/<repository-name>/` on your phone or tablet.

The workflow deploys the site whenever a commit is pushed to `main`. You can also start a deployment from the workflow's **Run workflow** button in the Actions tab.
