import type { WalletAssistantResearchResponse } from './openai';
import {
  buildImmediateTradeResponse,
  getResearchNetworkContext,
  isDirectTradeRequest,
  prioritizeDirectTradeRequest,
} from './tradeIntentPriority';

const createResearch = (
  overrides: Partial<WalletAssistantResearchResponse> = {},
): WalletAssistantResearchResponse => ({
  asOf: '',
  assets: [],
  chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
  sections: [{ heading: 'Information', bullets: ['Educational response'] }],
  sources: [
    {
      date: '2026-07-27',
      id: 'source-1',
      title: 'Source',
      url: 'https://example.com',
    },
  ],
  summary: 'You can buy ETH through MetaMask.',
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
  title: 'Information about buying ETH',
  tokens: ['ETH'],
  ...overrides,
});

describe('trade intent priority', () => {
  it.each([
    'Can I buy ETH',
    'Buy ETH',
    'Please buy ETH',
    'I want to buy ETH',
    'How do I buy ETH',
  ])('classifies %p as a direct trade request', (prompt) => {
    expect(isDirectTradeRequest(prompt)).toBe(true);
  });

  it.each(['Should I buy ETH?', 'Why buy ETH?'])(
    'does not classify %p as an execution request',
    (prompt) => {
      expect(isDirectTradeRequest(prompt)).toBe(false);
    },
  );

  it('overrides an information-only response for can I buy ETH', () => {
    const result = prioritizeDirectTradeRequest(
      'Can I buy ETH',
      createResearch(),
    );

    expect(result.swapIntent).toEqual({
      amountType: 'unspecified',
      amountValue: '',
      enabled: true,
      mode: 'real',
      network: '',
      sourceAmount: '',
      sourceSymbol: '',
      destinationSymbol: 'ETH',
    });
    expect(result.title).toBe('Prepare an ETH trade');
    expect(result.sections).toEqual([]);
    expect(result.sources).toEqual([]);
  });

  it('preserves an explicit network when overriding an information response', () => {
    const result = prioritizeDirectTradeRequest(
      'Can I buy ETH on Robinhood Chain?',
      createResearch(),
    );

    expect(result.swapIntent).toEqual(
      expect.objectContaining({
        destinationSymbol: 'ETH',
        network: 'Robinhood Chain',
      }),
    );
  });

  it('does not turn a paper-trade request into a real swap', () => {
    const result = prioritizeDirectTradeRequest(
      'Paper trade: buy $50 of ETH',
      createResearch(),
    );

    expect(result.swapIntent.enabled).toBe(false);
  });

  it('preserves an enabled model trade intent', () => {
    const research = createResearch({
      swapIntent: {
        amountType: 'exact',
        amountValue: '0.1',
        enabled: true,
        mode: 'real',
        network: 'Ethereum',
        sourceAmount: '0.1',
        sourceSymbol: 'USDC',
        destinationSymbol: 'ETH',
      },
    });

    expect(prioritizeDirectTradeRequest('Buy ETH', research)).toBe(research);
  });

  it.each([
    {
      prompt: 'Swap 0.1 ETH for USDC',
      intent: {
        amountType: 'exact',
        amountValue: '0.1',
        sourceAmount: '0.1',
        sourceSymbol: 'ETH',
        destinationSymbol: 'USDC',
        network: '',
      },
    },
    {
      prompt: 'Buy $50 of ETH on Base',
      intent: {
        amountType: 'fiat',
        amountValue: '50',
        sourceAmount: '',
        sourceSymbol: '',
        destinationSymbol: 'ETH',
        network: 'Base',
      },
    },
    {
      prompt: 'Buy ETH with 75 USDC',
      intent: {
        amountType: 'exact',
        amountValue: '75',
        sourceAmount: '75',
        sourceSymbol: 'USDC',
        destinationSymbol: 'ETH',
        network: '',
      },
    },
    {
      prompt: 'Sell 25% of my ETH for USDC',
      intent: {
        amountType: 'percent',
        amountValue: '25',
        sourceAmount: '',
        sourceSymbol: 'ETH',
        destinationSymbol: 'USDC',
        network: '',
      },
    },
    {
      prompt: 'Sell half of my ETH',
      intent: {
        amountType: 'percent',
        amountValue: '50',
        sourceAmount: '',
        sourceSymbol: 'ETH',
        destinationSymbol: '',
        network: '',
      },
    },
  ])('builds an immediate trade for $prompt', ({ prompt, intent }) => {
    expect(buildImmediateTradeResponse(prompt)?.swapIntent).toEqual({
      ...intent,
      enabled: true,
      mode: 'real',
    });
  });

  it('updates an existing trade with an explicit conversational follow-up', () => {
    const previousIntent = {
      amountType: 'unspecified' as const,
      amountValue: '',
      enabled: true,
      mode: 'real' as const,
      network: '',
      sourceAmount: '',
      sourceSymbol: '',
      destinationSymbol: 'ETH',
    };

    const funded = buildImmediateTradeResponse('Pay with USDC', previousIntent);
    const resized = buildImmediateTradeResponse(
      'Make it $50',
      funded?.swapIntent,
    );
    const networked = buildImmediateTradeResponse(
      'On Base',
      resized?.swapIntent,
    );

    expect(networked?.swapIntent).toEqual({
      amountType: 'fiat',
      amountValue: '50',
      enabled: true,
      mode: 'real',
      network: 'Base',
      sourceAmount: '',
      sourceSymbol: 'USDC',
      destinationSymbol: 'ETH',
    });
  });

  it('does not treat an ambiguous conversational reply as a trade edit', () => {
    expect(
      buildImmediateTradeResponse('What do you think?', {
        amountType: 'unspecified',
        amountValue: '',
        enabled: true,
        mode: 'real',
        network: '',
        sourceAmount: '',
        sourceSymbol: 'ETH',
        destinationSymbol: 'USDC',
      }),
    ).toBeUndefined();
  });

  it('does not leak a previous trade into network-specific research', () => {
    const previousIntent = {
      amountType: 'fiat' as const,
      amountValue: '10',
      enabled: true,
      mode: 'real' as const,
      network: 'BNB Smart Chain',
      sourceAmount: '',
      sourceSymbol: 'POSI',
      destinationSymbol: 'ON',
    };

    expect(
      buildImmediateTradeResponse(
        'What token on Robinhood chain is trending today',
        previousIntent,
      ),
    ).toBeUndefined();
    expect(
      buildImmediateTradeResponse('Which tokens are on Base?', previousIntent),
    ).toBeUndefined();
  });

  it('accepts an explicit network-only trade follow-up', () => {
    const result = buildImmediateTradeResponse('On Robinhood Chain', {
      amountType: 'unspecified',
      amountValue: '',
      enabled: true,
      mode: 'real',
      network: '',
      sourceAmount: '',
      sourceSymbol: 'USDC',
      destinationSymbol: 'ETH',
    });

    expect(result?.swapIntent.network).toBe('Robinhood Chain');
  });

  it('inherits a single-network research context for the next direct trade', () => {
    const research = createResearch({
      assets: [
        {
          chainId: 'eip155:4663',
          contractAddress: '0x1234567890123456789012345678901234567890',
          name: 'The Hood',
          network: 'Robinhood Chain',
          symbol: 'THEHOOD',
        },
      ],
      tokens: ['THEHOOD'],
    });
    const networkContext = getResearchNetworkContext(research);

    const result = buildImmediateTradeResponse(
      'Buy $100 of THEHOOD',
      undefined,
      networkContext,
    );

    expect(result?.swapIntent).toEqual(
      expect.objectContaining({
        amountType: 'fiat',
        amountValue: '100',
        destinationSymbol: 'THEHOOD',
        network: 'Robinhood Chain',
      }),
    );
  });

  it('does not infer context from research spanning multiple networks', () => {
    const research = createResearch({
      assets: [
        {
          chainId: 'eip155:4663',
          contractAddress: '0x1234567890123456789012345678901234567890',
          name: 'The Hood',
          network: 'Robinhood Chain',
          symbol: 'THEHOOD',
        },
        {
          chainId: 'eip155:1',
          contractAddress: '0x0987654321098765432109876543210987654321',
          name: 'Ethereum',
          network: 'Ethereum',
          symbol: 'ETH',
        },
      ],
    });

    expect(getResearchNetworkContext(research)).toBe('');
  });
});
