/**
 * API integration tests against an in-memory MongoDB (no real DB required).
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../app');
const { User } = require('../models/user.model');
const { Event } = require('../models/event.model');

let app;
let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGODB_URI);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  await User.deleteMany({});
  await Event.deleteMany({});
});

async function createOrganizerToken({
  name = 'Organizer',
  email = 'organizer@example.com',
  password = 'secret12',
} = {}) {
  await request(app).post('/api/auth/register').send({
    name,
    email,
    password,
    confirmPassword: password,
  });
  await User.updateOne({ email }, { $set: { role: 'organizer' } });
  const loginRes = await request(app).post('/api/auth/login').send({
    email,
    password,
  });
  return loginRes.body.token;
}

describe('GET /', () => {
  it('returns health JSON', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Event Management backend is running',
    });
  });
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns tokens (201)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Registration|successful/i);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.role).toBe('student');
  });

  it('returns 409 when email already exists', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'dup@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'B',
      email: 'dup@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'correct12',
      confirmPassword: 'correct12',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns token for valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ok User',
      email: 'ok@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'ok@example.com',
      password: 'secret12',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('ok@example.com');
  });
});

describe('Protected routes', () => {
  it('rejects /api/events without Authorization', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});

describe('Organizer event editing', () => {
  it('allows organizer to edit their own event', async () => {
    const token = await createOrganizerToken({
      name: 'Owner Organizer',
      email: 'owner@example.com',
    });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const startTime = new Date(tomorrow);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Organizer Event',
        description: 'Initial description',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: 'Main hall',
      });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body?.event?.id;
    expect(eventId).toBeTruthy();

    const updateRes = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Organizer Event Updated',
        location: 'Auditorium',
        description: 'Updated description',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body?.event?.name).toBe('Organizer Event Updated');
    expect(updateRes.body?.event?.location).toBe('Auditorium');
    expect(updateRes.body?.event?.description).toBe('Updated description');
  });

  it('blocks organizer from editing another organizer event', async () => {
    const ownerToken = await createOrganizerToken({
      name: 'Owner',
      email: 'owner2@example.com',
    });
    const otherToken = await createOrganizerToken({
      name: 'Other',
      email: 'other@example.com',
    });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const startTime = new Date(tomorrow);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Private Owner Event',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: '201',
      });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body?.event?.id;

    const updateRes = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        title: 'Unauthorized Edit',
      });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body?.message).toMatch(/only edit your own events/i);
  });
});
