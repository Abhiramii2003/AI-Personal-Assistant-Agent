/**
 * In-Memory Task Manager Tool
 * 
 * Manages personal tasks in memory for learning and demonstration purposes.
 * Note: In a production system, this would persist data to a database (PostgreSQL, MongoDB, SQLite).
 * 
 * Supports:
 * - Adding tasks
 * - Listing all tasks (with completion status)
 * - Marking tasks as completed
 * - Deleting tasks
 * - Clearing tasks
 */

let tasks = [
  {
    id: 1,
    title: "Learn AI Agent Architecture",
    completed: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }
];

let nextId = 2;

/**
 * Add a new task
 * @param {string} title - Task description
 */
function addTask(title) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return {
      success: false,
      error: 'Task title cannot be empty.'
    };
  }

  // Clean quotes or extra phrasing from title
  const cleanTitle = title.replace(/^["']|["']$/g, '').trim();

  const newTask = {
    id: nextId++,
    title: cleanTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);

  return {
    success: true,
    message: `Task "${cleanTitle}" added successfully.`,
    task: newTask,
    totalTasks: tasks.length
  };
}

/**
 * List all tasks
 */
function listTasks() {
  if (tasks.length === 0) {
    return {
      success: true,
      tasks: [],
      message: 'You have no tasks in your list. Try adding one by saying "Add Learn React to my tasks".',
      formatted: 'No tasks found.'
    };
  }

  const formatted = tasks
    .map((t, idx) => `${idx + 1}. [${t.completed ? '✓' : ' '}] ${t.title} (ID: ${t.id})`)
    .join('\n');

  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return {
    success: true,
    tasks: [...tasks],
    total: tasks.length,
    pendingCount,
    completedCount,
    formatted,
    message: `You have ${tasks.length} task${tasks.length === 1 ? '' : 's'} (${pendingCount} pending, ${completedCount} completed):\n${formatted}`
  };
}

/**
 * Find task by ID or partial title match
 */
function findTask(query) {
  if (!query) return null;
  const trimmed = String(query).replace(/^["']|["']$/g, '').trim();

  // Try numeric ID
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId)) {
    const byId = tasks.find(t => t.id === numericId);
    if (byId) return byId;
  }

  // Try exact title match (case-insensitive)
  const exact = tasks.find(t => t.title.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  // Try partial title match
  return tasks.find(t => t.title.toLowerCase().includes(trimmed.toLowerCase()));
}

/**
 * Complete a task
 * @param {string|number} query - Task ID or title
 */
function completeTask(query) {
  const task = findTask(query);

  if (!task) {
    return {
      success: false,
      error: `Could not find a task matching "${query}". Check your tasks with "Show my tasks".`
    };
  }

  if (task.completed) {
    return {
      success: true,
      task,
      message: `Task "${task.title}" was already marked as completed.`
    };
  }

  task.completed = true;
  task.completedAt = new Date().toISOString();

  return {
    success: true,
    task,
    message: `Task "${task.title}" (ID: ${task.id}) marked as completed!`
  };
}

/**
 * Delete a task
 * @param {string|number} query - Task ID or title
 */
function deleteTask(query) {
  const task = findTask(query);

  if (!task) {
    return {
      success: false,
      error: `Could not find a task matching "${query}" to delete.`
    };
  }

  tasks = tasks.filter(t => t.id !== task.id);

  return {
    success: true,
    deletedTask: task,
    remainingCount: tasks.length,
    message: `Task "${task.title}" (ID: ${task.id}) deleted successfully.`
  };
}

/**
 * Clear all tasks
 */
function clearTasks() {
  const count = tasks.length;
  tasks = [];
  nextId = 1;
  return {
    success: true,
    message: `Cleared ${count} task${count === 1 ? '' : 's'}.`
  };
}

/**
 * Get raw tasks array
 */
function getTasks() {
  return [...tasks];
}

module.exports = {
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  clearTasks,
  getTasks
};
