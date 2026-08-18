import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPAgentFabricServer } from './mcp/server.js';
import { DistributedAgentMeshRouter } from './mcp/mesh-router.js';
import { PolicyGovernorInterceptor } from './mcp/policy-governor.js';
import { MCPEventBus } from './mcp/event-bus.js';
import { StreamingSSETransport } from './mcp/streaming-sse-transport.js';
import { SemanticToolSynthesizer } from './mcp/semantic-tool-synthesizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const mcpServer = new MCPAgentFabricServer();
const meshRouter = new DistributedAgentMeshRouter();
const policyGovernor = new PolicyGovernorInterceptor();
const eventBus = new MCPEventBus();
const sseTransport = new StreamingSSETransport();
const toolSynthesizer = new SemanticToolSynthesizer();

// Initialize default agent swarm nodes
meshRouter.registerNode({
  id: 'agent-sql-01',
  name: 'SQL & Database Engine',
  capabilities: ['query_database_sandbox', 'sql_optimize'],
  status: 'ONLINE',
  activeTasks: 1,
  avgLatencyMs: 32,
});

meshRouter.registerNode({
  id: 'agent-rag-02',
  name: 'Temporal Knowledge RAG',
  capabilities: ['summarize_temporal_graph', 'vector_search'],
  status: 'ONLINE',
  activeTasks: 0,
  avgLatencyMs: 48,
});

meshRouter.registerNode({
  id: 'agent-audit-03',
  name: 'Security & Policy Auditor',
  capabilities: ['inspect_system_metrics', 'audit_compliance'],
  status: 'ONLINE',
  activeTasks: 0,
  avgLatencyMs: 18,
});

app.post('/mcp', async (req, res) => {
  eventBus.emit('mcp_request', { method: req.body?.method });
  const response = await mcpServer.handleRequest(req.body);
  res.json(response);
});

app.get('/api/mesh/nodes', (req, res) => {
  res.json({ nodes: meshRouter.getOnlineNodes() });
});

app.post('/api/mesh/route', (req, res) => {
  const { requiredCapability, payload, strategy } = req.body;
  const result = meshRouter.routeTask(
    {
      taskId: `task_${Date.now()}`,
      requiredCapability: requiredCapability || 'query_database_sandbox',
      payload: payload || {},
    },
    strategy || 'LEAST_BUSY'
  );
  eventBus.emit('task_routed', result);
  res.json(result);
});

app.post('/api/governor/evaluate', (req, res) => {
  const { toolName, argumentsPayload, clientRole } = req.body;
  const decision = policyGovernor.evaluate({
    clientRole: clientRole || 'DEVELOPER',
    toolName: toolName || 'query_database_sandbox',
    argumentsPayload: argumentsPayload || {},
  });
  eventBus.emit('policy_evaluated', decision);
  res.json({ decision, auditLog: policyGovernor.getAuditLog().slice(-5) });
});

app.post('/api/synthesize/pipeline', async (req, res) => {
  const { targetDocId = 'DOC-900' } = req.body;
  const pipeline = [
    {
      stepId: 'step_1_vector_fetch',
      toolName: 'fetch_document',
      inputMapping: (ctx: any) => ({ docId: ctx.targetDocId }),
      outputKey: 'document'
    },
    {
      stepId: 'step_2_semantic_summary',
      toolName: 'summarize_text',
      inputMapping: (ctx: any) => ({ text: ctx.document.content, maxWords: 30 }),
      outputKey: 'summary'
    },
    {
      stepId: 'step_3_json_format',
      toolName: 'format_json_response',
      inputMapping: (ctx: any) => ({ data: ctx.summary, format: 'application/json' }),
      outputKey: 'finalResponse'
    }
  ];

  const trace = await toolSynthesizer.executePipeline(`pipe_${Date.now()}`, { targetDocId }, pipeline);
  res.json(trace);
});

app.get('/api/events', (req, res) => {
  res.json({ events: eventBus.getLog().slice(-15) });
});

app.listen(PORT, () => {
  console.log(`🚀 Model Context Protocol (MCP) Server v5.0.0 on http://localhost:${PORT}`);
});
