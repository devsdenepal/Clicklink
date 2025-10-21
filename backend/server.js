require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const memberRoutes = require('./routes/members');
const githubRoutes = require('./routes/github');
const githubAuthRoutes = require('./routes/githubAuth');
const githubStatsRoutes = require('./routes/githubStats');
const { errorHandler } = require('./middleware/error');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/auth', githubAuthRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/github', githubStatsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));

