import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { getWalletConnectSessionId } from './wc-analytics';

describe('getWalletConnectSessionId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a v5 UUID', () => {
    const sessionId = getWalletConnectSessionId('some-pairing-topic');

    expect(uuidValidate(sessionId)).toBe(true);
    expect(uuidVersion(sessionId)).toBe(5);
  });

  it('is deterministic for the same pairing topic', () => {
    // This is the property the whole attribution join depends on: the
    // connection event and the transaction events derive the id independently.
    const first = getWalletConnectSessionId('some-pairing-topic');
    const second = getWalletConnectSessionId('some-pairing-topic');

    expect(first).toBe(second);
  });

  it('returns different ids for different pairing topics', () => {
    const first = getWalletConnectSessionId('pairing-topic-a');
    const second = getWalletConnectSessionId('pairing-topic-b');

    expect(first).not.toBe(second);
  });

  it('does not leak the raw pairing topic', () => {
    const pairingTopic = 'a'.repeat(64);

    expect(getWalletConnectSessionId(pairingTopic)).not.toContain(pairingTopic);
  });
});
