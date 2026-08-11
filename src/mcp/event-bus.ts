export type MCPEventType = 'tool_call' | 'resource_read' | 'session_start' | 'session_end' | 'error';
export interface MCPEvent { type: MCPEventType; timestamp: number; payload: Record<string, any>; }
export class MCPEventBus {
  private listeners: Map<MCPEventType, Array<(event: MCPEvent) => void>> = new Map();
  private eventLog: MCPEvent[] = [];
  public on(type: MCPEventType, handler: (event: MCPEvent) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(handler);
  }
  public emit(type: MCPEventType, payload: Record<string, any> = {}): void {
    const event: MCPEvent = { type, timestamp: Date.now(), payload };
    this.eventLog.push(event);
    (this.listeners.get(type) || []).forEach(h => h(event));
  }
  public getLog(): MCPEvent[] { return [...this.eventLog]; }
  public clear(): void { this.eventLog = []; }
}
