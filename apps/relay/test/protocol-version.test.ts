import { describe, expect, it } from 'vitest';
import {
  AGENT_PROTOCOL_MAJOR,
  AGENT_PROTOCOL_VERSION,
  isAgentProtocolCompatible,
} from '@lnwjud/shared';

describe('agent protocol negotiation', () => {
  it('accepts the current major', () => {
    expect(isAgentProtocolCompatible(AGENT_PROTOCOL_VERSION)).toBe(true);
    expect(isAgentProtocolCompatible(`${AGENT_PROTOCOL_MAJOR}.9`)).toBe(true);
  });

  it('accepts one previous major (rolling upgrade window)', () => {
    expect(isAgentProtocolCompatible(`${AGENT_PROTOCOL_MAJOR - 1}.5`)).toBe(true);
  });

  it('rejects older majors and future majors', () => {
    expect(isAgentProtocolCompatible(`${AGENT_PROTOCOL_MAJOR - 2}.0`)).toBe(false);
    expect(isAgentProtocolCompatible(`${AGENT_PROTOCOL_MAJOR + 1}.0`)).toBe(false);
  });

  it('rejects pre-versioning agents and malformed values', () => {
    // Agents built before this hardening task send no agent_protocol field.
    expect(isAgentProtocolCompatible(undefined)).toBe(false);
    expect(isAgentProtocolCompatible('')).toBe(false);
    expect(isAgentProtocolCompatible('garbage')).toBe(false);
  });
});
