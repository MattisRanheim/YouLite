# YouLite

A personal PWA that shows your YouTube subscription feed — nothing else. No homepage, no recommendations, no search. Just your subscriptions in reverse-chronological order with inline playback.

---

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- next-auth v5 (Google OAuth)
- next-pwa
- YouTube Data API v3
- Vercel

---

## 1. Google Cloud Console Setup

### Enable the YouTube Data API

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Library**
4. Search for **YouTube Data API v3** and click **Enable**

### Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Set the application type to **Web application**
4. Under **Authorised redirect URIs**, add:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-vercel-domain.vercel.app/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### Configure OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Set User Type to **External**
3. Fill in the required fields (App name, support email, developer email)
4. Under **Scopes**, add `https://www.googleapis.com/auth/youtube.readonly`
5. Under **Test users**, add your Google account email (required while the app is in Testing mode)

> The app does not need to go through Google's verification process for personal use — just keep it in Testing mode and add your account as a test user.

---

## 2. Environment Variables

Copy `.env.local` and fill in the values:

```bash
GOOGLE_CLIENT_ID=your-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-console
NEXTAUTH_SECRET=any-random-string-at-least-32-chars
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

For local development, set `NEXTAUTH_URL=http://localhost:3000`.

---

## 3. Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

---

## 4. Deploying to Vercel

1. Push the repo to GitHub
2. Import it in [vercel.com](https://vercel.com)
3. Add all four environment variables in the Vercel project settings
4. Deploy — Vercel auto-detects Next.js

After the first deploy, copy the production URL and:
- Update `NEXTAUTH_URL` in Vercel env vars
- Add the production redirect URI to your Google OAuth credentials

---

## PWA Installation

### iPhone / iPad

1. Open the production URL in Safari
2. Tap the **Share** button
3. Tap **Add to Home Screen**

### Android Chrome

1. Open the production URL in Chrome
2. Tap the **⋮** menu → **Add to Home screen**

---

## Quota Notes

The YouTube Data API v3 has a default quota of **10,000 units/day** per project. This app uses:

- `subscriptions.list`: 1 unit per call (paged, up to ~200 subscriptions)
- `channels.list`: 1 unit per 50 channels
- `playlistItems.list`: 1 unit per channel

For 200 subscriptions, one full feed load costs roughly **205 units**. With 15-minute caching and personal use, you will stay well within the daily quota.

---

## Architecture

```
/app
  /api/auth/[...nextauth]/route.ts   ← next-auth handlers
  /api/feed/route.ts                 ← server-side YouTube API + in-memory cache
  /login/page.tsx                    ← sign-in page
  layout.tsx                         ← root layout + PWA meta tags
  page.tsx                           ← protected feed page (server component)
/components
  Feed.tsx                           ← client component: fetches /api/feed, renders grid
  VideoCard.tsx                      ← single video card
  VideoModal.tsx                     ← fullscreen iframe player modal
/lib
  auth.ts                            ← next-auth config (Google provider + token callback)
  youtube.ts                         ← YouTube API helpers (subscriptions → channels → videos)
/public
  manifest.json                      ← PWA manifest
  icon-192.png / icon-512.png        ← app icons
/scripts
  generate-icons.py                  ← stdlib Python script to regenerate icons
```
