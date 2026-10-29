# A Little Apology

A small, responsive React apology page for Jared and Baby Jelay. The recipient can accept or ask for more time. If she accepts, she may choose to open the camera, review a Polaroid-style selfie, and press **Done** to explicitly send it to Jared. Camera access and email sending require separate user actions.

## Run locally

```bash
npm ci
npm run dev
```

Camera access requires HTTPS or `localhost`. The email button is intentionally unavailable until `VITE_API_URL` is configured.

## Deploy the site to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
3. Configure the email API as described below, then add a repository **Actions variable** named `VITE_API_URL` with the full endpoint URL, for example `https://your-vercel-project.vercel.app/api/send-selfie`.
4. Push to `main` or run the **Deploy to GitHub Pages** workflow. The workflow builds with the repository name as the Pages base path.

## Configure the email API

The static GitHub Pages site must not contain email-provider secrets. Deploy this repository as a Vercel project as well; Vercel serves the `api/send-selfie.js` function. Use the Vercel URL for `VITE_API_URL` above.

1. Create a Resend account and verify a sender domain. Set `EMAIL_FROM` to a sender address on that verified domain, such as `Jared <hello@your-domain.example>`.
2. In the Vercel project settings, add these environment variables:
   - `RESEND_API_KEY`: the Resend API key (keep this server-side; never add it to GitHub Pages variables or source code).
   - `EMAIL_FROM`: the verified sender address.
   - `RECIPIENT_EMAIL`: Jared’s email address.
   - `ALLOWED_ORIGIN`: the exact origin of the GitHub Pages site, without a path. For example, `https://your-github-name.github.io`.
3. Redeploy the Vercel project after setting the variables.
4. Add the Vercel function URL as the GitHub Actions repository variable `VITE_API_URL`, then re-run the GitHub Pages workflow.

The function only accepts requests from the configured origin, sends to the configured recipient, and limits image attachments to 1.5 MB. It does not store or log the image. Keep the Resend key and Vercel environment settings private.
