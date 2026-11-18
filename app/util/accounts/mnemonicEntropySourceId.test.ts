import { EthAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { mnemonicEntropySourceId } from './mnemonicEntropySourceId';

const account = (
  keyringType: string,
  entropySource: unknown,
): InternalAccount =>
  ({
    type: EthAccountType.Eoa,
    metadata: { keyring: { type: keyringType } },
    options: { entropySource },
  }) as InternalAccount;

describe('mnemonicEntropySourceId', () => {
  it('returns the entropy source id of an HD account', () => {
    const hdAccount = account(ExtendedKeyringTypes.hd, 'wallet-1');

    const entropySourceId = mnemonicEntropySourceId(hdAccount);

    expect(entropySourceId).toBe('wallet-1');
  });

  it('returns undefined for an imported account', () => {
    const importedAccount = account(ExtendedKeyringTypes.simple, 'wallet-1');

    const entropySourceId = mnemonicEntropySourceId(importedAccount);

    expect(entropySourceId).toBeUndefined();
  });

  it('returns undefined when the HD account has no entropy source', () => {
    const hdAccount = account(ExtendedKeyringTypes.hd, '');

    const entropySourceId = mnemonicEntropySourceId(hdAccount);

    expect(entropySourceId).toBeUndefined();
  });
});
