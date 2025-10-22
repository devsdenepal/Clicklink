const Activity = require('../models/Activity');

/**
 * Log a user activity related to a task.
 * @param {Object} params
 * @param {Object} params.user - The authenticated user payload (from JWT)
 * @param {string} params.action - Action description, e.g. 'created task', 'updated task', 'created subtask'
 * @param {Object} [params.task] - Task object containing id/name or similar
 * @param {string} [params.taskId] - Explicit task id override
 * @param {string} [params.taskName] - Explicit task name override
 */
async function logActivity({ user, action, task, taskId, taskName }) {
  try {
    if (!user || !action) return;
    const doc = new Activity({
      userId: String(user.id || user.userId || user.email || 'unknown'),
      username: user.username || user.email || undefined,
      action: String(action),
      taskId: String(taskId || task?.id || task?.task?.id || ''),
      taskName: String(taskName || task?.name || task?.task?.name || task?.title || ''),
      timestamp: new Date()
    });
    await doc.save();
  } catch (e) {
    // Do not disrupt main flow on logging failure
    console.warn('Activity logging failed:', e?.message || e);
  }
}

module.exports = logActivity;
