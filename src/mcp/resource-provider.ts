export interface MCPResource { uri: string; name: string; mimeType: string; content: string; }
export class ResourceProvider {
  private resources: Map<string, MCPResource> = new Map();
  public register(resource: MCPResource): void { this.resources.set(resource.uri, resource); }
  public get(uri: string): MCPResource | undefined { return this.resources.get(uri); }
  public list(): MCPResource[] { return Array.from(this.resources.values()); }
  public search(query: string): MCPResource[] {
    return this.list().filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.content.toLowerCase().includes(query.toLowerCase()));
  }
  public delete(uri: string): boolean { return this.resources.delete(uri); }
}
