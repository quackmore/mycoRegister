// auth.routes.test.js

const request = require('supertest');
const express = require('express');

// UNIT TESTS FOR AUTH ROUTES
//
// Mock the controller and middleware
// jest.mock('../server/controllers', () => ({
//   authController: {
//     login: jest.fn((req, res) => res.status(200).json({ token: 'test-token' })),
//     refreshToken: jest.fn((req, res) => res.status(200).json({ token: 'new-token' })),
//     logout: jest.fn((req, res) => res.status(200).json({ message: 'Logged out' })),
//     getCurrentUser: jest.fn((req, res) => res.status(200).json({ user: { id: 'user1', name: 'Test User' } })),
//   },
// }));
// 
// jest.mock('../server/middleware', () => ({
//   authMiddleware: (req, res, next) => {
//     // Simulate authenticated user
//     req.user = { id: 'user1', name: 'Test User' };
//     next();
//   },
// }));

const authRoutes = require('../server/routes/auth.routes'); // Adjust path as needed

// Create an Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// save token and refreshToken for later use
let token = null;
let refreshToken = null;


describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should login and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ user: 'admin', password: 'password' });
      expect(res.statusCode).toBe(200);
      token = res.body.data.token;
      refreshToken = res.body.data.refreshToken;
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });
      expect(res.statusCode).toBe(200);
      token = res.body.data.token;
    });
  });

  describe('GET http://localhost:5984/inventory', () => {
    it('should return inventory info', async () => {
      const response = await fetch('http://localhost:5984/inventory', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual('admin');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${refreshToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logout successful');
    });
  });
});
