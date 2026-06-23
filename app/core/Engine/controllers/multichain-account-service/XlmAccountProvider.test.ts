///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { XlmAccountType, XlmScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { MultichainAccountServiceMessenger } from '@metamask/multichain-account-service';
import { XlmAccountProvider } from './XlmAccountProvider';

describe('XlmAccountProvider', () => {
  const messenger = {} as MultichainAccountServiceMessenger;
  const provider = new XlmAccountProvider(messenger, {
    maxConcurrency: 1,
    discovery: { timeoutMs: 2000, maxAttempts: 3, backOffMs: 1000 },
    createAccounts: { timeoutMs: 10000, batched: true },
    resyncAccounts: { autoRemoveExtraSnapAccounts: false },
  });

  it('exposes Stellar provider name and capabilities', () => {
    expect(provider.getName()).toBe('Stellar');
    expect(provider.capabilities.scopes).toEqual([
      XlmScope.Pubnet,
      XlmScope.Testnet,
    ]);
  });

  it('matches snap stellar accounts', () => {
    expect(
      provider.isAccountCompatible({
        type: XlmAccountType.Account,
        metadata: { keyring: { type: KeyringTypes.snap } },
      } as never),
    ).toBe(true);
    expect(
      provider.isAccountCompatible({
        type: XlmAccountType.Account,
        metadata: { keyring: { type: KeyringTypes.hd } },
      } as never),
    ).toBe(false);
  });

  it('returns no discovered accounts', async () => {
    await expect(provider.discoverAccounts()).resolves.toEqual([]);
  });
});
///: END:ONLY_INCLUDE_IF
