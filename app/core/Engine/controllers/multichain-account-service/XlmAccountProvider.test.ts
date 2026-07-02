///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { XlmAccountType, XlmScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  XlmAccountProvider,
  type MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';

describe('XlmAccountProvider', () => {
  const messenger = {} as MultichainAccountServiceMessenger;
  const provider = new XlmAccountProvider(messenger, {
    maxConcurrency: 1,
    discovery: {
      enabled: true,
      timeoutMs: 2000,
      maxAttempts: 3,
      backOffMs: 1000,
    },
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

  it('uses the canonical stellar wallet snap id', () => {
    expect(XlmAccountProvider.XLM_SNAP_ID).toBe(
      'npm:@metamask/stellar-wallet-snap',
    );
  });
});
///: END:ONLY_INCLUDE_IF
