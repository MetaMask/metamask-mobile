import { BtcScope, SolScope, TrxScope } from '@metamask/keyring-api';
import { getMultichainAccountName } from './getMultichainAccountName';
import { WalletClientType } from '../MultichainWalletSnapClient';

describe('getMultichainAccountName', () => {
  it('returns the next available account name if no scope or client type is provided', () => {
    const result = getMultichainAccountName();
    expect(result).toBe('');
  });

  it.each([
    [BtcScope.Mainnet, WalletClientType.Bitcoin, 'Bitcoin Account '],
    [BtcScope.Testnet, WalletClientType.Bitcoin, 'Bitcoin Testnet Account '],
    [BtcScope.Testnet4, WalletClientType.Bitcoin, 'Bitcoin Testnet Account '],
    [BtcScope.Signet, WalletClientType.Bitcoin, 'Bitcoin Signet Account '],
    [BtcScope.Regtest, WalletClientType.Bitcoin, 'Bitcoin Regtest Account '],
    [SolScope.Mainnet, WalletClientType.Solana, 'Solana Account '],
    [SolScope.Devnet, WalletClientType.Solana, 'Solana Devnet Account '],
    [SolScope.Testnet, WalletClientType.Solana, 'Solana Testnet Account '],
    [TrxScope.Mainnet, WalletClientType.Tron, 'Tron Account '],
    [TrxScope.Nile, WalletClientType.Tron, 'Tron Nile Account '],
    [TrxScope.Shasta, WalletClientType.Tron, 'Tron Shasta Account '],
  ])(
    'should return account name for %s scope and %s client type',
    (scope, clientType, expectedName) => {
      const result = getMultichainAccountName(scope, clientType);
      expect(result).toBe(expectedName);
    },
  );
});
