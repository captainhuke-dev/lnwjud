import { randomUUID } from 'node:crypto';

/**
 * Task 1.8 — Dual protocol gateway (Phase 1, doc §16–17).
 *
 * - MCP 2026-07-28: stateless — every request carries its own envelope; the
 *   relay routes each request independently, no session bookkeeping.
 * - MCP 2025-11-25: stateful — a synthetic Mcp-Session-Id is issued at
 *   `initialize`; SSE streaming with Last-Event-ID resume is backed by an
 *   in-memory event ring so a dropped connection can replay missed events.
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25'] as const;
export type ProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];

export function detectProtocolVersion(headerVersion: string | undefined, body: unknown): ProtocolVersion {
  if (headerVersion !== undefined && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(headerVersion)) {
    return headerVersion as ProtocolVersion;
  }
  // 2026-era requests carry the envelope claim in _meta.
  const params = (body as { params?: { _meta?: Record<string, unknown> } } | null)?.params?._meta;
  if (params !== undefined && typeof params === 'object'
    && 'io.modelcontextprotocol/protocolVersion' in params) {
    return '2026-07-28';
  }
  // Default to the legacy era for older clients.
  return '2025-11-25';
}

/** True for methods that only exist in the 2025 spec and were removed in 2026. */
const LEGACY_ONLY_METHODS = new Set(['resources/subscribe', 'resources/unsubscribe']);

export function validateForEra(method: string, version: ProtocolVersion): string | null {
  if (version === '2026-07-28' && LEGACY_ONLY_METHODS.has(method)) {
    return `METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION: ${method} was removed in 2026-07-28`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2025-11-25 stateful session facade
// ---------------------------------------------------------------------------

interface LegacySession {
  readonly sessionId: string;
  readonly createdAt: Date;
  lastSeenAt: Date;
  /** Monotonic event id per session for Last-Event-ID resume. */
  nextEventId: number;
  /** Ring of recent events (id → serialized frame). */
  readonly events: Map<number, string>;
}

const SESSION_TTL_MS = 30 * 60 * 1_000;
const EVENT_RING_SIZE = 512;

export class LegacySessionFacade {
  private readonly sessions = new Map<string, LegacySession>();

  public createSession(): { sessionId: string } {
    // Opportunistic cleanup so long-running relays don't accumulate dead sessions.
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastSeenAt.getTime() > SESSION_TTL_MS) this.sessions.delete(id);
    }
    const sessionId = randomUUID();
    this.sessions.set(sessionId, {
      sessionId,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      nextEventId: 0,
      events: new Map(),
    });
    return { sessionId };
  }

  public getSession(sessionId: string): LegacySession | null {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return null;
    if (Date.now() - session.lastSeenAt.getTime() > SESSION_TTL_MS) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /** Append an event for SSE delivery; returns its monotonic event id. */
  public appendEvent(sessionId: string, frame: string): number {
    const session = this.getSession(sessionId);
    if (session === null) throw new Error('session not found');
    const eventId = session.nextEventId++;
    session.events.set(eventId, frame);
    // Trim the ring.
    while (session.events.size > EVENT_RING_SIZE) {
      const oldest = Math.min(...session.events.keys());
      session.events.delete(oldest);
    }
    return eventId;
  }

  /**
   * Events after `lastEventId` (exclusive). Empty when the client is current or
   * the requested id has fallen out of the ring (client must re-initialize).
   */
  public eventsSince(sessionId: string, lastEventId: number): Array<{ id: number; frame: string }> {
    const session = this.getSession(sessionId);
    if (session === null) return [];
    const out: Array<{ id: number; frame: string }> = [];
    for (let id = lastEventId + 1; id < session.nextEventId; id += 1) {
      const frame = session.events.get(id);
      if (frame !== undefined) out.push({ id, frame });
    }
    return out;
  }

  public terminate(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public size(): number {
    return this.sessions.size;
  }
}
