import { describe, it, expect } from 'vitest';
import { MCPAgentFabricServer } from '../src/mcp/server.js';

describe('Model Context Protocol (MCP) Server Tests', () => {
  it('should list available sandboxed tools via tools/list method', async () => {
    const server = new MCPAgentFabricServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result.tools.length).toBeGreaterThan(0);
  });

  it('should enforce sandbox constraints and reject non-SELECT SQL queries', async () => {
    const server = new MCPAgentFabricServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'query_database_sandbox',
        arguments: { sqlQuery: 'DROP TABLE users;' },
      },
    });

    expect(response.error).toBeDefined();
    expect(response.error?.message).toContain('MCP Security Violation');
  });
});
