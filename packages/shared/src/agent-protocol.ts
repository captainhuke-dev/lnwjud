/**
 * Agent↔Relay channel protocol version — shared by the relay service and the
 * desktop connection agent (Task: protocol negotiation hardening).
 *
 * Bump MINOR for additive frame changes; bump MAJOR when a frame breaks older
 * peers. The relay serves the current MAJOR plus one previous MAJOR during
 * rolling upgrades. Deployment order: upgrade the RELAY first, then agents.
 */
export const AGENT_PROTOCOL_MAJOR = 2;
export const AGENT_PROTOCOL_MINOR = 0;
export const AGENT_PROTOCOL_VERSION = `${AGENT_PROTOCOL_MAJOR}.${AGENT_PROTOCOL_MINOR}`;

/** Relay accepts agents on this MAJOR and one previous MAJOR. */
export function isAgentProtocolCompatible(agentVersion: string | undefined): boolean {
  if (agentVersion === undefined) return false; // pre-versioning agents are rejected
  const match = /^(\d+)\./.exec(agentVersion.trim());
  const major = match === null ? Number.NaN : Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(major)) return false;
  return major >= AGENT_PROTOCOL_MAJOR - 1 && major <= AGENT_PROTOCOL_MAJOR;
}
