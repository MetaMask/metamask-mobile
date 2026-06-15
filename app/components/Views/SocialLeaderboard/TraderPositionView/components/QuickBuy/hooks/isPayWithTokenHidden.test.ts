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
  nonEvmAccountId: SOL_ACCOUNT_ID,
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

  it('returns false for a non-EVM token when no non-EVM account id is available', () => {
    const sources: PayWithHiddenSources = {
      ...baseSources,
      nonEvmAccountId: undefined,
      ignoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [SOL_ASSET] },
    };

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
