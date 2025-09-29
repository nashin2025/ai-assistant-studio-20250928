import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Example users endpoint
router.get('/users', (req, res) => {
  // TODO: Implement user retrieval from database
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // TODO: Save user to database
  const newUser = { id: Date.now(), name, email };
  res.status(201).json(newUser);
});

export { router as apiRoutes };