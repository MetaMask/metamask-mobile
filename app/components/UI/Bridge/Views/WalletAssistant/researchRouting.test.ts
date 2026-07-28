import {
  applyResearchPlanIdentity,
  buildResearchPlan,
  getResearchPlanInstructions,
} from './researchRouting';

describe('researchRouting', () => {
  it('routes direct trades without web research', () => {
    expect(buildResearchPlan('Buy 0.1 ETH with USDC')).toEqual(
      expect.objectContaining({
        intent: 'trade',
        useWebSearch: false,
      }),
    );
  });

  it('routes risk research to a deeper search', () => {
    expect(buildResearchPlan('Is $PEPE risky?')).toEqual(
      expect.objectContaining({
        assetHints: [
          expect.objectContaining({
            symbol: 'PEPE',
          }),
        ],
        intent: 'risk',
        searchContextSize: 'medium',
        useWebSearch: true,
      }),
    );
  });

  it('anchors a token to Robinhood Chain instead of the company', () => {
    const plan = buildResearchPlan(
      'Research CASHCAT on Robinhood Chain at 0x020b1234567890123456789012345678901218b4',
    );

    expect(plan).toEqual(
      expect.objectContaining({
        intent: 'project_overview',
        network: {
          caipChainId: 'eip155:4663',
          name: 'Robinhood Chain',
        },
      }),
    );
    expect(plan.assetHints).toContainEqual({
      contractAddress: '0x020b1234567890123456789012345678901218b4',
      network: {
        caipChainId: 'eip155:4663',
        name: 'Robinhood Chain',
      },
      symbol: 'CASHCAT',
    });
    expect(getResearchPlanInstructions(plan)).toContain(
      'Only include assets deployed on this network.',
    );
  });

  it('recognizes comparisons and common asset names', () => {
    const plan = buildResearchPlan('Compare Ethereum versus Bitcoin');

    expect(plan.intent).toBe('comparison');
    expect(plan.assetHints.map(({ symbol }) => symbol)).toEqual(['BTC', 'ETH']);
    expect(plan.searchContextSize).toBe('medium');
  });

  it('does not search the web for general conversation', () => {
    expect(buildResearchPlan('Hello there')).toEqual(
      expect.objectContaining({
        intent: 'general',
        useWebSearch: false,
      }),
    );
  });

  it('applies explicit network and contract identity to the response', () => {
    const plan = buildResearchPlan(
      'Research CASHCAT on Robinhood Chain at 0x020b1234567890123456789012345678901218b4',
    );
    const research = {
      asOf: '',
      assets: [
        {
          chainId: 'eip155:1',
          contractAddress: '0x1111111111111111111111111111111111111111',
          name: 'Wrong Cashcat',
          network: 'Ethereum',
          symbol: 'CASHCAT',
        },
      ],
      chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
      sections: [],
      sources: [],
      summary: '',
      swapIntent: {
        amountType: 'unspecified' as const,
        amountValue: '',
        enabled: false,
        mode: 'real' as const,
        network: '',
        sourceAmount: '',
        sourceSymbol: '',
        destinationSymbol: '',
      },
      title: '',
      tokens: ['CASHCAT'],
    };

    expect(applyResearchPlanIdentity(plan, research).assets).toEqual([
      {
        chainId: 'eip155:4663',
        contractAddress: '0x020b1234567890123456789012345678901218b4',
        name: '',
        network: 'Robinhood Chain',
        symbol: 'CASHCAT',
      },
    ]);
  });
});
