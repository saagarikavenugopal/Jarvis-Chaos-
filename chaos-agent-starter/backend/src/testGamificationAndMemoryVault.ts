import {
  getGamificationProfile,
  recordTaskCompletionGamification,
  recordFocusSession,
  toggleDailyGoalTarget,
  checkDailyGoalsCompletion,
  createCustomChallenge,
  generateProcrastinationAssistance,
  awardXp,
  USER_LEVELS
} from './gamificationDatabase.js';

import {
  getAllMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
  toggleFavoriteMemory,
  linkTaskToMemory,
  unlinkTaskFromMemory,
  findRelevantGoalsForAssistance
} from './memoryVaultDatabase.js';

import { Task } from './taskDatabase.js';

console.log('====================================================');
console.log('TEST SUITE: FEATURE 2 – BEAT PROCRASTINATION & MEMORY VAULT');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

// 1. Verify Memory Vault CRUD & Linking
console.log('\n--- 1. Testing Memory Vault Engine ---');
const testMem = createMemory({
  title: 'Win Hackathon Autonomous Agents Track',
  content: 'Deliver an astonishing live demo showcasing task manager and memory integration',
  category: 'Project Goal',
  importance: 'critical',
  goalDeadline: '2026-11-28',
  tags: ['hackathon', 'pitch', 'victory']
});

assert(Boolean(testMem.id), 'Memory created with unique ID');
assert(testMem.category === 'Project Goal', 'Category assigned correctly');
assert(testMem.tags.includes('hackathon'), 'Tags normalized and saved');

const fetchedMem = getMemoryById(testMem.id);
assert(fetchedMem?.title === 'Win Hackathon Autonomous Agents Track', 'Memory retrieved by ID');

// Link task
const linked = linkTaskToMemory(testMem.id, 'task_test_999');
assert(Boolean(linked?.linkedTaskIds.includes('task_test_999')), 'Task linked to memory');

// Toggle favorite
const faved = toggleFavoriteMemory(testMem.id);
assert(faved?.isFavorite === true, 'Favorite toggled on');

// Find relevant goals for assistance
const matchedGoals = findRelevantGoalsForAssistance(['task_test_999']);
assert(matchedGoals.some(g => g.id === testMem.id), 'Procrastination assistance retrieves linked memory goal');

// Unlink task
const unlinked = unlinkTaskFromMemory(testMem.id, 'task_test_999');
assert(!unlinked?.linkedTaskIds.includes('task_test_999'), 'Task unlinked from memory');

// Cleanup test memory
const deleted = deleteMemory(testMem.id);
assert(deleted === true, 'Memory successfully removed');

// 2. Testing Gamification & XP Idempotency
console.log('\n--- 2. Testing Gamification & XP Calculations ---');

const initialProfile = getGamificationProfile();
const initialXp = initialProfile.totalXp;
console.log(`Starting Total XP: ${initialXp}, Level: ${initialProfile.currentLevel.title}`);

const mockTask: Task = {
  id: `test_task_${Date.now()}`,
  title: 'Critical Bugfix and Release',
  description: 'Resolve high priority items',
  priority: 'urgent',
  status: 'completed',
  dueDate: '2026-12-31',
  dueTime: '18:00',
  category: 'Engineering',
  subtasks: [
    { id: 'sub_1', title: 'Unit tests', completed: true },
    { id: 'sub_2', title: 'Integration tests', completed: true }
  ],
  tags: ['urgent'],
  source: 'manual',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// First completion: 120 base (urgent) + 30 on-time + 30 (2 subtasks * 15) = 180 XP
const completion1 = recordTaskCompletionGamification(mockTask);
assert(completion1.awarded === true, 'First task completion awards XP');
assert(completion1.xpEarned === 180, `Expected 180 XP for urgent task with 2 subtasks, got ${completion1.xpEarned} XP`);
assert(completion1.breakdown.length >= 3, 'XP transparent breakdown contains multiple factors');

// Idempotency check: Repeated completion of same task MUST NOT award XP again!
const completion2 = recordTaskCompletionGamification(mockTask);
assert(completion2.awarded === false, 'Duplicate completion blocked by idempotency key');
assert(completion2.xpEarned === 0, 'Zero XP awarded on duplicate completion');

// 3. Testing Pomodoro Focus Session
console.log('\n--- 3. Testing Pomodoro Focus Sprints ---');
const focusRes = recordFocusSession(25, mockTask.id);
assert(focusRes.xpEarned === 80, `25-minute Pomodoro awards 80 XP, got ${focusRes.xpEarned}`);

// 4. Testing Daily Goals & Custom Challenges
console.log('\n--- 4. Testing Daily Goals & Challenges ---');
const toggledGoal = toggleDailyGoalTarget(mockTask.id);
assert(toggledGoal.dailyGoalTargets.includes(mockTask.id), 'Task added to daily goal targets');

const newChal = createCustomChallenge({
  title: 'Resolve 3 High Priority Objectives',
  description: 'Deep work sprint',
  targetCount: 3,
  xpReward: 200,
  category: 'weekly'
});
assert(Boolean(newChal.id), 'Custom challenge created');
assert(newChal.xpReward === 200, 'Challenge reward stored accurately');

// 5. Testing Procrastination Assistance Engine
console.log('\n--- 5. Testing Procrastination Assistance Engine ---');
const diagnosis = generateProcrastinationAssistance();
assert(Boolean(diagnosis.encouragingMessage), 'Compassionate, non-judgmental encouraging message generated');
assert(Boolean(diagnosis.recommendedStartingAction), 'Realistic 2-5 min micro-commitment generated');
assert(diagnosis.focusSessionSuggestion.durationMinutes === 25, '25-minute Pomodoro focus session recommended');
assert(Boolean(diagnosis.productivityTip), 'Science-backed productivity tip included');

// Summary
console.log('\n====================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} Tests Passed successfully!`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
