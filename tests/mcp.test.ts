import { describe, it, expect } from 'vitest';
import { MCPAgentFabricServer } from '../src/mcp/server.js';
import { SessionManager } from '../src/mcp/session-manager.js';
import { CapabilityNegotiator } from '../src/mcp/capability-negotiation.js';

describe('MCP Server', () => {
  it('should list available tools via tools/list', async () => {
    const server = new MCPAgentFabricServer();
    const res = await server.handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.result.tools.length).toBeGreaterThan(0);
  });

  it('should reject non-SELECT SQL via sandbox', async () => {
    const server = new MCPAgentFabricServer();
    const res = await server.handleRequest({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'query_database_sandbox', arguments: { sqlQuery: 'DROP TABLE users;' } },
    });
    expect(res.error).toBeDefined();
  });

  it('should return error for unknown methods', async () => {
    const server = new MCPAgentFabricServer();
    const res = await server.handleRequest({ jsonrpc: '2.0', id: 3, method: 'unknown/method' });
    expect(res.error?.code).toBe(-32601);
  });
});

describe('Session Manager', () => {
  it('should create new sessions on connect', () => {
    const mgr = new SessionManager();
    const session = mgr.connect('client-1');
    expect(session.state).toBe('ACTIVE');
    expect(session.clientId).toBe('client-1');
    expect(session.sessionId).toBeTruthy();
  });

  it('should track request activity', () => {
    const mgr = new SessionManager();
    const session = mgr.connect('client-1');
    mgr.recordActivity(session.sessionId);
    mgr.recordActivity(session.sessionId);
    const updated = mgr.getSession(session.sessionId)!;
    expect(updated.requestCount).toBe(2);
  });

  it('should disconnect sessions gracefully', () => {
    const mgr = new SessionManager();
    const session = mgr.connect('client-1');
    mgr.disconnect(session.sessionId);
    expect(mgr.getSession(session.sessionId)?.state).toBe('DISCONNECTED');
  });

  it('should expire idle sessions beyond timeout', () => {
    const mgr = new SessionManager(100); // 100ms timeout
    const session = mgr.connect('client-1');
    // Manually backdate activity to simulate idle time
    const s = mgr.getSession(session.sessionId)!;
    s.lastActivityAt = Date.now() - 200; // 200ms ago
    const expired = mgr.expireIdleSessions();
    expect(expired).toBe(1);
    expect(mgr.getSession(session.sessionId)?.state).toBe('EXPIRED');
  });

  it('should maintain audit log of session events', () => {
    const mgr = new SessionManager();
    const session = mgr.connect('client-1');
    mgr.recordActivity(session.sessionId);
    mgr.disconnect(session.sessionId);
    const log = mgr.getAuditLog();
    expect(log.length).toBe(3); // CONNECT, REQUEST, DISCONNECT
  });

  it('should not record activity on expired sessions', () => {
    const mgr = new SessionManager(100);
    const session = mgr.connect('client-1');
    const s = mgr.getSession(session.sessionId)!;
    s.lastActivityAt = Date.now() - 200;
    mgr.expireIdleSessions();
    const result = mgr.recordActivity(session.sessionId);
    expect(result).toBe(false);
  });
});

describe('Capability Negotiation', () => {
  it('should return server-supported capabilities', () => {
    const neg = new CapabilityNegotiator();
    const caps = neg.getServerCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    caps.forEach((c) => expect(c.supported).toBe(true));
  });

  it('should negotiate only mutually supported capabilities', () => {
    const neg = new CapabilityNegotiator();
    const result = neg.negotiate(['tools', 'resources', 'unknown_feature']);
    expect(result.agreed).toContain('tools');
    expect(result.agreed).toContain('resources');
    expect(result.rejected).toContain('unknown_feature');
    expect(result.isCompatible).toBe(true);
  });

  it('should report incompatibility when no capabilities match', () => {
    const neg = new CapabilityNegotiator();
    const result = neg.negotiate(['nonexistent_a', 'nonexistent_b']);
    expect(result.isCompatible).toBe(false);
    expect(result.agreed.length).toBe(0);
  });

  it('should check if specific capability is active', () => {
    const neg = new CapabilityNegotiator();
    const result = neg.negotiate(['tools', 'prompts']);
    expect(neg.isCapabilityActive(result, 'tools')).toBe(true);
    expect(neg.isCapabilityActive(result, 'sampling')).toBe(false);
  });
});

import { ResourceProvider } from '../src/mcp/resource-provider.js';
import { MCPEventBus } from '../src/mcp/event-bus.js';

describe('Resource Provider', () => {
  it('should register and retrieve resources', () => {
    const rp = new ResourceProvider();
    rp.register({ uri: 'file:///data.json', name: 'Data', mimeType: 'application/json', content: '{}' });
    expect(rp.get('file:///data.json')?.name).toBe('Data');
    expect(rp.list().length).toBe(1);
  });
  it('should search resources by name', () => {
    const rp = new ResourceProvider();
    rp.register({ uri: 'a', name: 'Alpha Config', mimeType: 'text/plain', content: 'abc' });
    rp.register({ uri: 'b', name: 'Beta Data', mimeType: 'text/plain', content: 'xyz' });
    expect(rp.search('alpha').length).toBe(1);
  });
});

describe('Event Bus', () => {
  it('should emit events and notify listeners', () => {
    const bus = new MCPEventBus();
    let received = false;
    bus.on('tool_call', () => { received = true; });
    bus.emit('tool_call', { tool: 'test' });
    expect(received).toBe(true);
    expect(bus.getLog().length).toBe(1);
  });
  it('should maintain event log', () => {
    const bus = new MCPEventBus();
    bus.emit('session_start', {});
    bus.emit('tool_call', {});
    bus.emit('session_end', {});
    expect(bus.getLog().length).toBe(3);
  });
});
