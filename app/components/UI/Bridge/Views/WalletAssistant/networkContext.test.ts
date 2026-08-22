import type { WalletAssistantResearchResponse } from './openai';
import {
  getNetworkContextInstructions,
  hasNetworkContextMismatch,
} from './networkContext';

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
  title: '',
  tokens: [],
  ...overrides,
});

describe('Robinhood Chain context', () => {
  it('adds chain-specific context to a Robinhood Chain request', () => {
    expect(
      getNetworkContextInstructions(
        'Show me the most popular Robinhood Chain token',
      ),
    ).toContain('chain ID 4663');
  });

  it('does not add Robinhood Chain context to a Robinhood stock request', () => {
    expect(getNetworkContextInstructions('Show me the Robinhood stock')).toBe(
      '',
    );
  });

  it('detects the Robinhood Markets and HOOD conflation', () => {
    expect(
      hasNetworkContextMismatch(
        'Show me the most popular Robinhood Chain token',
        createResearch({
          title: 'Robinhood Markets token (HOOD)',
          summary: 'A market snapshot of the HOOD stock.',
          tokens: ['HOOD'],
        }),
      ),
    ).toBe(true);
  });

  it('accepts a token that is deployed on Robinhood Chain', () => {
    expect(
      hasNetworkContextMismatch(
        'Show me the most popular Robinhood Chain token',
        createResearch({
          title: 'Popular Robinhood Chain tokens',
          summary: 'CASHCAT is deployed on Robinhood Chain.',
          tokens: ['CASHCAT'],
        }),
      ),
    ).toBe(false);
  });
});
