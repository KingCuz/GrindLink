// --- File: index.js ---
// This file sets up and runs the core API server and serves the React front-end.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Firestore } = require('@google-cloud/firestore');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// IMPORTANT: The Firebase config and app ID are provided by the environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  projectId: 'demo-gcp-project',
  keyFilename: 'path/to/your-service-account.json'
};

let db;
try {
  db = new Firestore({
    projectId: firebaseConfig.projectId,
    keyFilename: firebaseConfig.keyFilename,
  });
  console.log('Firestore client initialized successfully.');
} catch (e) {
  console.error('Error initializing Firestore:', e);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- API Endpoints ---
app.post('/api/assignments', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized.' });
  const { gig_id, assignee_id, due_date, status } = req.body;
  if (!gig_id || !assignee_id || !due_date || !status) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const assignmentsCollection = db.collection(`artifacts/${appId}/public/data/assignments`);
    const newAssignment = {
      gig_id, assignee_id, due_date: new Date(due_date), status, created_at: new Date(),
    };
    const docRef = await assignmentsCollection.add(newAssignment);
    const createdAssignment = {
      id: docRef.id, ...newAssignment, due_date: newAssignment.due_date.toISOString(), created_at: newAssignment.created_at.toISOString(),
    };
    io.emit('new_assignment', createdAssignment);
    res.status(201).json({ message: 'Assignment added successfully', assignment: createdAssignment });
  } catch (error) {
    console.error('Error adding assignment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/assignments', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized.' });
  try {
    const assignmentsCollection = db.collection(`artifacts/${appId}/public/data/assignments`);
    const snapshot = await assignmentsCollection.orderBy('created_at', 'desc').get();
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data(), due_date: doc.data().due_date.toDate().toISOString(), created_at: doc.data().created_at.toDate().toISOString(),
    }));
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/users', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized.' });
  const { username, bio, skills } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is a required field.' });
  try {
    const usersCollection = db.collection(`artifacts/${appId}/public/data/users`);
    const newUser = { username, bio: bio || '', skills: skills || [], created_at: new Date() };
    const docRef = await usersCollection.add(newUser);
    const createdUser = { id: docRef.id, ...newUser, created_at: newUser.created_at.toISOString() };
    io.emit('new_user', createdUser);
    res.status(201).json({ message: 'User profile created successfully', user: createdUser });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/users', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized.' });
  try {
    const usersCollection = db.collection(`artifacts/${appId}/public/data/users`);
    const snapshot = await usersCollection.orderBy('created_at', 'desc').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data(), created_at: doc.data().created_at.toDate().toISOString(),
    }));
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Serve Static React Files ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start the Server ---
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
