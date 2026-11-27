import { getMoneyVaultChainId } from './getMoneyVaultChainId';

describe('getMoneyVaultChainId', () => {
  it.each([
    ['0x8f', 143],
    ['143', 143],
  ])('parses chain ID %s', (chainId, expectedChainId) => {
    expect(getMoneyVaultChainId({ chainId })).toBe(expectedChainId);
  });

  it.each([undefined, '', 'invalid', '1.5', '9007199254740992'])(
    'returns undefined for invalid chain ID %s',
    (chainId) => {
      expect(getMoneyVaultChainId(chainId ? { chainId } : undefined)).toBe(
        undefined,
      );
    },
  );
});
