#!/usr/bin/env node
import { MCPAgentFabricServer } from './mcp/server.js';

console.log(`
===========================================================
  👑 MODEL CONTEXT PROTOCOL (MCP) AGENT FABRIC CLI [v1.0.0]
  Author: anderdebona
===========================================================
`);

const server = new MCPAgentFabricServer();

(async () => {
  console.log('📡 Querying MCP Server tools/list...');
  const toolsRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });
  console.log(JSON.stringify(toolsRes.result, null, 2));

  console.log('\n🛠️ Invoking MCP tool: query_database_sandbox...');
  const callRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'query_database_sandbox',
      arguments: { sqlQuery: 'SELECT * FROM metrics;' },
    },
  });
  console.log(JSON.stringify(callRes.result, null, 2));
  console.log('\n✅ MCP Execution Finished Successfully!');
})();
