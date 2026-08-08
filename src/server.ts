import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPAgentFabricServer } from './mcp/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const mcpServer = new MCPAgentFabricServer();

app.post('/mcp', async (req, res) => {
  const response = await mcpServer.handleRequest(req.body);
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`🚀 Model Context Protocol (MCP) Server running on http://localhost:${PORT}`);
});
