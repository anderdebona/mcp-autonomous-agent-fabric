export interface ToolStep {
  stepId: string;
  toolName: string;
  inputMapping: (pipelineContext: Record<string, any>) => Record<string, any>;
  outputKey: string;
}

export interface PipelineExecutionTrace {
  pipelineId: string;
  status: 'COMPLETED' | 'FAILED';
  totalDurationMs: number;
  stepTraces: Array<{
    stepId: string;
    toolName: string;
    input: any;
    output: any;
    durationMs: number;
  }>;
  finalOutput: Record<string, any>;
}

export class SemanticToolSynthesizer {
  private toolRegistry: Map<string, (args: any) => Promise<any> | any> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.registerTool('fetch_document', (args: { docId: string }) => ({
      docId: args.docId,
      content: `Extracted content for document ${args.docId} from vector database.`,
      embeddingNorm: 0.984
    }));

    this.registerTool('summarize_text', (args: { text: string; maxWords?: number }) => ({
      summary: `Summarized (${args.maxWords || 50} words): ${args.text.slice(0, 40)}...`,
      confidence: 0.96
    }));

    this.registerTool('format_json_response', (args: { data: any; format: string }) => ({
      formatted: JSON.stringify(args.data, null, 2),
      format: args.format,
      timestamp: Date.now()
    }));
  }

  public registerTool(name: string, handler: (args: any) => Promise<any> | any): void {
    this.toolRegistry.set(name, handler);
  }

  /**
   * Executes a multi-hop synthesized tool pipeline topologically
   */
  public async executePipeline(
    pipelineId: string,
    initialContext: Record<string, any>,
    steps: ToolStep[]
  ): Promise<PipelineExecutionTrace> {
    const startTime = Date.now();
    const context = { ...initialContext };
    const stepTraces: PipelineExecutionTrace['stepTraces'] = [];

    for (const step of steps) {
      const stepStart = Date.now();
      const toolHandler = this.toolRegistry.get(step.toolName);

      if (!toolHandler) {
        throw new Error(`ToolSynthesizer: Undefined tool '${step.toolName}' in step '${step.stepId}'`);
      }

      const input = step.inputMapping(context);
      const output = await Promise.resolve(toolHandler(input));
      context[step.outputKey] = output;

      stepTraces.push({
        stepId: step.stepId,
        toolName: step.toolName,
        input,
        output,
        durationMs: Date.now() - stepStart
      });
    }

    return {
      pipelineId,
      status: 'COMPLETED',
      totalDurationMs: Date.now() - startTime,
      stepTraces,
      finalOutput: context
    };
  }
}
