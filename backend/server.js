require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { CohereClient } = require('cohere-ai');
const { Pool } = require('pg');

const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Ensure table exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      task TEXT NOT NULL,
      completed BOOLEAN DEFAULT false
    );
  `);
})();

// Routes

// GET /todos
app.get('/todos', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos ORDER BY id DESC');
  res.json(result.rows);
});

// POST /todos
app.post('/todos', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task is required' });

  const result = await pool.query(
    'INSERT INTO todos (task, completed) VALUES ($1, $2) RETURNING *',
    [task, false]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  res.json({ message: 'Deleted successfully' });
});

// PATCH /todos/:id
app.patch('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  const result = await pool.query(
    'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *',
    [completed, id]
  );
  res.json(result.rows[0]);
});

// POST /summarize
app.post('/summarize', async (req, res) => {
  try {
    const result = await pool.query('SELECT task FROM todos WHERE completed = false');
    const pendingTasks = result.rows.map(row => `- ${row.task}`).join('\n');

    if (!pendingTasks) {
      return res.status(400).json({ error: 'No pending todos to summarize' });
    }

    const response = await cohere.chat({
      model: 'command-r',
      message: `Summarize the following todo list in a concise way:\n${pendingTasks}`,
      temperature: 0.5,
    });

    const summary = response.text.trim();

    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `*Todo Summary:*\n${summary}`,
    });

    res.json({ message: 'Summary sent to Slack', summary });
  } catch (error) {
    console.error('Error in /summarize:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate or send summary' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
