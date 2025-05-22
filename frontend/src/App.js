import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await axios.get("/todos");
      setTodos(res.data);
    } catch {
      setMessage("Error loading todos.");
    }
  };

  const addTodo = async () => {
    if (!task.trim()) return;
    setLoading(true);
    try {
      await axios.post("/todos", { task });
      setTask("");
      fetchTodos();
      setMessage("Todo added!");
    } catch {
      setMessage("Failed to add todo.");
    }
    setLoading(false);
  };

  const deleteTodo = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`/todos/${id}`);
      fetchTodos();
      setMessage("Todo deleted.");
    } catch {
      setMessage("Error deleting todo.");
    }
    setLoading(false);
  };

  const toggleComplete = async (id, completed) => {
    setLoading(true);
    try {
      await axios.patch(`/todos/${id}`, { completed: !completed });
      fetchTodos();
      setMessage("Todo updated.");
    } catch {
      setMessage("Failed to update.");
    }
    setLoading(false);
  };

  const summarizeTodos = async () => {
    setLoading(true);
    try {
      setMessage("Generating summary...");
      const res = await axios.post("/summarize");
      setMessage(`Summary sent to Slack: \n${res.data.summary}`);
    } catch {
      setMessage("Error sending summary.");
    }
    setLoading(false);
  };

  return (
    <div className="wrapper">
      <header className="navbar">
        <h1>Task Manager</h1>
      </header>

      <main className="container">
        <section className="add-section">
          <input
            type="text"
            placeholder="Add a new task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            disabled={loading}
          />
          <button onClick={addTodo} disabled={!task.trim() || loading}>
            Add
          </button>
        </section>

        <section className="list-section">
          <h2>Your Tasks</h2>
          <div className="todo-list">
            {todos.length === 0 ? (
              <p className="empty">No tasks added yet.</p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`todo-card ${todo.completed ? "done" : ""}`}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() =>
                        toggleComplete(todo.id, todo.completed)
                      }
                      disabled={loading}
                    />
                    <span>{todo.task}</span>
                  </label>
                  <button
                    className="delete-btn"
                    onClick={() => deleteTodo(todo.id)}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="summary-section">
          <button
            className="summary-btn"
            onClick={summarizeTodos}
            disabled={loading || todos.length === 0}
          >
            Summarize & Send to Slack
          </button>
          {message && <div className="message-box">{message}</div>}
        </section>
      </main>

      <footer className="footer">Developed by Neeha</footer>
    </div>
  );
}

export default App;
