# ✈️ SkyWave Airlines

SkyWave Airlines is a full-featured, modern, and highly secure flight booking and operations management system. Powered by the **MERN stack** (MongoDB, Express, React, Node.js) and enhanced with real-time capabilities, it delivers a premium experience for travelers and administrators alike.

---

## 🌟 Key Features

| Feature                          | Description                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| 🤖 AI-Powered Flight Suggestions | Highlights the best, cheapest, or fastest flights using a customized ranking engine            |
| 🔒 Real-Time Seat Locking        | WebSockets lock selected seats for up to 8 minutes during checkout, preventing double-bookings |
| 👑 Elite SkyWave Club            | Dynamic loyalty tiers (Bronze, Silver, Gold, Platinum) with automated rewards                  |

---

## 🖥️ Three Specialized Portals

| Portal                     | URL                   |
| -------------------------- | --------------------- |
| 🧳 Traveler Portal         | http://localhost:3002 |
| ⚙️ Operations Admin Portal | http://localhost:3003 |
| 👑 Super Admin Portal      | http://localhost:3004 |

---

## 🔐 Default Test Credentials

Use the following credentials to access each portal locally.

| Role                | Portal                         | Email                    | Password      |
| ------------------- | ------------------------------ | ------------------------ | ------------- |
| 🧳 Customer User    | Traveler Portal (3002)         | `user@skywave.com`       | `password123` |
| ⚙️ Operations Admin | Operations Admin Portal (3003) | `admin@skywave.com`      | `password123` |
| 👑 Super Admin      | Super Admin Portal (3004)      | `superadmin@skywave.com` | `password123` |

> ⚠️ These credentials are intended for **local development and testing only**. Change all default credentials before deploying to production.

---

## 🛠️ Tech Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | React, Vite, CSS (Glassmorphism) |
| Backend  | Node.js, Express, Socket.io      |
| Database | MongoDB, Mongoose                |
| DevOps   | Docker, Docker Compose, Nginx    |

---

## 🚀 Getting Started

### Option 1: Docker (Recommended)

```bash
docker-compose up --build
```

### Option 2: Local Setup

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev:user
npm run dev:admin
npm run dev:superadmin
```

### Access URLs

* 🧳 Traveler Portal → `http://localhost:3002`
* ⚙️ Operations Admin Portal → `http://localhost:3003`
* 👑 Super Admin Portal → `http://localhost:3004`
