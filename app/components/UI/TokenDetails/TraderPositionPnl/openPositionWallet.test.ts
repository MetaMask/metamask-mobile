import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import type { CaipAssetType } from '@metamask/utils';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import {
  assetChainScope,
  resolveOpenPositionWallet,
} from './openPositionWallet';

const USDC_MAINNET =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
const SOL_TOKEN =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCER' as CaipAssetType;

const evmAccount = createMockInternalAccount(
  '0x1234567890abcdef1234567890abcdef12345678',
  'EVM',
  undefined,
  EthAccountType.Eoa,
);

const solanaAccount = createMockInternalAccount(
  'FhRg7Nt3EJ6xKXaLm2pQvYwZ9cD4bS1uT8nJkV5hXqGe',
  'Solana',
  undefined,
  SolAccountType.DataAccount,
);

describe('assetChainScope', () => {
  it('reads the CAIP-2 chain out of a CAIP-19 asset id', () => {
    expect(assetChainScope(USDC_MAINNET)).toBe('eip155:1');
  });

  it('returns undefined without an asset id', () => {
    expect(assetChainScope(null)).toBeUndefined();
    expect(assetChainScope(undefined)).toBeUndefined();
  });

  it('returns undefined for an unparseable asset id', () => {
    expect(assetChainScope('not-an-asset' as CaipAssetType)).toBeUndefined();
  });
});

describe('resolveOpenPositionWallet', () => {
  it('prefers the selected group account on the asset chain', () => {
    const result = resolveOpenPositionWallet({
      scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      scopedAccount: solanaAccount,
      selectedAccount: evmAccount,
    });

    expect(result).toBe(solanaAccount.address);
  });

  it('checksums an EVM address', () => {
    const result = resolveOpenPositionWallet({
      scope: 'eip155:1',
      scopedAccount: evmAccount,
      selectedAccount: undefined,
    });

    expect(result).toBe('0x1234567890AbcdEF1234567890aBcdef12345678');
  });

  it('falls back to the selected account when its scopes cover the chain', () => {
    const result = resolveOpenPositionWallet({
      scope: 'eip155:1',
      scopedAccount: undefined,
      selectedAccount: evmAccount,
    });

    expect(result).toBe('0x1234567890AbcdEF1234567890aBcdef12345678');
  });

  it('does not pair an EVM wallet with a Solana asset', () => {
    const result = resolveOpenPositionWallet({
      scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      scopedAccount: undefined,
      selectedAccount: evmAccount,
    });

    expect(result).toBeUndefined();
  });

  it('does not pair a Solana wallet with an EVM asset', () => {
    const result = resolveOpenPositionWallet({
      scope: 'eip155:1',
      scopedAccount: undefined,
      selectedAccount: solanaAccount,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the asset has no resolvable chain', () => {
    const result = resolveOpenPositionWallet({
      scope: undefined,
      scopedAccount: evmAccount,
      selectedAccount: evmAccount,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when no account is available', () => {
    const result = resolveOpenPositionWallet({
      scope: 'eip155:1',
      scopedAccount: undefined,
      selectedAccount: undefined,
    });

    expect(result).toBeUndefined();
  });
});

describe('asset id to wallet', () => {
  it('keeps the wallet and the asset on one chain', () => {
    const scope = assetChainScope(SOL_TOKEN);

    expect(
      resolveOpenPositionWallet({
        scope,
        scopedAccount: undefined,
        selectedAccount: evmAccount,
      }),
    ).toBeUndefined();
  });
});
