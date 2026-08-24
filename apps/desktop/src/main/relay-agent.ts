import { createHash, randomUUID } from 'node:crypto';
import WebSocket from 'ws';

/**
 * Task 2.1 — Desktop Connection Agent (Phase 2).
 *
 * Dials the relay outbound (never listens), announces HELLO, answers forwarded
 * JSON-RPC requests by invoking the local tool registry in-process, and
 * reconnects with exponential backoff + jitter when the link drops.
 *
 * Lifecycle rule (doc §7): relay-link death ≠ MCP runtime death. This agent
 * only owns its own socket — the runtime and any running tool keep going.
 */

export interface RelayAgentOptions {
  /** e.g. wss://mcp.example.com/agent/ws */
  readonly relayUrl: string;
  readonly deviceId: string;
  readonly profileIds: readonly string[];
  readonly runtimeVersion: string;
  /** Local tool invocation: returns a JSON-serializable MCP CallToolResult-like payload. */
  readonly invokeTool: (name: string, args: unknown) => Promise<unknown>;
  /** List current tools for catalog publication on HELLO refresh. */
  readonly listTools: () => readonly unknown[];
}

export const BACKOFF_STEPS_MS = [250, 500, 1_000, 2_000, 4_000, 8_000] as const;
const BACKOFF_CAP_MS = 15_000;

export class RelayAgent {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private state: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  public constructor(private readonly options: RelayAgentOptions) {}

  public currentState(): typeof this.state {
    return this.state;
  }

  public start(): void {
    if (this.stopped) return;
    this.state = 'connecting';
    this.dial();
  }

  public stop(): void {
    this.stopped = true;
    this.clearTimers();
    try { this.socket?.close(1000, 'agent stopped'); } catch { /* noop */ }
    this.socket = null;
    this.state = 'disconnected';
  }

  private dial(): void {
    if (this.stopped) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.options.relayUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.on('open', () => {
      this.state = 'connected';
      this.reconnectAttempt = 0;
      // HELLO announces identity + current catalog hash hint.
      const tools = this.options.listTools();
      socket.send(JSON.stringify({
        type: 'HELLO',
        device_id: this.options.deviceId,
        profile_ids: [...this.options.profileIds],
        runtime_version: this.options.runtimeVersion,
        catalog_hash: hashOf(tools),
      }));
      this.startHeartbeat(socket);
    });

    socket.on('message', (raw: WebSocket.RawData) => {
      void this.handleFrame(raw);
    });

    socket.on('close', () => {
      this.stopHeartbeat();
      this.state = 'disconnected';
      this.scheduleReconnect();
    });

    socket.on('error', () => {
      // 'close' follows; nothing else to do here.
    });
  }

  private async handleFrame(raw: WebSocket.RawData): Promise<void> {
    if (this.socket === null) return;
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      return;
    }
    if (frame.type === 'READY') return; // handshake ack
    if (frame.type === 'HEARTBEAT') {
      this.socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
      return;
    }
    // Forwarded JSON-RPC request → invoke the local runtime in-process.
    const requestId = String(frame.id ?? '');
    const method = typeof frame.method === 'string' ? frame.method : '';
    try {
      const result = await this.invokeMethod(method, frame.params);
      this.socket?.send(JSON.stringify({ jsonrpc: '2.0', id: requestId, result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'tool execution failed';
      this.socket?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message },
      }));
    }
  }

  /**
   * Loopback dispatch — runs against the live ToolRegistry in-process.
   * Only tools/list is special (catalog); everything else is tools/call-shaped
   * or an MCP protocol method proxied to the registry.
   */
  private async invokeMethod(method: string, params: unknown): Promise<unknown> {
    const p = (params ?? {}) as Record<string, unknown>;
    if (method === 'tools/list') {
      return { tools: this.options.listTools() };
    }
    if (method === 'ping') {
      return {};
    }
    if (method === 'tools/call') {
      const name = typeof p.name === 'string' ? p.name : '';
      return this.options.invokeTool(name, p.arguments ?? {});
    }
    throw new Error(`METHOD_NOT_SUPPORTED_BY_AGENT: ${method}`);
  }

  private startHeartbeat(socket: WebSocket): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
      }
    }, 5_000);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;
    const step: number = BACKOFF_STEPS_MS[Math.min(this.reconnectAttempt, BACKOFF_STEPS_MS.length - 1)] ?? BACKOFF_CAP_MS;
    const jitter = Math.floor(Math.random() * 250);
    const delay = Math.min(step + jitter, BACKOFF_CAP_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.dial();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function hashOf(tools: readonly unknown[]): string {
  // Mirrors relay-side computeCatalogHash so NO_CHANGE detection works.
  // Kept dependency-free here to avoid importing relay internals into the app.
  return createHash('sha256').update(JSON.stringify(tools)).digest('hex');
}

/** Unique id for locally-generated frames (reserved for future push flows). */
export function newAgentFrameId(): string {
  return `agent-${randomUUID()}`;
}
