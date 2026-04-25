# SLIIT Event Management System

Full-stack MERN event platform with role-based workflows, approvals, real-time notifications, analytics, smart resource tracking, and event story PDF reporting.

## Tech Stack

- Frontend: React, Vite, Tailwind, Radix UI, Recharts, Axios, Socket.IO client
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.IO, PDFKit
- Testing: Jest/Supertest (backend), Playwright (frontend e2e)

## Key Features

- Role-based access for `student`, `staff`, `organizer`, `facultyCoordinator`, `admin`, `superAdmin`
- Event lifecycle and approval workflow
- Google OAuth login + email/password authentication
- Login security:
  - failed-attempt tracking
  - account lockout after repeated failures
  - admin unlock/reset support
- Real-time notification system (Socket.IO)
- Admin user management (role/status/profile/password controls)
- Account deletion request flow with reason logging
- Smart resource tracker:
  - seats, registrations, unused seats
  - wasted capacity %
  - utilization efficiency score
- Event Story PDF export for completed events (with attendance and feedback summary)
- Recycle bin support for events (restore/permanent delete)

## Project Structure

```text
SLIIT-Event-management-System/
  backend/      # Express API + MongoDB models/controllers/routes
  frontend/     # React SPA (Vite)
```

## Prerequisites

- Node.js 18+ (22 recommended)
- npm 9+
- MongoDB Atlas/local MongoDB

## Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# App URLs (no trailing slash)
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:5000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Email (optional but recommended for notifications/reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
MAIL_FROM=your_email

# Feature flags
FEEDBACK_REQUIRE_CHECKIN=false
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Installation

From project root:

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

## Run Locally

Open two terminals:

```bash
# Terminal 1 - backend
cd backend
npm run dev

# Terminal 2 - frontend
cd frontend
npm run dev
```

App URLs:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

## Available Scripts

### Backend

- `npm run dev` - start with nodemon
- `npm start` - production start
- `npm test` - run Jest tests

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - lint project
- `npm run test:e2e` - run Playwright tests

## Core API Highlights

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/oauth/google/start`
- `GET /api/auth/oauth/google/callback`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Events

- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id`
- `PUT /api/events/:id`
- `POST /api/events/:id/approve`
- `POST /api/events/:id/reject`
- `GET /api/events/:id/resource-insights`
- `GET /api/events/:id/story-pdf`
- `POST /api/events/preview-simulation`

### Admin

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/unlock`
- `DELETE /api/admin/events/:id` (move to recycle bin)
- `GET /api/admin/recycle-bin/events`
- `POST /api/admin/recycle-bin/events/:id/restore`
- `DELETE /api/admin/recycle-bin/events/:id` (permanent delete)
- `GET /api/admin/events/resource-analytics`
- `GET /api/admin/deletion-requests`

### User Profile

- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/upload-image`
- `POST /api/users/deletion-request`

## Real-Time Notifications

Socket.IO is initialized on backend and consumed in frontend notification hooks. In-app notifications are pushed live for workflow/security actions (including account lock alerts and deletion requests).

## Troubleshooting

- `EADDRINUSE: 5000`:
  - stop old Node process using port 5000
  - restart backend
- OAuth 503/config errors:
  - verify Google OAuth env values
  - ensure callback URL exactly matches Google Console
- `404` on admin event delete:
  - ensure backend is restarted after latest route/controller changes

## Security Notes

- Never commit real secrets (`.env`, API keys, DB credentials)
- Use strong JWT secrets and rotate periodically
- Restrict CORS and callback URLs in production

## License

For academic/project use. Add your official license file if required.
