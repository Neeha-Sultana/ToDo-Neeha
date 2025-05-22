import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    const res = await axios.get('/todos');
    setTodos(res.data);
  };

  const addTodo = async () => {
    if (!task) return;
    await axios.post('/todos', { task });
    setTask('');
    fetchTodos();
  };

  const deleteTodo = async (id) => {
    await axios.delete(`/todos/${id}`);
    fetchTodos();
  };

  const toggleComplete = async (id, completed) => {
    await axios.patch(`/todos/${id}`, { completed: !completed });
    fetchTodos();
  };

  const summarizeTodos = async () => {
    try {
      const res = await axios.post('/summarize');
      setMessage(`Success: ${res.data.summary}`);
    } catch {
      setMessage('Failed to send summary.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Todo Summary Assistant</h1>

      <input
        type="text"
        value={task}
        onChange={e => setTask(e.target.value)}
        placeholder="Enter new task"
      />
      <button onClick={addTodo}>Add Todo</button>

      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleComplete(todo.id, todo.completed)}
            />{' '}
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.task}
            </span>{' '}
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={summarizeTodos}>Summarize & Send to Slack</button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default App;
