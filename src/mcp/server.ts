import { MCPJsonRpcRequest, MCPJsonRpcResponse } from './protocol.js';
import { MCPToolsRegistry } from './tools.js';

export class MCPAgentFabricServer {
  public async handleRequest(request: MCPJsonRpcRequest): Promise<MCPJsonRpcResponse> {
    const { id, method, params } = request;

    try {
      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCPToolsRegistry.getTools(),
          },
        };
      }

      if (method === 'tools/call') {
        const { name, arguments: toolArgs } = params || {};
        const result = await MCPToolsRegistry.executeTool(name, toolArgs);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method ${method} not found in MCP Server specification.`,
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err.message,
        },
      };
    }
  }
}
