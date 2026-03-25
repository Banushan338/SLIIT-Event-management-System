
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

### Seed the database (first time)
Run these once when setting up a fresh database:

```bash
cd backend

# Seed users (student/facultyCoordinator/organizer/admin)
npm run seed:users

# Seed other data (optional)
npm run seed:events
npm run seed:faculty

# Or run everything:
npm run seed:all
```

### Default users (created by `npm run seed:users`)
Use these accounts to log in after seeding:

| role | name | email | password |
| --- | --- | --- | --- |
| student | Student One | student1@university.ac.lk | student123 |
| facultyCoordinator | Faculty Coordinator | faculty1@university.ac.lk | faculty123 |
| organizer | Event Organizer | organizer1@university.ac.lk | organizer123 |
| admin | System Admin | admin1@university.ac.lk | admin123 |

### Run the backend
```bash
cd backend

# Development (nodemon)
npm run dev

# Production
npm start
```

Backend default URL: `http://localhost:5000`
