# A Little Apology

A small, responsive React apology page for Jared and Baby Jelay. Open the letter and choose **I accept** to see a thank-you page with a continuously rotating, animated Polaroid carousel of nine shared photos. The active photo has a gentle heartbeat effect. The carousel starts automatically and has no manual navigation buttons. This version does not request camera access or capture/send selfies.

## Run locally

```bash
npm ci
npm run dev
```

## Deploy to Vercel

1. Import [the GitHub repository](https://github.com/rtaida/letter) into Vercel and deploy it using the Vite preset. The checked-in `vercel.json` configures the static build output.
2. Vercel automatically deploys changes pushed to `main`.
