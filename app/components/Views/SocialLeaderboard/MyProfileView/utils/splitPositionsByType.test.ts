import type { Position } from '@metamask/social-controllers';
import {
  getFilteredPositionSections,
  getProfilePositionsEmptyMessageKey,
  splitPositionsByType,
} from './splitPositionsByType';

const spotPosition = (positionId: string): Position => ({
  positionId,
  tokenSymbol: 'ETH',
  tokenName: 'Ethereum',
  tokenAddress: '0xeth',
  chain: 'ethereum',
  positionAmount: 1,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  trades: [],
  lastTradeAt: 1,
});

const perpPosition = (positionId: string): Position => ({
  ...spotPosition(positionId),
  tokenSymbol: 'BTC',
  chain: 'hyperliquid',
  perpPositionType: 'long',
  perpLeverage: 5,
});

describe('splitPositionsByType', () => {
  it('splits spot positions into tokens and hyperliquid into perps', () => {
    const tokensInput = spotPosition('spot');
    const perpsInput = perpPosition('perp');

    const result = splitPositionsByType([tokensInput, perpsInput]);

    expect(result.tokens).toEqual([tokensInput]);
    expect(result.perps).toEqual([perpsInput]);
  });
});

describe('getFilteredPositionSections', () => {
  const tokensInput = spotPosition('spot');
  const perpsInput = perpPosition('perp');
  const positions = [tokensInput, perpsInput];

  it('keeps both sections for All', () => {
    const result = getFilteredPositionSections(positions, 'all');

    expect(result.tokens).toEqual([tokensInput]);
    expect(result.perps).toEqual([perpsInput]);
  });

  it('returns only tokens for the Tokens filter', () => {
    const result = getFilteredPositionSections(positions, 'tokens');

    expect(result.tokens).toEqual([tokensInput]);
    expect(result.perps).toEqual([]);
  });

  it('returns only perps for the Perps filter', () => {
    const result = getFilteredPositionSections(positions, 'perps');

    expect(result.tokens).toEqual([]);
    expect(result.perps).toEqual([perpsInput]);
  });
});

describe('getProfilePositionsEmptyMessageKey', () => {
  it('returns open positions copy for All on Open', () => {
    expect(getProfilePositionsEmptyMessageKey('open', 'all')).toBe(
      'social_leaderboard.my_profile.empty_open',
    );
  });

  it('returns closed tokens copy for Tokens on Closed', () => {
    expect(getProfilePositionsEmptyMessageKey('closed', 'tokens')).toBe(
      'social_leaderboard.my_profile.empty_closed_tokens',
    );
  });

  it('returns open perps copy for Perps on Open', () => {
    expect(getProfilePositionsEmptyMessageKey('open', 'perps')).toBe(
      'social_leaderboard.my_profile.empty_open_perps',
    );
  });
});
