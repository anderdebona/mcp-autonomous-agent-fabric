export class MCPRateLimiter {
  private requestCounts: Map<string, number> = new Map();
  private maxRequestsPerMin: number;

  constructor(maxRequestsPerMin: number = 60) {
    this.maxRequestsPerMin = maxRequestsPerMin;
  }

  public allowRequest(clientId: string): boolean {
    const current = this.requestCounts.get(clientId) || 0;
    if (current >= this.maxRequestsPerMin) {
      return false;
    }
    this.requestCounts.set(clientId, current + 1);
    return true;
  }
}
