import { MalformedOpenAIResponseError } from './errorRecovery';
import { parseWalletAssistantResearchResponse } from './structuredResponse';

const validResponse = {
  asOf: '2026-07-27T12:00:00Z',
  assets: [
    {
      chainId: 'eip155:1',
      contractAddress: '',
      name: 'Ethereum',
      network: 'Ethereum',
      symbol: 'ETH',
    },
  ],
  title: 'ETH update',
  summary: 'Ethereum moved after ETF inflows.',
  sections: [
    {
      heading: 'Drivers',
      bullets: ['ETF demand'],
      evidence: [{ confidence: 'high', sourceIds: ['market-report'] }],
    },
  ],
  sources: [
    {
      date: '2026-07-27',
      id: 'market-report',
      title: 'Market report',
      url: 'https://example.com/report',
    },
  ],
  chart: {
    title: 'Weekly price',
    unit: 'USD',
    labels: ['Mon', 'Tue'],
    sourceIds: ['market-report', 'market-report'],
    values: [100, 105],
  },
  tokens: ['eth'],
  swapIntent: {
    amountType: 'exact',
    amountValue: '0.1',
    enabled: true,
    mode: 'real',
    network: 'Ethereum',
    sourceAmount: '0.1',
    sourceSymbol: 'eth',
    destinationSymbol: 'usdc',
  },
};

describe('parseWalletAssistantResearchResponse', () => {
  it('parses JSON and normalizes token and swap symbols', () => {
    expect(
      parseWalletAssistantResearchResponse(JSON.stringify(validResponse)),
    ).toEqual({
      ...validResponse,
      tokens: ['ETH'],
      swapIntent: {
        ...validResponse.swapIntent,
        sourceSymbol: 'ETH',
        destinationSymbol: 'USDC',
      },
    });
  });

  it.each(['{secret raw response', null, [], 42])(
    'throws a safe malformed response error for %p',
    (input) => {
      let thrown: unknown;
      try {
        parseWalletAssistantResearchResponse(input);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(MalformedOpenAIResponseError);
      if (String(input)) {
        expect((thrown as Error).message).not.toContain(String(input));
      }
    },
  );

  it('bounds prose collections and string lengths', () => {
    const parsed = parseWalletAssistantResearchResponse({
      title: 't'.repeat(300),
      summary: 's'.repeat(2_000),
      sections: Array.from({ length: 20 }, (_, index) => ({
        heading: `Heading ${index}`,
        bullets: Array.from({ length: 20 }, () => 'b'.repeat(1_000)),
      })),
    });

    expect(parsed.title).toHaveLength(160);
    expect(parsed.summary).toHaveLength(1_200);
    expect(parsed.sections).toHaveLength(8);
    expect(parsed.sections[0].bullets).toHaveLength(8);
    expect(parsed.sections[0].bullets[0]).toHaveLength(600);
  });

  it('drops unsafe, credentialed, malformed, and duplicate source URLs', () => {
    const parsed = parseWalletAssistantResearchResponse({
      sources: [
        { title: 'Script', url: ['javascript', ':alert(1)'].join('') },
        { title: 'Data', url: 'data:text/html,bad' },
        { title: 'Credentials', url: 'https://user:pass@example.com' },
        { title: 'Malformed', url: 'not a url' },
        { title: '', url: 'https://www.example.com/a' },
        { title: 'Duplicate', url: 'https://www.example.com/a' },
      ],
    });

    expect(parsed.sources).toEqual([
      {
        date: '',
        id: 'source-1',
        title: 'example.com',
        url: 'https://www.example.com/a',
      },
    ]);
  });

  it('bounds sources and tokens while removing invalid and duplicate tokens', () => {
    const parsed = parseWalletAssistantResearchResponse({
      sources: Array.from({ length: 20 }, (_, index) => ({
        title: `Source ${index}`,
        url: `https://example.com/${index}`,
      })),
      tokens: [
        'eth',
        'ETH',
        'usdc',
        '<script>',
        ...Array.from({ length: 20 }, (_, index) => `T${index}`),
      ],
    });

    expect(parsed.sources).toHaveLength(12);
    expect(parsed.tokens).toEqual([
      'ETH',
      'USDC',
      'T0',
      'T1',
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'T8',
    ]);
  });

  it('accepts a bounded finite chart', () => {
    const parsed = parseWalletAssistantResearchResponse({
      sources: [
        {
          id: 'market-data',
          title: 'Market data',
          url: 'https://example.com/data',
        },
      ],
      chart: {
        title: 'Chart',
        unit: '%',
        labels: Array.from({ length: 30 }, (_, index) => `Day ${index}`),
        sourceIds: Array.from({ length: 30 }, () => 'market-data'),
        values: Array.from({ length: 30 }, (_, index) => index),
      },
    });

    expect(parsed.chart.labels).toHaveLength(24);
    expect(parsed.chart.sourceIds).toHaveLength(24);
    expect(parsed.chart.values).toHaveLength(24);
  });

  it('keeps only evidence and chart points backed by returned sources', () => {
    const parsed = parseWalletAssistantResearchResponse({
      sources: [
        {
          id: 'known-source',
          title: 'Known source',
          url: 'https://example.com/known',
        },
      ],
      sections: [
        {
          heading: 'Evidence',
          bullets: ['Supported claim'],
          evidence: [
            {
              confidence: 'high',
              sourceIds: ['known-source', 'missing-source'],
            },
          ],
        },
      ],
      chart: {
        title: 'Unbacked chart',
        unit: 'USD',
        labels: ['Now'],
        sourceIds: ['missing-source'],
        values: [10],
      },
    });

    expect(parsed.sections[0].evidence).toEqual([
      { confidence: 'high', sourceIds: ['known-source'] },
    ]);
    expect(parsed.chart).toEqual({
      labels: [],
      sourceIds: [],
      title: '',
      unit: '',
      values: [],
    });
  });

  it.each([NaN, Infinity, -Infinity, '12'])(
    'rejects a chart containing non-finite numeric value %p',
    (chartValue) => {
      const parsed = parseWalletAssistantResearchResponse({
        sources: [
          {
            id: 'market-data',
            title: 'Market data',
            url: 'https://example.com/data',
          },
        ],
        chart: {
          title: 'Chart',
          unit: 'USD',
          labels: ['A', 'B'],
          sourceIds: ['market-data', 'market-data'],
          values: [1, chartValue],
        },
      });

      expect(parsed.chart).toEqual({
        labels: [],
        sourceIds: [],
        title: '',
        unit: '',
        values: [],
      });
    },
  );

  it('disables legacy paper intents instead of converting them to real trades', () => {
    expect(
      parseWalletAssistantResearchResponse({
        swapIntent: {
          enabled: true,
          mode: 'paper',
          amountType: 'fiat',
          amountValue: 50,
          sourceAmount: 'should be cleared',
          sourceSymbol: '',
          destinationSymbol: 'eth',
        },
      }).swapIntent,
    ).toEqual({
      amountType: 'unspecified',
      amountValue: '',
      enabled: false,
      mode: 'real',
      network: '',
      sourceAmount: '',
      sourceSymbol: '',
      destinationSymbol: '',
    });

    expect(
      parseWalletAssistantResearchResponse({
        swapIntent: { enabled: true, mode: 'anything-else' },
      }).swapIntent.mode,
    ).toBe('real');
  });

  it('clears disabled trade details and defaults malformed intent fields', () => {
    expect(
      parseWalletAssistantResearchResponse({
        swapIntent: {
          enabled: false,
          mode: 'paper',
          amountType: 'exact',
          amountValue: '5',
          sourceAmount: '5',
          sourceSymbol: 'ETH',
          destinationSymbol: 'USDC',
        },
      }).swapIntent,
    ).toEqual({
      amountType: 'unspecified',
      amountValue: '',
      enabled: false,
      mode: 'real',
      network: '',
      sourceAmount: '',
      sourceSymbol: '',
      destinationSymbol: '',
    });
  });

  it('uses amountValue as the exact source amount when sourceAmount is absent', () => {
    expect(
      parseWalletAssistantResearchResponse({
        swapIntent: {
          enabled: true,
          amountType: 'exact',
          amountValue: '0.25',
          sourceSymbol: 'eth',
          destinationSymbol: 'usdc',
        },
      }).swapIntent.sourceAmount,
    ).toBe('0.25');
  });
});
