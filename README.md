# LMS - Learning Management System

A full-stack Learning Management System with real-time chat, appointment booking, ticket-based support, task management, and job board.

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite, Zustand, Socket.io-client, React Router v6
- **Backend**: Node.js + Express, Prisma ORM, Socket.io
- **Database**: PostgreSQL 16
- **Auth**: JWT (access + refresh tokens), bcrypt

## 📋 Features

- **Authentication** — Email/password registration & login with JWT
- **Appointment Booking** — Students book mentors, with status management
- **Support Tickets** — Threaded conversations with file attachments
- **Task Management** — Mentor-created tasks with file submission & grading
- **Real-time Chat** — Direct and group messaging via Socket.io
- **Job Board** — Job postings with resume-based applications
- **Admin Panel** — User management, role assignment, platform stats
- **Notifications** — Real-time in-app notifications

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 16 (running on `localhost:5432`)
- Create a database called `lms_db`

### Backend
```bash
cd server
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### Demo Accounts (password: `password123`)
| Role | Email |
|------|-------|
| Admin | admin@lms.com |
| Mentor | mentor1@lms.com |
| Mentor | mentor2@lms.com |
| Student | student1@lms.com |
| Student | student2@lms.com |
| Student | student3@lms.com |

## 📁 Project Structure

```
LMS/
├── client/          # React Frontend (Vite)
│   └── src/
│       ├── components/  # Layout components
│       ├── pages/       # 11 page components
│       ├── stores/      # Zustand state
│       ├── services/    # Axios API client
│       └── utils/       # Helpers
├── server/          # Node.js Backend
│   ├── prisma/      # Schema & seed
│   └── src/
│       ├── config/      # DB & env config
│       ├── middleware/  # Auth, errors, uploads
│       ├── modules/     # 8 feature modules
│       ├── socket/      # Socket.io handlers
│       └── utils/       # Email, notifications
└── README.md
```
