/**
 * Capability declaration for an MCP endpoint
 */
export interface MCPCapability {
  name: string;
  version: string;
  supported: boolean;
  description: string;
}

/**
 * Result of capability negotiation between client and server
 */
export interface NegotiationResult {
  negotiatedCapabilities: MCPCapability[];
  clientRequested: string[];
  serverSupported: string[];
  agreed: string[];
  rejected: string[];
  isCompatible: boolean;
}

/**
 * MCP Capability Negotiation Protocol — Implements the handshake phase
 * between MCP client and server to agree on supported features.
 *
 * During the `initialize` handshake, client and server exchange capability
 * lists. Only mutually supported capabilities become active for the session.
 *
 * Protocol Flow:
 * ```
 *   Client                         Server
 *     |-- initialize(caps) ---------->|
 *     |<--- InitializeResult(caps) ---|
 *     |-- initialized --------------->|
 *     |        [Session Active]       |
 * ```
 *
 * Reference: Anthropic MCP Specification — Capability Negotiation (2024)
 */
export class CapabilityNegotiator {
  private serverCapabilities: MCPCapability[];

  constructor() {
    this.serverCapabilities = [
      { name: 'tools', version: '1.0', supported: true, description: 'Tool execution via tools/call' },
      { name: 'resources', version: '1.0', supported: true, description: 'Resource access via resources/read' },
      { name: 'prompts', version: '1.0', supported: true, description: 'Prompt template management' },
      { name: 'logging', version: '1.0', supported: true, description: 'Server-side logging notifications' },
      { name: 'sampling', version: '1.0', supported: false, description: 'LLM sampling requests (not supported)' },
    ];
  }

  /**
   * Returns all server-supported capabilities.
   */
  public getServerCapabilities(): MCPCapability[] {
    return this.serverCapabilities.filter((c) => c.supported);
  }

  /**
   * Negotiates capabilities with a client's requested list.
   * Returns only mutually agreed capabilities.
   */
  public negotiate(clientRequestedCapabilities: string[]): NegotiationResult {
    const serverSupportedNames = this.serverCapabilities
      .filter((c) => c.supported)
      .map((c) => c.name);

    const agreed = clientRequestedCapabilities.filter((c) => serverSupportedNames.includes(c));
    const rejected = clientRequestedCapabilities.filter((c) => !serverSupportedNames.includes(c));

    const negotiatedCapabilities = this.serverCapabilities.filter(
      (c) => agreed.includes(c.name)
    );

    return {
      negotiatedCapabilities,
      clientRequested: clientRequestedCapabilities,
      serverSupported: serverSupportedNames,
      agreed,
      rejected,
      isCompatible: agreed.length > 0,
    };
  }

  /**
   * Checks if a specific capability was negotiated and is available.
   */
  public isCapabilityActive(negotiation: NegotiationResult, capabilityName: string): boolean {
    return negotiation.agreed.includes(capabilityName);
  }
}
