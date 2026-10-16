import type { CaipAssetType } from '@metamask/utils';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { toSharePosition } from './sharePosition';
import type { OpenPositionPnl } from './types';

const PEPE =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;
const NOW_MS = 1_700_000_000_000;

const token = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  symbol: 'PEPE',
  name: 'Pepe',
  image: 'https://pepe.png',
} as TokenDetailsRouteParams;

const openPosition: OpenPositionPnl = {
  positionAmount: 713930,
  isOpen: true,
  boughtUsd: 7.1393,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 7.1393,
  currentValueUSD: 10,
  pnlValueUsd: 2.8607,
  pnlPercent: 40,
  pnlStatus: 'ready',
};

describe('toSharePosition', () => {
  it('builds a composer card from an open position and the token on screen', () => {
    expect(toSharePosition(token, PEPE, openPosition, NOW_MS)).toEqual({
      positionId: PEPE,
      tokenSymbol: 'PEPE',
      tokenName: 'Pepe',
      tokenAddress: token.address,
      chain: 'ethereum',
      isOpen: true,
      positionAmount: 713930,
      costBasis: 7.1393,
      currentValueUSD: 10,
      realizedPnl: 0,
      pnlValueUsd: 2.8607,
      pnlPercent: 40,
      boughtUsd: 7.1393,
      soldUsd: 0,
      perpPositionType: null,
      perpLeverage: null,
      positionAmountWithLeverage: null,
      costBasisWithLeverage: null,
      marginUsd: null,
      trades: [],
      lastTradeAt: NOW_MS,
      tokenImageUrl: 'https://pepe.png',
    });
  });

  it('returns null when the wallet has no open position', () => {
    expect(
      toSharePosition(token, PEPE, { ...openPosition, isOpen: false }, NOW_MS),
    ).toBeNull();
  });
});
