import type { Position } from '@metamask/social-controllers';
import {
  buildFollowTradingTokenContext,
  pickFollowTradingDismissedProperties,
} from './buildFollowTradingTokenContext';
import { SocialLeaderboardEventProperties } from './socialLeaderboardEvents';

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: (address: string, chainId: string) =>
    `${chainId}/erc20:${address}`,
}));

const makeSpotPosition = (): Position => ({
  positionId: 'pepe-base',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 900,
  pnlValueUsd: 400,
  pnlPercent: 80,
});

const makePerpPosition = (tokenSymbol = 'ETH'): Position => ({
  ...makeSpotPosition(),
  positionId: 'eth-hyperliquid',
  tokenSymbol,
  tokenName: tokenSymbol,
  tokenAddress: tokenSymbol,
  chain: 'hyperliquid',
  perpPositionType: 'long',
  perpLeverage: 5,
});

describe('buildFollowTradingTokenContext', () => {
  it('returns null when traderAddress is missing', () => {
    expect(buildFollowTradingTokenContext(makeSpotPosition(), '')).toBeNull();
    expect(
      buildFollowTradingTokenContext(makeSpotPosition(), undefined),
    ).toBeNull();
  });

  it('returns caip19 for a spot position on a supported chain', () => {
    const context = buildFollowTradingTokenContext(
      makeSpotPosition(),
      '0xtrader',
    );

    expect(context).toEqual({
      trader_address: '0xtrader',
      asset_name: 'PEPE',
      chain_name: 'base',
      caip19: 'eip155:8453/erc20:0x1234567890123456789012345678901234567890',
    });
  });

  it('returns null for a spot position on an unsupported chain', () => {
    expect(
      buildFollowTradingTokenContext(
        { ...makeSpotPosition(), chain: 'unsupported-chain' },
        '0xtrader',
      ),
    ).toBeNull();
  });

  it('returns perps_market for a perp position', () => {
    const context = buildFollowTradingTokenContext(
      makePerpPosition(),
      '0xtrader',
    );

    expect(context).toEqual({
      trader_address: '0xtrader',
      asset_name: 'ETH',
      chain_name: 'hyperliquid',
      perps_market: 'ETH',
    });
    expect(context).not.toHaveProperty('caip19');
  });

  it('remaps a non-xyz HIP-3 symbol to its xyz equivalent', () => {
    const context = buildFollowTradingTokenContext(
      makePerpPosition('cash:SPCX'),
      '0xtrader',
    );

    expect(context).toEqual({
      trader_address: '0xtrader',
      asset_name: 'cash:SPCX',
      chain_name: 'hyperliquid',
      perps_market: 'xyz:SPCX',
    });
  });
});

describe('pickFollowTradingDismissedProperties', () => {
  it('picks caip19 fields for spot context', () => {
    const context = buildFollowTradingTokenContext(
      makeSpotPosition(),
      '0xtrader',
    );
    if (!context) {
      throw new Error('expected spot follow-trading context');
    }

    expect(pickFollowTradingDismissedProperties(context)).toEqual({
      trader_address: '0xtrader',
      chain_name: 'base',
      caip19: 'eip155:8453/erc20:0x1234567890123456789012345678901234567890',
    });
  });

  it('picks perps_market fields for perp context', () => {
    const context = buildFollowTradingTokenContext(
      makePerpPosition(),
      '0xtrader',
    );
    if (!context) {
      throw new Error('expected perp follow-trading context');
    }

    expect(pickFollowTradingDismissedProperties(context)).toEqual({
      trader_address: '0xtrader',
      chain_name: 'hyperliquid',
      perps_market: 'ETH',
    });
    expect(pickFollowTradingDismissedProperties(context)).not.toHaveProperty(
      SocialLeaderboardEventProperties.CAIP19,
    );
  });
});
