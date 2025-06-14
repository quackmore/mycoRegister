require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Load environment variables
const user = process.env.COUCHDB_USERNAME;
const dbName = process.env.COUCHDB_DATABASE;
const jwtSecret = process.env.JWT_SECRET;

// Create JWT token
// Updated JWT payload
const tokenPayload = {
  username: "admin",
  sub: user, // This is the username
  exp: Math.floor(Date.now() / 1000) + 3600,
  _couchdb: { roles: ["user"] }
};

const token = jwt.sign(tokenPayload, jwtSecret, { algorithm: 'HS256' });

// Function to decode JWT payload
function decodeJWTPayload(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  }
  
  // Log the token and its decoded content
  console.log('JWT Token:', token);
  console.log('Decoded JWT payload:', decodeJWTPayload(token));

// Configure axios instance with JWT token in Authorization header
const instance = axios.create({
  baseURL: `http://127.0.0.1:5984/${dbName}`,
  headers: { Authorization: `Bearer ${token}` }
});

// Make GET request to CouchDB
instance.get('')
  .then(response => {
    console.log('JWT connection successful:', response.data);
  })
  .catch(error => {
    if (error.response) {
      console.error('CouchDB Error:', error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  });
