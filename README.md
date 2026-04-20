
## Frontend (React + Vite)

### Prerequisites
- **Node.js**: 20.19+ (recommended) or 22.12+

### Install & run
```bash
cd frontend
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173/`).

## Backend (Node.js + Express + MongoDB)

### Prerequisites
- **Node.js**: 20.19+ (recommended) or 22.12+
- **MongoDB**: running locally (default connection is `mongodb://localhost:27017/event_management`) or provide your own `MONGODB_URI`

### Install (first time)
```bash
cd backend
npm install
```

### Environment variables
Create `backend/.env` (or update it) with at least:
- `MONGODB_URI` (optional if using the default)
- `JWT_SECRET` (recommended)
- `REFRESH_TOKEN_SECRET` (recommended)

Example:
```env
MONGODB_URI=mongodb://localhost:27017/event_management
JWT_SECRET=your-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Default role-based users
Use these accounts to log in (the backend self-heals these managed accounts if they are missing):

| role | name | email | password |
| --- | --- | --- | --- |
| student | Student One | student1@university.ac.lk | student123 |
| facultyCoordinator | Faculty Coordinator | faculty1@university.ac.lk | faculty123 |
| organizer | Event Organizer | organizer1@university.ac.lk | organizer123 |
| admin | System Admin | admin1@university.ac.lk | admin123 |

## Event Approval + Notifications Workflow

### Event lifecycle
- Organizer creates event -> `pending`
- Admin/Faculty coordinator approves -> `approved`
- Admin/Faculty coordinator rejects -> `rejected`
- Students can browse only `approved` events

### Notification flow (preference-aware)
- On create: notifies `admin`, `superAdmin`, `facultyCoordinator`
- On approve: bulk notify all `student` users
- On reject: notify event organizer with reason
- On update (approved event): notify registered participants

### Real-time notifications
- Backend uses Socket.IO server
- Frontend listens in `useNotifications` and auto-refreshes the feed on `notification:new`

### Notification preference fields
- `email`, `sms`, `inApp`
- `eventNotifications`
- `approvalNotifications`

### Key APIs
- `POST /api/events` (organizer create)
- `GET /api/events/pending` (admin/faculty review list)
- `POST /api/events/:id/approve`
- `POST /api/events/:id/reject`
- `GET /api/events/approved` (student browse)
- `GET /api/notifications`
- `PATCH /api/notifications/read` (body: `{ id }` or `{ ids: [] }`)
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `PATCH /api/notifications/preferences`

### Run the backend
```bash
cd backend

# Development (nodemon)
npm run dev

# Production
npm start
```

Backend default URL: `http://localhost:5000`
