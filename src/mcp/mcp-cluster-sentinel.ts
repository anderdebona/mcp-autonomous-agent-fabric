export interface MCPServerNode {
  serverId: string;
  name: string;
  endpoint: string;
  capabilities: string[];
  status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE';
  latencyMs: number;
  lastHeartbeat: number;
  consecutiveFailures: number;
}

export class MCPClusterSentinel {
  private servers: Map<string, MCPServerNode> = new Map();

  public registerServer(server: Omit<MCPServerNode, 'status' | 'latencyMs' | 'lastHeartbeat' | 'consecutiveFailures'>): MCPServerNode {
    const node: MCPServerNode = {
      ...server,
      status: 'HEALTHY',
      latencyMs: 5,
      lastHeartbeat: Date.now(),
      consecutiveFailures: 0,
    };
    this.servers.set(node.serverId, node);
    return node;
  }

  public recordHeartbeat(serverId: string, latencyMs: number): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    server.lastHeartbeat = Date.now();
    server.latencyMs = latencyMs;
    server.consecutiveFailures = 0;
    server.status = latencyMs > 250 ? 'DEGRADED' : 'HEALTHY';
    return true;
  }

  public reportFailure(serverId: string): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.consecutiveFailures++;
    if (server.consecutiveFailures >= 3) {
      server.status = 'UNREACHABLE';
    } else {
      server.status = 'DEGRADED';
    }
  }

  public routeToolToHealthyServer(toolName: string): MCPServerNode | null {
    const candidates = Array.from(this.servers.values()).filter(
      s => s.status !== 'UNREACHABLE' && s.capabilities.includes(toolName)
    );

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.latencyMs - b.latencyMs);
    return candidates[0];
  }

  public getClusterStatus() {
    const all = Array.from(this.servers.values());
    const healthy = all.filter(s => s.status === 'HEALTHY').length;
    return {
      totalServers: all.length,
      healthyServers: healthy,
      clusterHealthRatio: all.length > 0 ? healthy / all.length : 1.0,
      servers: all
    };
  }
}
