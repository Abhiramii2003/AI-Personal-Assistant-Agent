/**
 * Automated Test Suite for AI Personal Assistant Agent
 * 
 * Verifies:
 * 1. Safe Calculator tool logic
 * 2. DateTime tool output
 * 3. Task Manager CRUD operations
 * 4. Intent Planning and Validation
 * 5. End-to-end Agent Execution Loop
 * 6. Multi-turn Conversation Memory
 */

const { calculate } = require('./tools/calculator');
const { getCurrentDateTime } = require('./tools/dateTime');
const { addTask, listTasks, completeTask, deleteTask, clearTasks } = require('./tools/taskManager');
const { createPlan } = require('./agent/planner');
const { runAgent } = require('./agent/agent');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Agent Test Suite');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // 1. Calculator Tool Tests
  // ---------------------------------------------------------------
  console.log('▶ Testing Tool 1: Calculator');
  
  const calc1 = calculate('25 * 48');
  assert(calc1.success === true && calc1.result === 1200, `25 * 48 = 1200 (Got: ${calc1.result})`);

  const calc2 = calculate('100 / 4');
  assert(calc2.success === true && calc2.result === 25, `100 / 4 = 25 (Got: ${calc2.result})`);

  const calc3 = calculate('20% of 500');
  assert(calc3.success === true && calc3.result === 100, `20% of 500 = 100 (Got: ${calc3.result})`);

  const calc4 = calculate('(10 + 20) * 3');
  assert(calc4.success === true && calc4.result === 90, `(10 + 20) * 3 = 90 (Got: ${calc4.result})`);

  const calc5 = calculate('100 / 0');
  assert(calc5.success === false, `Division by zero rejected safely (Error: ${calc5.error})`);

  // ---------------------------------------------------------------
  // 2. DateTime Tool Tests
  // ---------------------------------------------------------------
  console.log('\n▶ Testing Tool 2: DateTime');
  
  const dt = getCurrentDateTime();
  assert(dt.success === true, 'DateTime returned success: true');
  assert(typeof dt.dayOfWeek === 'string' && dt.dayOfWeek.length > 0, `Day of week present: "${dt.dayOfWeek}"`);
  assert(typeof dt.date === 'string' && dt.date.length > 0, `Formatted date present: "${dt.date}"`);
  assert(typeof dt.time === 'string' && dt.time.length > 0, `Formatted time present: "${dt.time}"`);

  // ---------------------------------------------------------------
  // 3. Task Manager Tool Tests
  // ---------------------------------------------------------------
  console.log('\n▶ Testing Tool 3: Task Manager');
  
  clearTasks();
  const addRes1 = addTask('Learn AI Agents');
  assert(addRes1.success === true && addRes1.task.title === 'Learn AI Agents', 'Added task "Learn AI Agents"');

  const addRes2 = addTask('Build React Frontend');
  assert(addRes2.success === true && addRes2.task.title === 'Build React Frontend', 'Added task "Build React Frontend"');

  const listRes = listTasks();
  assert(listRes.success === true && listRes.total === 2, `Listed 2 tasks (Got: ${listRes.total})`);

  const compRes = completeTask('Learn AI Agents');
  assert(compRes.success === true && compRes.task.completed === true, 'Completed task "Learn AI Agents"');

  const delRes = deleteTask('Build React Frontend');
  assert(delRes.success === true && delRes.remainingCount === 1, 'Deleted task "Build React Frontend"');

  // ---------------------------------------------------------------
  // 4. Planner Tests
  // ---------------------------------------------------------------
  console.log('\n▶ Testing Planner Intent Analysis');
  
  const planCalc = await createPlan('What is 25 * 48?');
  assert(planCalc.action === 'calculator', `Planned "calculator" for math query (Got: ${planCalc.action})`);

  const planDate = await createPlan("What is today's date?");
  assert(planDate.action === 'datetime', `Planned "datetime" for date query (Got: ${planDate.action})`);

  const planTask = await createPlan('Add Learn React to my tasks');
  assert(planTask.action === 'add_task', `Planned "add_task" for task addition (Got: ${planTask.action})`);

  const planLlm = await createPlan('Tell me a joke');
  assert(planLlm.action === 'llm', `Planned "llm" for general conversation (Got: ${planLlm.action})`);

  // ---------------------------------------------------------------
  // 5. End-to-End Agent Loop Execution Tests
  // ---------------------------------------------------------------
  console.log('\n▶ Testing End-to-End Agent Loop');

  const resCalc = await runAgent('What is 25 * 48?');
  assert(resCalc.success === true, 'Agent calculation completed successfully');
  assert(resCalc.toolUsed === 'calculator', `Agent reported toolUsed: "calculator" (Got: ${resCalc.toolUsed})`);
  assert(resCalc.message.includes('1200'), `Agent response contains result 1200 (Message: "${resCalc.message}")`);
  assert(Array.isArray(resCalc.agentSteps) && resCalc.agentSteps.length > 0, `Agent logged ${resCalc.agentSteps.length} execution steps`);

  const resDate = await runAgent("What is today's date?");
  assert(resDate.success === true && resDate.toolUsed === 'dateTime', 'Agent date query used dateTime tool');

  const resAdd = await runAgent('Add Master Node.js to my tasks');
  assert(resAdd.success === true && resAdd.toolUsed === 'taskManager', 'Agent task query used taskManager tool');

  const resShow = await runAgent('Show my tasks');
  assert(resShow.success === true && resShow.toolUsed === 'taskManager', 'Agent show tasks query used taskManager tool');

  const resConv = await runAgent('Explain what an AI agent is.');
  assert(resConv.success === true && resConv.toolUsed === null, 'Agent conversational question answered without tool');

  // ---------------------------------------------------------------
  // 6. Conversation Memory Test
  // ---------------------------------------------------------------
  console.log('\n▶ Testing Multi-turn Conversation Memory');

  const history = [
    { role: 'user', content: 'My name is Abhirami.' },
    { role: 'assistant', content: 'Nice to meet you, Abhirami! How can I help you today?' }
  ];

  const resMemory = await runAgent('What is my name?', history);
  assert(resMemory.success === true, 'Memory query completed successfully');
  assert(resMemory.message.toLowerCase().includes('abhirami'), `Agent recalled user name "Abhirami" (Response: "${resMemory.message}")`);

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
