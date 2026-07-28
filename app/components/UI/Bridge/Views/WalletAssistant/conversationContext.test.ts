import type { WalletAssistantResearchResponse } from './openai';
import {
  applyConversationContext,
  buildConversationContext,
  getConversationContextInstructions,
} from './conversationContext';

const createResearch = (
  overrides: Partial<WalletAssistantResearchResponse> = {},
): WalletAssistantResearchResponse => ({
  asOf: '',
  assets: [],
  chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
  sections: [],
  sources: [],
  summary: '',
  swapIntent: {
    amountType: 'unspecified',
    amountValue: '',
    enabled: false,
    mode: 'real',
    network: '',
    sourceAmount: '',
    sourceSymbol: '',
    destinationSymbol: '',
  },
  title: 'Results',
  tokens: [],
  ...overrides,
});

const robinhoodResults = createResearch({
  assets: [
    {
      chainId: 'eip155:4663',
      contractAddress: '0x1111111111111111111111111111111111111111',
      name: 'First Meme',
      network: 'Robinhood Chain',
      symbol: 'FIRST',
    },
    {
      chainId: 'eip155:4663',
      contractAddress: '0x2222222222222222222222222222222222222222',
      name: 'Second Meme',
      network: 'Robinhood Chain',
      symbol: 'SECOND',
    },
  ],
  tokens: ['FIRST', 'SECOND'],
});

describe('conversation context', () => {
  it('preserves displayed result order and the single network', () => {
    const context = buildConversationContext([
      { role: 'user' as const },
      { research: robinhoodResults, role: 'assistant' as const },
    ]);

    expect(context).toEqual({
      lastNetwork: 'Robinhood Chain',
      recentResults: [
        expect.objectContaining({ position: 1, symbol: 'FIRST' }),
        expect.objectContaining({ position: 2, symbol: 'SECOND' }),
      ],
    });
    expect(getConversationContextInstructions(context)).toContain(
      '"position":2',
    );
  });

  it('anchors an AI-resolved reference to the exact MetaMask asset', () => {
    const context = buildConversationContext([
      { research: robinhoodResults, role: 'assistant' as const },
    ]);
    const interpretedTrade = createResearch({
      assets: [
        {
          chainId: 'eip155:4663',
          contractAddress: '0xffffffffffffffffffffffffffffffffffffffff',
          name: 'Untrusted model match',
          network: 'Robinhood Chain',
          symbol: 'SECOND',
        },
      ],
      swapIntent: {
        amountType: 'fiat',
        amountValue: '20',
        enabled: true,
        mode: 'real',
        network: '',
        sourceAmount: '',
        sourceSymbol: '',
        destinationSymbol: 'SECOND',
      },
      tokens: ['SECOND'],
    });

    const result = applyConversationContext(interpretedTrade, context);

    expect(result.swapIntent.network).toBe('Robinhood Chain');
    expect(result.assets).toContainEqual(
      expect.objectContaining({
        contractAddress: '0x2222222222222222222222222222222222222222',
        symbol: 'SECOND',
      }),
    );
    expect(result.assets).not.toContainEqual(
      expect.objectContaining({
        contractAddress: '0xffffffffffffffffffffffffffffffffffffffff',
      }),
    );
  });

  it('keeps the latest research results separate from the previous trade', () => {
    const previousTrade = createResearch({
      swapIntent: {
        amountType: 'fiat',
        amountValue: '20',
        enabled: true,
        mode: 'real',
        network: 'Robinhood Chain',
        sourceAmount: '',
        sourceSymbol: 'USDC',
        destinationSymbol: 'SECOND',
      },
      tokens: ['USDC', 'SECOND'],
    });
    const context = buildConversationContext([
      { research: robinhoodResults, role: 'assistant' as const },
      { research: previousTrade, role: 'assistant' as const },
    ]);

    expect(context.recentResults.map(({ symbol }) => symbol)).toEqual([
      'FIRST',
      'SECOND',
    ]);
    expect(context.previousTrade?.destinationSymbol).toBe('SECOND');
  });

  it('does not select an ambiguous same-symbol asset', () => {
    const duplicatedSymbolResults = createResearch({
      assets: [
        robinhoodResults.assets[0],
        {
          ...robinhoodResults.assets[0],
          chainId: 'eip155:1',
          contractAddress: '0x3333333333333333333333333333333333333333',
          network: 'Ethereum',
        },
      ],
      tokens: ['FIRST'],
    });
    const context = buildConversationContext([
      { research: duplicatedSymbolResults, role: 'assistant' as const },
    ]);
    const result = applyConversationContext(
      createResearch({
        swapIntent: {
          amountType: 'unspecified',
          amountValue: '',
          enabled: true,
          mode: 'real',
          network: '',
          sourceAmount: '',
          sourceSymbol: '',
          destinationSymbol: 'FIRST',
        },
      }),
      context,
    );

    expect(result.assets).toEqual([]);
    expect(result.swapIntent.network).toBe('');
  });
});
