import { CHAIN_IDS } from '@metamask/transaction-controller';

import { isRelaySupported } from './transaction-relay';

jest.useFakeTimers();

describe('Transaction Relay Utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();
  });

  describe('isRelaySupported', () => {
    it('returns true if networks request includes chain', async () => {
      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(result).toBe(true);
    });

    it('returns false if networks request does not include chain', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: async () => ({}),
          ok: true,
        } as Response),
      );

      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(result).toBe(false);
    });

    it('returns false if relay flag disabled', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: async () => ({
            1: {
              confirmations: false,
              network: 'test',
            },
          }),
          ok: true,
        } as Response),
      );

      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(result).toBe(false);
    });
  });
});
