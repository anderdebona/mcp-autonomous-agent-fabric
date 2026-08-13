export interface AgentNode {
  id: string;
  name: string;
  capabilities: string[];
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  activeTasks: number;
  avgLatencyMs: number;
}

export interface RouteRequest {
  taskId: string;
  requiredCapability: string;
  payload: Record<string, unknown>;
}

export interface RouteResult {
  assignedAgentId: string;
  routingStrategy: 'LEAST_BUSY' | 'LOWEST_LATENCY' | 'ROUND_ROBIN';
  success: boolean;
  error?: string;
}

export class DistributedAgentMeshRouter {
  private nodes: Map<string, AgentNode> = new Map();
  private roundRobinIdx: number = 0;

  public registerNode(node: AgentNode): void {
    this.nodes.set(node.id, node);
  }

  public unregisterNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  public getOnlineNodes(): AgentNode[] {
    return Array.from(this.nodes.values()).filter(n => n.status !== 'OFFLINE');
  }

  public routeTask(req: RouteRequest, strategy: 'LEAST_BUSY' | 'LOWEST_LATENCY' | 'ROUND_ROBIN' = 'LEAST_BUSY'): RouteResult {
    const candidates = this.getOnlineNodes().filter(n => n.capabilities.includes(req.requiredCapability));

    if (candidates.length === 0) {
      return {
        assignedAgentId: '',
        routingStrategy: strategy,
        success: false,
        error: `No online agent with capability '${req.requiredCapability}'`,
      };
    }

    let selected: AgentNode;

    if (strategy === 'LOWEST_LATENCY') {
      candidates.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
      selected = candidates[0];
    } else if (strategy === 'LEAST_BUSY') {
      candidates.sort((a, b) => a.activeTasks - b.activeTasks);
      selected = candidates[0];
    } else {
      selected = candidates[this.roundRobinIdx % candidates.length];
      this.roundRobinIdx++;
    }

    selected.activeTasks++;
    return {
      assignedAgentId: selected.id,
      routingStrategy: strategy,
      success: true,
    };
  }

  public completeTask(nodeId: string, latencyMs: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.activeTasks = Math.max(0, node.activeTasks - 1);
      node.avgLatencyMs = (node.avgLatencyMs + latencyMs) / 2;
    }
  }
}
