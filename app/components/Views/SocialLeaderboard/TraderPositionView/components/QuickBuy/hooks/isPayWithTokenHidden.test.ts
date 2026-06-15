import { SolScope } from '@metamask/keyring-api';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import {
  isPayWithTokenHidden,
  type PayWithHiddenSources,
} from './isPayWithTokenHidden';

const evmToken = (address: string, chainId = '0x1'): BridgeToken =>
  ({
    address,
    chainId,
    symbol: 'POSI',
    name: 'POSI',
    decimals: 18,
  }) as BridgeToken;

const solToken = (address: string): BridgeToken =>
  ({
    address,
    chainId: SolScope.Mainnet,
    symbol: 'SPAM',
    name: 'SPAM',
    decimals: 9,
  }) as BridgeToken;

const EVM_ACCOUNT = '0xAccount';
const SOL_ACCOUNT_ID = 'sol-account-id';
const SOL_ASSET = `${SolScope.Mainnet}/token:abc123`;

const baseSources: PayWithHiddenSources = {
  ignoredEvmTokens: {},
  ignoredNonEvmAssets: {},
  evmAccountAddress: EVM_ACCOUNT,
  resolveNonEvmAccountId: () => SOL_ACCOUNT_ID,
};

describe('isPayWithTokenHidden', () => {
  it('returns true when an EVM token is hidden under the selected account', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      ignoredEvmTokens: {
        '0x1': { [EVM_ACCOUNT.toLowerCase()]: ['0xspam'] },
      },
    };

    expect(isPayWithTokenHidden(evmToken('0xspam'), sources)).toBe(true);
  });

  it('matches EVM token and account addresses case-insensitively', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      ignoredEvmTokens: {
        '0x1': { [EVM_ACCOUNT.toLowerCase()]: ['0xSPAM'] },
      },
    };

    expect(isPayWithTokenHidden(evmToken('0xSpAm'), sources)).toBe(true);
  });

  it('returns false for an EVM token that is not hidden', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      ignoredEvmTokens: {
        '0x1': { [EVM_ACCOUNT.toLowerCase()]: ['0xother'] },
      },
    };

    expect(isPayWithTokenHidden(evmToken('0xspam'), sources)).toBe(false);
  });

  it('returns false for an EVM token when no account address is available', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      evmAccountAddress: undefined,
      ignoredEvmTokens: {
        '0x1': { [EVM_ACCOUNT.toLowerCase()]: ['0xspam'] },
      },
    };

    expect(isPayWithTokenHidden(evmToken('0xspam'), sources)).toBe(false);
  });

  it('returns true when a non-EVM token is hidden under the selected account', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      ignoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [SOL_ASSET] },
    };

    expect(isPayWithTokenHidden(solToken(SOL_ASSET), sources)).toBe(true);
  });

  it('returns false for a non-EVM token that is not hidden', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      ignoredNonEvmAssets: { [SOL_ACCOUNT_ID]: ['some:other/asset'] },
    };

    expect(isPayWithTokenHidden(solToken(SOL_ASSET), sources)).toBe(false);
  });

  it('returns false for a non-EVM token when no non-EVM account id is resolved', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      resolveNonEvmAccountId: () => undefined,
      ignoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [SOL_ASSET] },
    };

    expect(isPayWithTokenHidden(solToken(SOL_ASSET), sources)).toBe(false);
  });

  it('scopes the hidden check to the account that owns the token chain', () => {
    const BTC_SCOPE = 'bip122:000000000019d6689c085ae165831e93';
    const BTC_ACCOUNT_ID = 'btc-account-id';
    const BTC_ASSET = `${BTC_SCOPE}/slip44:0`;
    const btcToken = (address: string): BridgeToken =>
      ({
        address,
        chainId: BTC_SCOPE,
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
      }) as BridgeToken;

    const sources: PayWithHiddenSources = {
      ...baseSources,
      resolveNonEvmAccountId: (chainId) =>
        chainId === BTC_SCOPE ? BTC_ACCOUNT_ID : SOL_ACCOUNT_ID,
      ignoredNonEvmAssets: {
        // Hidden under the Bitcoin account, not the Solana account.
        [BTC_ACCOUNT_ID]: [BTC_ASSET],
      },
    };

    expect(isPayWithTokenHidden(btcToken(BTC_ASSET), sources)).toBe(true);
    // The Solana token must not match the Bitcoin account's hidden list.
    expect(isPayWithTokenHidden(solToken(SOL_ASSET), sources)).toBe(false);
  });

  it('returns false when the ignored maps are empty or undefined', () => {
    expect(isPayWithTokenHidden(evmToken('0xspam'), baseSources)).toBe(false);
    expect(
      isPayWithTokenHidden(evmToken('0xspam'), {
        ...baseSources,
        ignoredEvmTokens: undefined,
        ignoredNonEvmAssets: undefined,
      }),
    ).toBe(false);
  });
});
