import { EthAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectMoneyAccount } from './index';
import {
  createMockInternalAccount,
} from '../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockEvmAccount1 = createMockInternalAccount(
  '0x1111111111111111111111111111111111111111',
  'Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockEvmAccount2 = createMockInternalAccount(
  '0x2222222222222222222222222222222222222222',
  'Account 2',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

describe('selectMoneyAccount', () => {
  it('returns the first EVM account', () => {
    const result = selectMoneyAccount.resultFunc([
      mockEvmAccount1,
      mockEvmAccount2,
    ] as InternalAccount[]);

    expect(result).toBe(mockEvmAccount1);
  });

  it('returns undefined when there are no EVM accounts', () => {
    const result = selectMoneyAccount.resultFunc([]);

    expect(result).toBeUndefined();
  });
});
