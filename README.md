# 💜 Shreyaa's Fitness Tracker

Real-time shared habit tracker with **photo proof uploads**. Both of you see the same data live.

---

## 🚀 Setup Guide (~15 minutes, completely free)

### STEP 1 — Create a Firebase Project

1. Go to → https://console.firebase.google.com
2. Click **"Add project"** → name it `shreyaa-tracker` → Continue
3. Disable Google Analytics → **Create project**

### STEP 2 — Set Up Realtime Database

1. Left sidebar → **"Realtime Database"** → **"Create Database"**
2. Choose any location → Next
3. Select **"Start in test mode"** → **Enable**

### STEP 3 — Set Up Firebase Storage (for photos)

1. Left sidebar → **"Storage"** → **"Get started"**
2. Click **"Start in test mode"** → Next → **Done**

> This is what stores Shreyaa's proof photos securely in the cloud.

### STEP 4 — Get Your Firebase Config

1. Click ⚙️ gear icon (top left) → **Project settings**
2. Scroll to **"Your apps"** → click `</>` (Web icon)
3. Register app as `shreyaa-tracker` → **Register app**
4. Copy the config values shown (apiKey, authDomain, etc.)

### STEP 5 — Deploy to Vercel

1. Create a new GitHub repo called `shreyaa-tracker`
2. Upload all files from this folder to that repo
3. Go to → https://vercel.com → sign in → **"Add New Project"** → import the repo
4. Before clicking Deploy, open **"Environment Variables"** and add:

| Variable Name | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | your apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your authDomain |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | your databaseURL |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | your storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | your messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | your appId |

5. Click **Deploy** 🎉

### STEP 6 — Share the Link

Vercel gives you a URL like `https://shreyaa-tracker.vercel.app`

Send it to Shreyaa — you both see the same data and photos in real time!

---

## 📸 How Photo Proofs Work

- Each habit has a 📷 camera button next to it
- Shreyaa taps it → uploads a photo from her phone camera or gallery
- The photo appears as a thumbnail on the habit card
- You can tap any thumbnail to view it full size
- The **Progress tab** has a 📸 Proof Gallery showing all uploaded photos
- Photos are stored securely in Firebase Storage (free tier = 5GB)

---

## 📱 Add to Home Screen (feels like an app)

**iPhone:** Safari → Share button → **"Add to Home Screen"**
**Android:** Chrome → ⋮ menu → **"Add to Home Screen"**

---

## 🔒 Security Note

The database and storage are in "test mode" — fine for personal use between two people.
If you want to lock it down later, go to Firebase → Storage → Rules and add authentication rules.
