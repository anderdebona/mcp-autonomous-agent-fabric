export interface StreamingChunk {
  streamId: string;
  seqNumber: number;
  type: 'CHUNK_START' | 'CHUNK_DELTA' | 'CHUNK_END' | 'HEARTBEAT';
  payload: any;
  timestamp: number;
}

export interface StreamSubscriber {
  id: string;
  onChunk: (chunk: StreamingChunk) => void;
  onClose: () => void;
}

export class StreamingSSETransport {
  private activeStreams: Map<string, StreamSubscriber[]> = new Map();
  private streamSeqCounters: Map<string, number> = new Map();

  /**
   * Subscribes a client to a specific MCP stream ID
   */
  public subscribe(streamId: string, subscriber: StreamSubscriber): () => void {
    if (!this.activeStreams.has(streamId)) {
      this.activeStreams.set(streamId, []);
      this.streamSeqCounters.set(streamId, 0);
    }
    this.activeStreams.get(streamId)!.push(subscriber);

    // Return unsubscribe callback
    return () => {
      const subs = this.activeStreams.get(streamId);
      if (subs) {
        this.activeStreams.set(streamId, subs.filter(s => s.id !== subscriber.id));
      }
    };
  }

  /**
   * Emits a streaming delta chunk to all active subscribers of the stream
   */
  public emitChunk(streamId: string, type: StreamingChunk['type'], payload: any): StreamingChunk {
    const currentSeq = (this.streamSeqCounters.get(streamId) || 0) + 1;
    this.streamSeqCounters.set(streamId, currentSeq);

    const chunk: StreamingChunk = {
      streamId,
      seqNumber: currentSeq,
      type,
      payload,
      timestamp: Date.now()
    };

    const subscribers = this.activeStreams.get(streamId) || [];
    subscribers.forEach(sub => {
      try {
        sub.onChunk(chunk);
      } catch (err) {
        console.error(`Error dispatching stream chunk to subscriber ${sub.id}:`, err);
      }
    });

    if (type === 'CHUNK_END') {
      subscribers.forEach(sub => sub.onClose());
      this.activeStreams.delete(streamId);
      this.streamSeqCounters.delete(streamId);
    }

    return chunk;
  }

  public getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}
