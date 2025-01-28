const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON requests

// MongoDB connection
const MONGO_URI = "mongodb+srv://emilioconilio:Emilsonic2009@cluster0.08kjp.mongodb.net/<dbname>?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mongoose schemas and models
const ExpenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  date: String,
  notes: String,
  type: String,
  userId: mongoose.Schema.Types.ObjectId,
});

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});

const Expense = mongoose.model('Expense', ExpenseSchema);
const User = mongoose.model('User', UserSchema);

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send({ error: 'Access denied' });

  jwt.verify(token, 'secretkey', (err, decoded) => {
    if (err) return res.status(401).send({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

// Routes
app.post('/expenses', authenticate, async (req, res) => {
  try {
    const expense = new Expense({ ...req.body, userId: req.userId });
    await expense.save();
    res.status(201).send(expense);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.get('/expenses', authenticate, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId });
    res.status(200).send(expenses);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).send({ error: 'Expense not found' });
    res.status(200).send(expense);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.delete('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) return res.status(404).send({ error: 'Expense not found' });
    res.status(200).send({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1h' });
      res.status(200).send({ token });
    } else {
      res.status(401).send({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Serve the index.html file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
