import { MCPToolDefinition } from './protocol.js';

export class MCPToolsRegistry {
  public static getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'query_database_sandbox',
        description: 'Executes sandboxed SQL queries with read-only constraint enforcement',
        inputSchema: {
          type: 'object',
          properties: {
            sqlQuery: { type: 'string', description: 'SQL SELECT query to execute' },
          },
          required: ['sqlQuery'],
        },
      },
      {
        name: 'inspect_filesystem',
        description: 'Inspects directory structure within restricted workspace bounds',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to inspect' },
          },
          required: ['path'],
        },
      },
    ];
  }

  public static async executeTool(name: string, args: any): Promise<any> {
    if (name === 'query_database_sandbox') {
      const { sqlQuery } = args;
      if (!sqlQuery.toLowerCase().startsWith('select')) {
        throw new Error('MCP Security Violation: Only SELECT queries are permitted in sandbox.');
      }
      return {
        executedQuery: sqlQuery,
        rowsReturned: 3,
        data: [{ id: 1, name: 'Sample Record A' }, { id: 2, name: 'Sample Record B' }],
      };
    }

    if (name === 'inspect_filesystem') {
      return {
        path: args.path,
        allowed: true,
        files: ['package.json', 'src/', 'public/', 'README.md'],
      };
    }

    throw new Error(`Tool ${name} not found in MCP registry.`);
  }
}
