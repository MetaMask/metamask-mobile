import { BtcScope, SolScope, TrxScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { getMultichainAccountName } from './getMultichainAccountName';
import { WalletClientType } from '../MultichainWalletSnapClient';

const mockGetNextAvailableAccountName = jest
  .fn()
  .mockImplementation((keyringType) =>
    keyringType === KeyringTypes.snap ? 'Snap Account 1' : 'Account 1',
  );

jest.mock('../../Engine', () => ({
  context: {
    AccountsController: {
      getNextAvailableAccountName: (keyringType: KeyringTypes) =>
        mockGetNextAvailableAccountName(keyringType),
    },
  },
}));

describe('getMultichainAccountName', () => {
  it('returns the next available account name if no scope or client type is provided', () => {
    const result = getMultichainAccountName();
    expect(result).toBe('Account 1');
  });

  it.each([
    [BtcScope.Mainnet, WalletClientType.Bitcoin, 'Bitcoin Account 1'],
    [BtcScope.Testnet, WalletClientType.Bitcoin, 'Bitcoin Testnet Account 1'],
    [BtcScope.Testnet4, WalletClientType.Bitcoin, 'Bitcoin Testnet Account 1'],
    [BtcScope.Signet, WalletClientType.Bitcoin, 'Bitcoin Signet Account 1'],
    [BtcScope.Regtest, WalletClientType.Bitcoin, 'Bitcoin Regtest Account 1'],
    [SolScope.Mainnet, WalletClientType.Solana, 'Solana Account 1'],
    [SolScope.Devnet, WalletClientType.Solana, 'Solana Devnet Account 1'],
    [SolScope.Testnet, WalletClientType.Solana, 'Solana Testnet Account 1'],
    [TrxScope.Mainnet, WalletClientType.Tron, 'Tron Account 1'],
    [TrxScope.Nile, WalletClientType.Tron, 'Tron Nile Account 1'],
    [TrxScope.Shasta, WalletClientType.Tron, 'Tron Shasta Account 1'],
  ])(
    'should return account name for %s scope and %s client type',
    (scope, clientType, expectedName) => {
      const result = getMultichainAccountName(scope, clientType);
      expect(result).toBe(expectedName);
    },
  );

  it('should return default Tron account name for unknown Tron scope', () => {
    const result = getMultichainAccountName(
      'unknown-tron-scope' as CaipChainId,
      WalletClientType.Tron,
    );
    expect(result).toBe('Tron Account 1');
  });
});
