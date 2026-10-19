# PokéQuiz

A mobile-friendly Pokémon shadow quiz. It loads Pokémon data from PokéAPI and artwork from the PokeAPI sprites repository, so players need an internet connection.

## Publish with GitHub Pages

1. Create a **public** repository on [GitHub](https://github.com/new).
2. Add `index.html`, `styles.css`, `app.js`, and this `README.md` to the repository. In GitHub, use **Add file → Upload files**.
3. Add the deployment workflow from this project at `.github/workflows/deploy-pages.yml`. In GitHub, use **Add file → Create new file**, enter that path as the filename, and paste in the workflow contents.
4. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
5. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to complete successfully.
6. Visit `https://<your-github-username>.github.io/<repository-name>/` on your phone or tablet.

The workflow deploys the site whenever a commit is pushed to `main`. You can also start a deployment from the workflow's **Run workflow** button in the Actions tab.
