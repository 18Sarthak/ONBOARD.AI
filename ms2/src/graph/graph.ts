import { Annotation, StateGraph, END, Command, MemorySaver } from '@langchain/langgraph';

import { retrievePolicy } from './nodes/retrievePolicy';
import { checkMissingInfo } from './nodes/checkMissingInfo';
import { createDraft } from './nodes/createDraft';
import { routeForApproval } from './nodes/routeForApproval';
import { close } from './nodes/close';

// ---------------------------------------------------------------------------
// Graph State
// All fields use the default "last-write-wins" reducer (no array merging).
// ---------------------------------------------------------------------------
export const GraphState = Annotation.Root({
  requestId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  employeeMessage: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  retrievedPolicy: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  missingFields: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  draft: Annotation<Record<string, unknown>>({
    reducer: (_prev, next) => next,
    default: () => ({}),
  }),
  department: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected'>({
    reducer: (_prev, next) => next,
    default: () => 'pending',
  }),
  escalationReason: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

// ---------------------------------------------------------------------------
// Conditional edge: after checkMissingInfo
//   - If missingFields is non-empty → 'end' (mapped to END below)
//   - Otherwise → 'createDraft'
// ---------------------------------------------------------------------------
function routeAfterMissingCheck(state: typeof GraphState.State): string {
  if (state.missingFields && state.missingFields.length > 0) {
    return 'end';
  }
  return 'createDraft';
}

// ---------------------------------------------------------------------------
// Conditional edge: after routeForApproval (post-interrupt)
//   - approved → 'close'
//   - rejected → 'checkMissingInfo' (employee must clarify/resubmit)
// ---------------------------------------------------------------------------
function routeAfterApproval(state: typeof GraphState.State): string {
  if (state.approvalStatus === 'approved') {
    return 'close';
  }
  return 'checkMissingInfo';
}

// ---------------------------------------------------------------------------
// Build the StateGraph
// ---------------------------------------------------------------------------
const workflow = new StateGraph(GraphState)
  .addNode('retrievePolicy', retrievePolicy)
  .addNode('checkMissingInfo', checkMissingInfo)
  .addNode('createDraft', createDraft)
  .addNode('routeForApproval', routeForApproval)
  .addNode('close', close)
  // Edges
  .addEdge('__start__', 'retrievePolicy')
  .addEdge('retrievePolicy', 'checkMissingInfo')
  .addConditionalEdges('checkMissingInfo', routeAfterMissingCheck, {
    createDraft: 'createDraft',
    end: END,
  })
  .addEdge('createDraft', 'routeForApproval')
  .addConditionalEdges('routeForApproval', routeAfterApproval, {
    close: 'close',
    checkMissingInfo: 'checkMissingInfo',
  })
  .addEdge('close', END);

// ---------------------------------------------------------------------------
// PostgresSaver checkpointer
//
// Provides durable state persistence so that interrupt() / resume() works
// across server restarts and HTTP request boundaries.
//
// TRADE-OFF NOTE: If @langchain/langgraph-checkpoint-postgres were unavailable
// or too unstable (it was experimental in early 2024), the fallback would be to
// store the graph's resumable state as a JSON blob in Request.graphState and
// manually reconstruct it on each invoke. As of 2025, PostgresSaver is stable
// and is the recommended approach — we use it here.
//
// Call initCheckpointer() once at server startup before serving requests.
// ---------------------------------------------------------------------------
// Checkpointer + compiled graph
//
// MemorySaver stores graph checkpoints in-process (no external DB needed).
// This allows the agent to pause for human approval and resume correctly
// within the lifetime of the server process.
//
// NOTE: If you need persistence across server restarts in production, swap
// MemorySaver for PostgresSaver from @langchain/langgraph-checkpoint-postgres,
// providing a direct TCP-accessible Postgres URL (not Neon pooler).
// ---------------------------------------------------------------------------
let checkpointer: MemorySaver | null = null;
let compiledGraph: ReturnType<typeof workflow.compile> | null = null;

export async function initCheckpointer(): Promise<void> {
  checkpointer = new MemorySaver();
  compiledGraph = workflow.compile({ checkpointer });
  console.log('✓ LangGraph MemorySaver checkpointer initialised.');
}

export function getCompiledGraph(): ReturnType<typeof workflow.compile> {
  if (!compiledGraph) {
    throw new Error('Graph not initialised. Call initCheckpointer() first.');
  }
  return compiledGraph;
}

// Re-export Command for use in route handlers (approve/reject)
export { Command };
