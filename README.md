# 🎮 Multiplayer Tic-Tac-Toe (Nakama)

A production-ready, real-time multiplayer Tic-Tac-Toe game built with a **server-authoritative architecture** using Nakama. Designed to handle real-time gameplay, matchmaking, room discovery, and persistent player statistics.

---

## 🚀 Live Demo

* 🌐 **Frontend:** https://tictactoe-tawny.vercel.app/
* ⚙️ **Backend (Nakama):** https://tictactoe-5rru.onrender.com/

---

## 🏗️ Architecture

```text
Frontend (React + Vite)
        ↓ WebSocket (WSS)
Nakama Server (Authoritative Game Logic)
        ↓
PostgreSQL (Render Managed DB)
```

---

## 🔑 Key Features

### 🎯 Core Features

* Real-time multiplayer gameplay using WebSockets
* Server-authoritative game logic (no client-side cheating)
* Automatic matchmaking (pairing players)
* Room creation and discovery system
* Graceful handling of player disconnects
* Responsive mobile-friendly UI

---

### 🧠 Server-Authoritative Design

* All game logic (moves, validation, win conditions) runs on the server
* Clients only send **intent (move index)**
* Server validates and broadcasts updated state
* Prevents tampering or cheating

---

### 🧩 Matchmaking & Rooms

* Automatic matchmaking using Nakama matchmaker
* Manual room creation via RPC
* Open room discovery using `listMatches`
* Join existing rooms or create new ones

---

### ⏱️ Timer Mode

* Turn-based timer (e.g., 30 seconds per move)
* Automatic forfeit on timeout
* Supports multiple game modes (classic / timed)

---

### 🏆 Leaderboard System

* Tracks:

  * Wins
  * Losses
  * Current streak
  * Best streak
* Persistent storage using Nakama storage engine
* Global leaderboard ranking

---

### ⚡ Concurrent Matches

* Each match runs as an isolated authoritative session
* Supports multiple simultaneous games
* Scales naturally with Nakama architecture

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* Zustand (state management)
* Tailwind CSS / Custom CSS

### Backend

* Nakama (Heroic Labs)
* JavaScript runtime (match handlers + RPCs)

### Database

* PostgreSQL (Render Managed DB)

### DevOps

* Docker
* Render (backend hosting)
* Vercel (frontend hosting)

---

## ⚙️ Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/anaghamenonn/tictactoe.git
cd tictactoe
```

---

### 2. Run Backend (Docker)

```bash
docker-compose up
```

👉 Starts:

* Nakama server
* Database (local)

---

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### 4. Environment Variables (Frontend)

Create `.env.local`:

```env
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey
```

---

## 🚀 Deployment

### Backend (Render)

* Docker-based deployment
* Nakama runs via custom `Dockerfile`
* PostgreSQL managed by Render

### Frontend (Vercel)

* Built using Vite
* Environment variables configured at build time

---

### Production Environment Variables

```env
VITE_NAKAMA_HOST=tictactoe-5rru.onrender.com
VITE_NAKAMA_PORT=443
VITE_NAKAMA_USE_SSL=true
VITE_NAKAMA_SERVER_KEY=defaultkey
```

---

## 🧪 Testing Multiplayer

1. Open the app in **two browser tabs**
2. Create or join a room
3. Ensure:

   * Players are assigned X and O correctly
   * Moves sync in real-time
   * Timer works (if enabled)
   * Leaderboard updates after match


---

## 👩‍💻 Author

**Anagha P H**  
Software Engineer

---

## 📌 Summary

This project demonstrates:

* Real-time system design
* Multiplayer game architecture
* Backend authority & validation
* Scalable deployment using Docker

---

✨ Built to showcase strong fundamentals in **real-time systems, backend design, and full-stack ownership**.
