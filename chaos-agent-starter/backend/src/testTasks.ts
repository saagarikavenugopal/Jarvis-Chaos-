import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  getTaskAnalytics,
  isTaskOverdue
} from './taskDatabase.js';
import {
  parseTaskRequestDeterministic,
  generateDailyTaskSummary
} from './taskAiService.js';

async function runTests() {
  console.log('--- STARTING SMART TASK MANAGER VERIFICATION ---');

  // Test 1: Vault Initialization
  const initialTasks = getAllTasks();
  console.log(`[Test 1: Vault Init] Loaded ${initialTasks.length} tasks from vault.`);
  if (initialTasks.length === 0) throw new Error('Initial sample tasks failed to load');

  // Test 2: Task Creation with all required fields
  const created = createTask({
    title: 'Deploy quantum encryption key distribution server',
    description: 'Post-quantum lattice cryptography verification on node cluster',
    priority: 'urgent',
    dueDate: '2026-11-28',
    dueTime: '14:00',
    category: 'Security',
    status: 'pending',
    subtasks: [
      { id: 'sub_1', title: 'Generate Kyber-1024 public keys', completed: true },
      { id: 'sub_2', title: 'Validate quantum entropy source', completed: false }
    ],
    tags: ['crypto', 'security']
  });
  console.log(`[Test 2: Task Creation] Successfully created task: ${created.id} - "${created.title}"`);
  if (!created.id || created.priority !== 'urgent' || created.subtasks.length !== 2) {
    throw new Error('Task creation field mismatch');
  }

  // Test 3: Task Update & Status/Priority Change
  const updated = updateTask(created.id, {
    status: 'in_progress',
    priority: 'high',
    dueTime: '16:30'
  });
  console.log(`[Test 3: Task Update] Status updated to: ${updated?.status}, Priority: ${updated?.priority}, DueTime: ${updated?.dueTime}`);
  if (updated?.status !== 'in_progress' || updated?.priority !== 'high' || updated?.dueTime !== '16:30') {
    throw new Error('Task update failed');
  }

  // Test 4: Subtask Management (Add, Toggle, Delete)
  const taskWithNewSub = addSubtask(created.id, 'Run cross-validation on HSM module');
  console.log(`[Test 4a: Add Subtask] Subtask count is now: ${taskWithNewSub?.subtasks.length}`);
  if (taskWithNewSub?.subtasks.length !== 3) throw new Error('Failed to add subtask');

  const addedSubId = taskWithNewSub.subtasks[2].id!;
  const taskWithToggledSub = toggleSubtask(created.id, addedSubId);
  const toggledSub = taskWithToggledSub?.subtasks.find(s => s.id === addedSubId);
  console.log(`[Test 4b: Toggle Subtask] Subtask completion is: ${toggledSub?.completed}`);
  if (!toggledSub?.completed) throw new Error('Failed to toggle subtask');

  const taskWithDeletedSub = deleteSubtask(created.id, addedSubId);
  console.log(`[Test 4c: Delete Subtask] Subtask count after deletion: ${taskWithDeletedSub?.subtasks.length}`);
  if (taskWithDeletedSub?.subtasks.length !== 2) throw new Error('Failed to delete subtask');

  // Test 5: Task Analytics & HUD Metrics
  const analytics = getTaskAnalytics();
  console.log(`[Test 5: Analytics] Total: ${analytics.totalTasks}, Pending: ${analytics.pendingTasks}, InProgress: ${analytics.inProgressTasks}, Completed: ${analytics.completedTasks}, Overdue: ${analytics.overdueTasks}, Velocity: ${analytics.completionRate}%`);
  if (analytics.totalTasks <= 0) throw new Error('Analytics failed');

  // Test 6: AI Task Intelligence - "Complete my project documentation by Friday."
  const refDate = new Date('2026-11-24T12:00:00Z'); // Tuesday Nov 24, 2026
  const prompt1 = 'Complete my project documentation by Friday.';
  const res1 = parseTaskRequestDeterministic(prompt1, refDate);
  console.log(`[Test 6: NLP Prompt 1] Result intent: ${res1.intent}`);
  console.log(`   Message: ${res1.message}`);
  console.log(`   Task: "${res1.tasksToCreate?.[0]?.title}", DueDate: "${res1.tasksToCreate?.[0]?.dueDate}", Category: "${res1.tasksToCreate?.[0]?.category}"`);
  
  // Friday from Tuesday Nov 24, 2026 is Nov 27, 2026
  if (res1.tasksToCreate?.[0]?.dueDate !== '2026-11-27') {
    throw new Error(`Expected Friday date 2026-11-27, got ${res1.tasksToCreate?.[0]?.dueDate}`);
  }
  if (!res1.tasksToCreate?.[0]?.title.toLowerCase().includes('project documentation')) {
    throw new Error('Title extraction mismatch');
  }

  // Test 7: AI Task Intelligence - "Create three tasks for preparing my hackathon presentation."
  const prompt2 = 'Create three tasks for preparing my hackathon presentation.';
  const res2 = parseTaskRequestDeterministic(prompt2, refDate);
  console.log(`[Test 7: NLP Prompt 2] Result intent: ${res2.intent}, tasks count: ${res2.tasksToCreate?.length}`);
  if (res2.intent !== 'create_multiple' || res2.tasksToCreate?.length !== 3) {
    throw new Error('Expected 3 tasks created for hackathon');
  }

  // Test 8: AI Task Intelligence - "Show me my most urgent pending tasks."
  const prompt3 = 'Show me my most urgent pending tasks.';
  const res3 = parseTaskRequestDeterministic(prompt3, refDate);
  console.log(`[Test 8: NLP Prompt 3] Result intent: ${res3.intent}, found tasks: ${res3.queryResults?.length}`);
  if (res3.intent !== 'query' || !res3.queryResults) {
    throw new Error('Expected query intent with results');
  }

  // Test 9: AI Task Intelligence - "Break my project into smaller tasks."
  const prompt4 = 'Break my project into smaller tasks.';
  const res4 = parseTaskRequestDeterministic(prompt4, refDate);
  console.log(`[Test 9: NLP Prompt 4] Result intent: ${res4.intent}, suggested subtasks: ${res4.suggestedSubtasks?.length}`);
  if (res4.intent !== 'decompose' || (res4.suggestedSubtasks?.length || 0) < 3) {
    throw new Error('Expected task decomposition subtasks');
  }

  // Test 10: AI Task Intelligence - Rule: Do not invent deadlines when not stated
  const prompt5 = 'Create a task for refactoring backend database queries';
  const res5 = parseTaskRequestDeterministic(prompt5, refDate);
  console.log(`[Test 10: No arbitrary deadline] DueDate: "${res5.tasksToCreate?.[0]?.dueDate}" (should be empty), InferredDeadline: ${res5.tasksToCreate?.[0]?.inferredDeadline}`);
  if (res5.tasksToCreate?.[0]?.dueDate !== '') {
    throw new Error('Violated rule: Invented an arbitrary deadline when user gave none!');
  }

  // Test 11: Daily Task Summary & Recommendations based on actual data
  const dailySummary = generateDailyTaskSummary(refDate);
  console.log(`[Test 11: Daily Summary] Summary text: "${dailySummary.summary.slice(0, 80)}..."`);
  console.log(`   Recommendations count: ${dailySummary.recommendations.length}`);
  console.log(`   Sample recommendation: "${dailySummary.recommendations[0]}"`);
  if (!dailySummary.summary || dailySummary.recommendations.length === 0) {
    throw new Error('Daily summary failed');
  }

  // Test 12: Delete Task with cleanup
  const deleted = deleteTask(created.id);
  console.log(`[Test 12: Delete Task] Cleanup deleted task ${created.id}: ${deleted}`);
  if (!deleted) throw new Error('Task deletion failed');

  console.log('--- ALL 12 VERIFICATION SUITES PASSED PERFECTLY! ---');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
