require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { CohereClient } = require('cohere-ai');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Important for Supabase
});

// GET /todos
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todo_list ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});


// POST /todos
app.post('/todos', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task is required' });

  try {
    const result = await pool.query(
      'INSERT INTO todo_list (task) VALUES ($1) RETURNING *',
      [task]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await pool.query('DELETE FROM todo_list WHERE id = $1', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// POST /summarize
app.post('/summarize', async (req, res) => {
  try {
    const result = await pool.query('SELECT task FROM todo_list WHERE completed = false');
    const todos = result.rows;

    if (!todos.length) {
      return res.status(400).json({ error: 'No pending todos to summarize' });
    }

    const todoTexts = todos.map(todo => `- ${todo.task}`).join('\n');

    const response = await cohere.chat({
      model: 'command-r',
      message: `Summarize the following todo list in a concise way:\n${todoTexts}`,
      temperature: 0.5,
    });

    const summary = response.text.trim();

    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `*Todo Summary:*\n${summary}`,
    });

    res.json({ message: 'Summary sent to Slack', summary });
  } catch (error) {
    console.error('Error in /summarize:', error);
    res.status(500).json({ error: 'Failed to summarize or send to Slack' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
