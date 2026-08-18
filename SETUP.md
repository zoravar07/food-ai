# hungryvar — setup guide

Everything's built. Follow these steps in order and you'll have a live app in about 20 minutes.

---

## Step 1 — Supabase (saves your plans and history)

1. Go to **supabase.com** → sign up → **New project**
2. Name: `hungryvar`, region: **London (eu-west-2)**, set a database password (save it)
3. Wait ~2 min for provisioning
4. Left sidebar → **SQL Editor** → **New query**
5. Open `supabase_schema.sql` from this project, paste the whole thing in, click **Run**
   - You should see "Success. No rows returned" — that's correct
6. Go to **Project Settings** (gear icon) → **API** and copy these two values:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon public** key (long string starting `eyJ...`)

---

## Step 2 — Gemini API key (powers the chat)

1. Go to **aistudio.google.com**
2. Click **Get API key** → **Create API key** → select or create a project
3. Copy the key (starts with `AIza...`)

**Don't paste this key into any file.** It goes into Netlify's private settings in step 4.

---

## Step 3 — Put the code on GitHub

1. Go to **github.com** → **New repository** → name it `hungryvar` → **Private** → Create
2. On your Mac, open Terminal and run these (replace `YOUR-USERNAME`):

```bash
cd ~/Downloads/hungryvar        # wherever you unzipped this
git init
git add .
git commit -m "hungryvar initial build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hungryvar.git
git push -u origin main
```

---

## Step 4 — Deploy on Netlify

1. Go to **netlify.com** → sign up with GitHub
2. **Add new site** → **Import an existing project** → **GitHub** → pick `hungryvar`
3. Build settings should auto-fill from `netlify.toml`. Confirm:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Before deploying, click **Add environment variables** and add all three:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `GEMINI_API_KEY` | your Gemini key |

5. Click **Deploy**. Takes about a minute.
6. You'll get a URL like `random-name-123.netlify.app`. Rename it under **Site configuration → Change site name** if you want something nicer.

**Important:** if you add the environment variables *after* deploying, go to **Deploys → Trigger deploy → Clear cache and deploy site**, or the app won't pick them up.

---

## Step 5 — Put it on your phone

**iPhone:** open the URL in Safari → Share button → **Add to Home Screen**. It'll open fullscreen with its own icon, like a real app.

That's genuinely all you need for daily use. The App Store version below is optional.

---

## Step 6 (optional) — Real iOS app for the App Store

Only worth doing if you specifically want it listed on the App Store. The home-screen version above works just as well day to day.

```bash
cd ~/Downloads/hungryvar
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init hungryvar com.yourname.hungryvar
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

That opens Xcode. Then:

1. Select your project in the left sidebar → **Signing & Capabilities**
2. Check **Automatically manage signing**, pick your Apple ID team
   - You'll need an **Apple Developer account** ($99/year) to publish
3. Plug in your iPhone, select it as the target, press **▶** to install it directly
4. To publish: **Product → Archive** → **Distribute App** → **App Store Connect**
5. Then at **appstoreconnect.apple.com**: add screenshots, description, privacy details, and submit for review (1-3 days)

Note: Apple sometimes rejects apps that are just a wrapped website. Since this has offline data, native storage and a real purpose, it should be fine, but be prepared to respond to review feedback.

---

## Updating the app later

Any change you push to GitHub redeploys Netlify automatically:

```bash
git add .
git commit -m "what changed"
git push
```

For the iOS app, run `npm run build && npx cap sync` then re-archive in Xcode.

---

## Troubleshooting

**Chat says "Couldn't reach the assistant"** — `GEMINI_API_KEY` is missing or wrong in Netlify. Check **Site configuration → Environment variables**, then redeploy with cache cleared.

**"Setup needed" banner won't go away** — Supabase variables aren't set, or you deployed before adding them. Redeploy with cache cleared.

**Plans reset every refresh** — same cause as above; Supabase isn't connected.

**Rate limited** — you've hit Gemini's free tier daily cap. The app falls back to Flash-Lite automatically, but if both are exhausted, wait until it resets or add billing in AI Studio.

---

## What's where

```
src/lib/macroEngine.js         calorie & macro targets from your stats
src/lib/foodDatabase.js        ingredients, macros, prices, storage life
src/lib/mealPlanner.js         the week generator (validated over 150 weeks)
src/lib/groceryListGenerator.js  nets ingredients into a shopping list
src/lib/recipes.js             methods + storage tips
src/lib/store.js               all Supabase reads/writes
src/lib/assistant.js           AI context and action parsing
src/App.jsx                    the interface
netlify/functions/chat.js      keeps your API key server-side
supabase_schema.sql            run once in Supabase
```

**To change your targets:** edit `sampleProfile` in `src/lib/macroEngine.js`.
**To change the budget:** it's the `65` in the `generateWeek(targets, 65)` calls in `src/App.jsx`.
**To add meals:** add to `templates` in `mealPlanner.js` and a matching entry in `recipes.js`.
