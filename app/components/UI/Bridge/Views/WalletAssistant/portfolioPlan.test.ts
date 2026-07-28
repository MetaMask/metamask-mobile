import type { TokenAsset } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import type { BridgeToken } from '../../types';
import {
  buildPortfolioPlan,
  getTokenLabelsByAssetId,
  parsePortfolioPlanRequest,
} from './portfolioPlan';

const token = (
  symbol: string,
  address: string,
  tokenFiatAmount: number,
): BridgeToken => ({
  address,
  balance: '10',
  chainId: 'eip155:1',
  decimals: 18,
  symbol,
  tokenFiatAmount,
});

describe('portfolioPlan', () => {
  it.each([
    ['Move all my meme coins into USDC', 'USDC'],
    ['Consolidate all my memecoins to NVIDIA stock', 'NVDA'],
  ])('parses %p', (prompt, destinationSymbol) => {
    expect(parsePortfolioPlanRequest(prompt)).toEqual({
      category: 'meme',
      destinationSymbol,
    });
  });

  it('builds a highest-value, same-chain batch from token labels', () => {
    const pepe = token(
      'PEPE',
      '0x0000000000000000000000000000000000000001',
      20,
    );
    const shib = token(
      'SHIB',
      '0x0000000000000000000000000000000000000002',
      30,
    );
    const eth = token('ETH', '0x0000000000000000000000000000000000000003', 500);
    const usdc = token(
      'USDC',
      '0x0000000000000000000000000000000000000004',
      10,
    );
    const metadata = [
      {
        assetId:
          'eip155:1/erc20:0x0000000000000000000000000000000000000001' as CaipAssetType,
        labels: ['meme_coin'],
      },
      {
        assetId:
          'eip155:1/erc20:0x0000000000000000000000000000000000000002' as CaipAssetType,
        labels: ['meme_coin'],
      },
    ] as TokenAsset[];

    expect(
      buildPortfolioPlan({
        destinationTokensByChain: { 'eip155:1': [usdc] },
        labelsByAssetId: getTokenLabelsByAssetId(metadata),
        request: {
          category: 'meme',
          destinationSymbol: 'USDC',
        },
        walletTokens: [pepe, shib, eth],
      }),
    ).toEqual(
      expect.objectContaining({
        destinationSymbol: 'USDC',
        sourceChainId: 'eip155:1',
        sourceTokens: [shib, pepe],
        status: 'ready',
      }),
    );
  });

  it('keeps an unsupported stock target as a reviewable limitation', () => {
    const pepe = token(
      'PEPE',
      '0x0000000000000000000000000000000000000001',
      20,
    );
    const metadata = [
      {
        assetId:
          'eip155:1/erc20:0x0000000000000000000000000000000000000001' as CaipAssetType,
        labels: ['meme_coin'],
      },
    ] as TokenAsset[];

    expect(
      buildPortfolioPlan({
        destinationTokensByChain: {},
        labelsByAssetId: getTokenLabelsByAssetId(metadata),
        request: { category: 'meme', destinationSymbol: 'NVDA' },
        walletTokens: [pepe],
      }),
    ).toEqual(
      expect.objectContaining({
        destinationSymbol: 'NVDA',
        status: 'unsupported-target',
      }),
    );
  });
});
