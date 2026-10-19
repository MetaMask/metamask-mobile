import type { CaipChainId } from '@metamask/utils';
import {
  hasApprovedFundingFor,
  isMoneyAccountPriorityEntry,
  networkToCaipChainId,
  resolveReceivingPriorityEntry,
  resolveRedeemReceivingEntry,
} from './redeemDestination';
import {
  FundingStatus,
  type CardFundingToken,
  type CardWalletExternalPriorityResponse,
} from '../types';
import type { VedaTokenConfig } from './vedaToken';

const buildToken = (
  overrides: Partial<CardFundingToken> = {},
): CardFundingToken =>
  ({
    caipChainId: 'eip155:59144' as CaipChainId,
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xusdc',
    decimals: 6,
    fundingStatus: FundingStatus.Enabled,
    spendableBalance: '0',
    ...overrides,
  }) as CardFundingToken;

describe('networkToCaipChainId', () => {
  it('maps a known network to its CAIP chain id', () => {
    expect(networkToCaipChainId('linea')).toBe('eip155:59144');
    expect(networkToCaipChainId('monad')).toBe('eip155:143');
  });

  it('returns undefined for unknown or missing networks', () => {
    expect(networkToCaipChainId('unknown')).toBeUndefined();
    expect(networkToCaipChainId(undefined)).toBeUndefined();
  });
});

describe('hasApprovedFundingFor', () => {
  it('matches chain + symbol case-insensitively with an active delegation', () => {
    const tokens = [buildToken({ symbol: 'usdc' })];
    expect(hasApprovedFundingFor(tokens, 'eip155:59144', 'USDC')).toBe(true);
  });

  it('matches an mUSD destination on Monad', () => {
    const tokens = [
      buildToken({ caipChainId: 'eip155:143' as CaipChainId, symbol: 'mUSD' }),
    ];
    expect(hasApprovedFundingFor(tokens, 'eip155:143', 'musd')).toBe(true);
  });

  it('is false when the matching token delegation is not enabled', () => {
    const tokens = [buildToken({ fundingStatus: FundingStatus.NotEnabled })];
    expect(hasApprovedFundingFor(tokens, 'eip155:59144', 'USDC')).toBe(false);
  });

  it('is false when no token matches the chain + symbol', () => {
    const tokens = [buildToken({ caipChainId: 'eip155:8453' as CaipChainId })];
    expect(hasApprovedFundingFor(tokens, 'eip155:59144', 'USDC')).toBe(false);
  });

  it('is false when chain or symbol is missing', () => {
    const tokens = [buildToken()];
    expect(hasApprovedFundingFor(tokens, undefined, 'USDC')).toBe(false);
    expect(hasApprovedFundingFor(tokens, 'eip155:59144', undefined)).toBe(
      false,
    );
  });
});

const priorityEntry = (
  overrides: Partial<CardWalletExternalPriorityResponse> = {},
): CardWalletExternalPriorityResponse => ({
  id: 1,
  address: '0xabc',
  currency: 'steur',
  network: 'linea',
  priority: 1,
  ...overrides,
});

const vedaConfig: VedaTokenConfig = {
  caipChainId: 'eip155:143' as CaipChainId,
  address: '0xveda',
  decimals: 6,
  delegationContract: '0xdelegation',
};

describe('resolveReceivingPriorityEntry', () => {
  const entries = [
    priorityEntry({ address: '0xlinea2', network: 'linea', priority: 2 }),
    priorityEntry({ address: '0xlinea1', network: 'linea', priority: 1 }),
    priorityEntry({
      address: '0xmonad',
      currency: 'veda',
      network: 'monad',
      priority: 0,
    }),
  ];

  it('returns the globally highest-priority entry when no network is given', () => {
    expect(resolveReceivingPriorityEntry(entries)?.address).toBe('0xmonad');
  });

  it('returns the highest-priority entry for a given network', () => {
    expect(resolveReceivingPriorityEntry(entries, 'linea')?.address).toBe(
      '0xlinea1',
    );
  });

  it('skips entries without an address and returns undefined when empty', () => {
    expect(
      resolveReceivingPriorityEntry([priorityEntry({ address: '' })]),
    ).toBeUndefined();
    expect(resolveReceivingPriorityEntry([])).toBeUndefined();
  });
});

describe('isMoneyAccountPriorityEntry', () => {
  it('is true for a veda/monad entry', () => {
    expect(
      isMoneyAccountPriorityEntry(
        priorityEntry({ currency: 'veda', network: 'monad' }),
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('is false for a non-VEDA wallet (e.g. steur/linea)', () => {
    expect(isMoneyAccountPriorityEntry(priorityEntry(), vedaConfig)).toBe(
      false,
    );
  });

  it('is false for an undefined entry', () => {
    expect(isMoneyAccountPriorityEntry(undefined, vedaConfig)).toBe(false);
  });
});

describe('resolveRedeemReceivingEntry', () => {
  it('returns the VEDA entry for Monad when another Monad wallet ranks higher', () => {
    const entries = [
      priorityEntry({
        address: '0xusdc-monad',
        currency: 'usdc',
        network: 'monad',
        priority: 2,
      }),
      priorityEntry({
        address: '0xveda-monad',
        currency: 'veda',
        network: 'monad',
        priority: 3,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'monad',
        vedaConfig,
      })?.address,
    ).toBe('0xveda-monad');
  });

  it('returns undefined for Monad when no VEDA entry is linked', () => {
    const entries = [
      priorityEntry({
        address: '0xusdc-monad',
        currency: 'usdc',
        network: 'monad',
        priority: 1,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'monad',
        vedaConfig,
      }),
    ).toBeUndefined();
  });

  it('returns undefined for Monad when the veda config is null', () => {
    const entries = [
      priorityEntry({
        address: '0xveda-monad',
        currency: 'veda',
        network: 'monad',
        priority: 1,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'monad',
        vedaConfig: null,
      }),
    ).toBeUndefined();
  });

  it('returns undefined for Solana', () => {
    const entries = [
      priorityEntry({
        address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
        currency: 'usdt',
        network: 'solana',
        priority: 1,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'solana',
        vedaConfig,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when no network is given', () => {
    const entries = [
      priorityEntry({ address: '0xlinea', network: 'linea', priority: 1 }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        vedaConfig,
      }),
    ).toBeUndefined();
  });

  it('returns the lowest priority number for Linea', () => {
    const entries = [
      priorityEntry({
        address: '0xlinea2',
        network: 'linea',
        priority: 2,
      }),
      priorityEntry({
        address: '0xlinea1',
        network: 'linea',
        priority: 1,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'linea',
        vedaConfig,
      })?.address,
    ).toBe('0xlinea1');
  });

  it('skips entries with an empty address', () => {
    const entries = [
      priorityEntry({ address: '', network: 'linea', priority: 1 }),
      priorityEntry({
        address: '0xlinea2',
        network: 'linea',
        priority: 2,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'linea',
        vedaConfig,
      })?.address,
    ).toBe('0xlinea2');
  });

  it('skips entries on other networks', () => {
    const entries = [
      priorityEntry({
        address: '0xmonad',
        currency: 'veda',
        network: 'monad',
        priority: 0,
      }),
      priorityEntry({
        address: '0xlinea',
        network: 'linea',
        priority: 5,
      }),
    ];

    expect(
      resolveRedeemReceivingEntry({
        priorities: entries,
        network: 'linea',
        vedaConfig,
      })?.address,
    ).toBe('0xlinea');
  });
});
