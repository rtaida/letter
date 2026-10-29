# A Little Apology

A small, responsive React apology page for Jared and Baby Jelay. The recipient can accept or ask for more time. If she accepts, she may choose to open the camera, review a Polaroid-style selfie, and press **Done** to explicitly send it to Jared. After finishing, seven shared photos rotate through a centered, animated Polaroid carousel with previous/next controls. The gallery preloads the photos and skips any that fail to load. Camera access and email sending require separate user actions.

## Run locally

```bash
npm ci
npm run dev
```

Camera access requires HTTPS or `localhost`. In production, the **Done** button sends the reviewed Polaroid to the same-origin Vercel API after its email environment variables are configured. If email isn’t configured, **Done** still lets the visitor continue to the gallery and clearly explains that the selfie wasn’t emailed.

## Deploy the site and API to Vercel

1. Import [the GitHub repository](https://github.com/rtaida/letter) into Vercel and deploy it using the Vite preset. The checked-in `vercel.json` configures the static build output.
2. In Vercel project settings, add the email environment variables below, including the exact deployed site origin in `ALLOWED_ORIGIN`, then redeploy.
3. Vercel automatically redeploys the site when changes are pushed to `main`. The site calls its own `/api/send-selfie` endpoint in production; no public API key or frontend endpoint variable is needed.

## Configure the email API

Vercel hosts both the React site and the `api/send-selfie.js` serverless function. Keep email-provider secrets in Vercel only, never in GitHub or client-side variables.

1. Create a Resend account and verify a sender domain. Set `EMAIL_FROM` to a sender address on that verified domain, such as `Jared <hello@your-domain.example>`.
2. In the Vercel project settings, add these environment variables:
   - `RESEND_API_KEY`: the Resend API key (keep this server-side; never add it to GitHub Pages variables or source code).
   - `EMAIL_FROM`: the verified sender address.
   - `RECIPIENT_EMAIL`: the inbox that should receive the selfie (enter this value privately in Vercel; do not commit it).
   - `ALLOWED_ORIGIN`: the exact Vercel site origin, without a trailing slash or path, for example `https://letter-your-account.vercel.app`.
3. Redeploy the Vercel project after setting the variables.

The function only accepts requests from the configured origin, sends to the configured recipient, and limits image attachments to 1.5 MB. It does not store or log the image. Keep the Resend key and Vercel environment settings private.
