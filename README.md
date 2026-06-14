# PandaChat 🐼

> Secret real-time chat app disguised as a Korean language learning platform.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (root + server + client)
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables

**server/.env** — Fill in your values:
```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pandachat
GOOGLE_TRANSLATE_API_KEY=<your-google-translate-api-key>
ENCRYPTION_SECRET=<any-32-character-string>
CLIENT_ORIGIN=http://localhost:5173
```

**client/.env** — Already configured:
```
VITE_SERVER_URL=http://localhost:5000
```

### 3. Run Development Servers

```bash
# Option 1: Run both together from root
npm install -g concurrently
npm run dev

# Option 2: Run separately (in two terminals)
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

### 4. Open the app
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🔑 Getting Your API Keys

### MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free cluster
3. Get the connection string and paste it into `server/.env`

### Google Translate API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the "Cloud Translation API"
3. Create an API key
4. Paste it into `server/.env`

> **Note:** The app works without these keys — messages won't be translated to Korean and won't persist across restarts, but everything else works!

---

## 🐼 How to Use

1. **Open the app** at http://localhost:5173
2. **Create a room** — click "New here? Generate a code →"
3. **Share the 6-character code** with your friend
4. **Your friend opens the app** and enters the code
5. **Start chatting!** Messages will be spoken in Korean by the panda
6. **After 2 minutes** — messages fade to Korean text
7. **Long press (5s)** a Korean message to reveal the original
8. **Double-tap the panda** to activate panic mode (fake Korean lesson)
9. **Press Esc twice** (desktop) to also trigger panic mode

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| Database | MongoDB with Mongoose |
| Translation | Google Cloud Translate API |
| TTS | Web Speech API (built-in) |
| Security | AES-256-CBC encryption |
