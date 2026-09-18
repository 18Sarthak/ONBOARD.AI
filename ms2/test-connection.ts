import dotenv from 'dotenv';
dotenv.config();

import { getPrisma } from './src/db/prismaClient';

async function test() {
  console.log('Initialising Prisma via Neon WebSocket adapter...');
  // Call getPrisma() first — this sets _prisma internally
  const db = await getPrisma();
  console.log('getPrisma() resolved — adapter connected.');

  // Now use the returned client directly (not the proxy)
  const reqCount = await db.request.count();
  console.log('✓ Request rows:', reqCount);

  const chunkCount = await db.policyChunk.count();
  console.log('✓ PolicyChunk rows:', chunkCount);

  const logCount = await db.agentLog.count();
  console.log('✓ AgentLog rows:', logCount);

  const approvalCount = await db.agentApproval.count();
  console.log('✓ AgentApproval rows:', approvalCount);

  console.log('\n✅ Database fully connected and all tables accessible!');
  process.exit(0);
}

test().catch(e => {
  console.error('✗ Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
