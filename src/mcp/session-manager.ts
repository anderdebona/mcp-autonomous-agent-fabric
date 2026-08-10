/**
 * MCP Session State tracking
 */
export type SessionState = 'CONNECTING' | 'ACTIVE' | 'IDLE' | 'DISCONNECTED' | 'EXPIRED';

/**
 * Individual session record
 */
export interface MCPSession {
  sessionId: string;
  clientId: string;
  state: SessionState;
  createdAt: number;
  lastActivityAt: number;
  requestCount: number;
  metadata: Record<string, string>;
}

/**
 * Audit log entry for session lifecycle events
 */
export interface SessionAuditEntry {
  timestamp: number;
  sessionId: string;
  event: 'CONNECT' | 'REQUEST' | 'IDLE_TIMEOUT' | 'DISCONNECT' | 'EXPIRE';
  details: string;
}

/**
 * MCP Session Manager — Lifecycle management for Model Context Protocol sessions.
 *
 * Manages the full lifecycle of MCP client sessions with:
 * - Connection tracking and unique session IDs
 * - Automatic idle timeout detection
 * - Request counting and activity tracking
 * - Full audit log for compliance and debugging
 *
 * Session State Machine:
 * ```
 *   CONNECTING → ACTIVE ⇄ IDLE → EXPIRED
 *                  ↓
 *             DISCONNECTED
 * ```
 *
 * Reference: Anthropic MCP Specification — Session Lifecycle (2024)
 */
export class SessionManager {
  private sessions: Map<string, MCPSession> = new Map();
  private auditLog: SessionAuditEntry[] = [];
  private idleTimeoutMs: number;
  private sessionCounter: number = 0;

  constructor(idleTimeoutMs: number = 300_000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  /**
   * Generates a unique session ID.
   */
  private generateSessionId(): string {
    this.sessionCounter++;
    return `mcp-session-${Date.now()}-${this.sessionCounter}`;
  }

  /**
   * Creates a new MCP session for a connecting client.
   */
  public connect(clientId: string, metadata: Record<string, string> = {}): MCPSession {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: MCPSession = {
      sessionId,
      clientId,
      state: 'ACTIVE',
      createdAt: now,
      lastActivityAt: now,
      requestCount: 0,
      metadata,
    };

    this.sessions.set(sessionId, session);
    this.auditLog.push({
      timestamp: now,
      sessionId,
      event: 'CONNECT',
      details: `Client ${clientId} connected`,
    });

    return session;
  }

  /**
   * Records activity on a session (e.g., an MCP request was processed).
   */
  public recordActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.state === 'DISCONNECTED' || session.state === 'EXPIRED') {
      return false;
    }

    session.lastActivityAt = Date.now();
    session.requestCount++;
    session.state = 'ACTIVE';

    this.auditLog.push({
      timestamp: Date.now(),
      sessionId,
      event: 'REQUEST',
      details: `Request #${session.requestCount} processed`,
    });

    return true;
  }

  /**
   * Disconnects a session gracefully.
   */
  public disconnect(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.state = 'DISCONNECTED';
    this.auditLog.push({
      timestamp: Date.now(),
      sessionId,
      event: 'DISCONNECT',
      details: `Session disconnected after ${session.requestCount} requests`,
    });

    return true;
  }

  /**
   * Checks all sessions for idle timeouts and expires them.
   * Returns the number of sessions expired.
   */
  public expireIdleSessions(): number {
    const now = Date.now();
    let expired = 0;

    for (const [, session] of this.sessions) {
      if (session.state === 'ACTIVE' || session.state === 'IDLE') {
        if (now - session.lastActivityAt > this.idleTimeoutMs) {
          session.state = 'EXPIRED';
          expired++;
          this.auditLog.push({
            timestamp: now,
            sessionId: session.sessionId,
            event: 'EXPIRE',
            details: `Session expired after ${this.idleTimeoutMs}ms idle`,
          });
        }
      }
    }

    return expired;
  }

  /**
   * Returns all active sessions.
   */
  public getActiveSessions(): MCPSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.state === 'ACTIVE');
  }

  /**
   * Returns the full audit log.
   */
  public getAuditLog(): SessionAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Returns a specific session by ID.
   */
  public getSession(sessionId: string): MCPSession | undefined {
    return this.sessions.get(sessionId);
  }
}
