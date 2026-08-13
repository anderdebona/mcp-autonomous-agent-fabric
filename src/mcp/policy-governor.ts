export interface SecurityPolicy {
  allowedTools: string[];
  maxPayloadBytes: number;
  disallowedPatterns: RegExp[];
  requireAuthentication: boolean;
}

export interface GovernanceContext {
  clientRole: 'ADMIN' | 'DEVELOPER' | 'ANONYMOUS';
  toolName: string;
  argumentsPayload: Record<string, unknown>;
}

export interface GovernanceDecision {
  allowed: boolean;
  reason?: string;
  auditId: string;
  timestamp: number;
}

export class PolicyGovernorInterceptor {
  private policy: SecurityPolicy;
  private auditLog: GovernanceDecision[] = [];

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      allowedTools: policy?.allowedTools || ['query_database_sandbox', 'inspect_system_metrics', 'summarize_temporal_graph'],
      maxPayloadBytes: policy?.maxPayloadBytes || 1024 * 1024, // 1MB
      disallowedPatterns: policy?.disallowedPatterns || [/DROP\s+TABLE/i, /DELETE\s+FROM/i, /rm\s+-rf/i],
      requireAuthentication: policy?.requireAuthentication !== false,
    };
  }

  public evaluate(context: GovernanceContext): GovernanceDecision {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // 1. Role / Auth Check
    if (this.policy.requireAuthentication && context.clientRole === 'ANONYMOUS') {
      const decision: GovernanceDecision = {
        allowed: false,
        reason: 'Authentication required for MCP tool execution',
        auditId,
        timestamp: now,
      };
      this.auditLog.push(decision);
      return decision;
    }

    // 2. Allowed Tool Whitelist Check
    if (!this.policy.allowedTools.includes(context.toolName) && context.clientRole !== 'ADMIN') {
      const decision: GovernanceDecision = {
        allowed: false,
        reason: `Tool '${context.toolName}' is not permitted for role '${context.clientRole}'`,
        auditId,
        timestamp: now,
      };
      this.auditLog.push(decision);
      return decision;
    }

    // 3. Payload inspection for dangerous patterns
    const rawJson = JSON.stringify(context.argumentsPayload);
    if (rawJson.length > this.policy.maxPayloadBytes) {
      const decision: GovernanceDecision = {
        allowed: false,
        reason: `Payload exceeds maximum permitted size (${rawJson.length} > ${this.policy.maxPayloadBytes})`,
        auditId,
        timestamp: now,
      };
      this.auditLog.push(decision);
      return decision;
    }

    for (const pattern of this.policy.disallowedPatterns) {
      if (pattern.test(rawJson)) {
        const decision: GovernanceDecision = {
          allowed: false,
          reason: `Payload violated security pattern constraint: ${pattern.toString()}`,
          auditId,
          timestamp: now,
        };
        this.auditLog.push(decision);
        return decision;
      }
    }

    const decision: GovernanceDecision = {
      allowed: true,
      auditId,
      timestamp: now,
    };
    this.auditLog.push(decision);
    return decision;
  }

  public getAuditLog(): GovernanceDecision[] {
    return [...this.auditLog];
  }
}
