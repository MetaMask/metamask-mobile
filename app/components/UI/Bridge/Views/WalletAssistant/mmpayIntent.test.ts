import type { BridgeToken } from '../../types';
import type { WalletAssistantSwapIntent } from './openai';
import { buildMMPayRampIntent, isUnfundedBuyIntent } from './mmpayIntent';

const intent = (
  overrides: Partial<WalletAssistantSwapIntent> = {},
): WalletAssistantSwapIntent => ({
  amountType: 'fiat',
  amountValue: '20',
  destinationSymbol: 'ETH',
  enabled: true,
  mode: 'real',
  network: 'Ethereum',
  sourceAmount: '',
  sourceSymbol: '',
  ...overrides,
});

const eth: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 'eip155:1',
  decimals: 18,
  symbol: 'ETH',
};

describe('MetaMask Pay Wallet Assistant intent', () => {
  it('detects a buy with no wallet-funded source', () => {
    expect(isUnfundedBuyIntent(intent(), false)).toBe(true);
    expect(isUnfundedBuyIntent(intent(), true)).toBe(false);
  });

  it('does not replace an explicit wallet-funded swap', () => {
    expect(isUnfundedBuyIntent(intent({ sourceSymbol: 'USDC' }), false)).toBe(
      false,
    );
  });

  it('prepares the requested asset and fiat amount for MetaMask Pay', () => {
    expect(buildMMPayRampIntent(intent(), eth)).toEqual({
      amount: '20',
      assetId: 'eip155:1/slip44:60',
    });
  });

  it('falls back to MM Pay token selection when identity is unresolved', () => {
    expect(buildMMPayRampIntent(intent(), undefined)).toEqual({
      amount: '20',
      assetId: undefined,
    });
  });
});
