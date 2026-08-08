import {
  getTradeReviewSafetyNotice,
  TradeReviewMode,
  TradeReviewSafetySeverity,
  TradeReviewSecurityStatus,
} from './tradeReviewSafety';

const NOW = 1_000_000;

const realTrade = {
  mode: TradeReviewMode.Real,
  now: NOW,
  securityStatus: TradeReviewSecurityStatus.Safe,
};

describe('getTradeReviewSafetyNotice', () => {
  it('prioritizes a blocked security result for a real trade', () => {
    const notice = getTradeReviewSafetyNotice({
      ...realTrade,
      securityStatus: TradeReviewSecurityStatus.Blocked,
      priceImpactPercent: 40,
      isQuoteStale: true,
    });

    expect(notice.severity).toBe(TradeReviewSafetySeverity.Danger);
    expect(notice.title).toBe('Security warning');
    expect(notice.securityCheckRequired).toBe(true);
    expect(notice.description).toContain(
      'Review the final amounts, fees, and security details in MetaMask before you confirm.',
    );
  });

  it.each([
    { name: 'stale', isQuoteStale: true },
    { name: 'expired', quoteExpiresAt: NOW },
  ])('requires a fresh quote when the quote is $name', (quoteState) => {
    expect(
      getTradeReviewSafetyNotice({
        ...realTrade,
        ...quoteState,
      }),
    ).toMatchObject({
      severity: TradeReviewSafetySeverity.Danger,
      title: 'Quote expired',
      requiresFreshQuote: true,
    });
  });

  it.each([
    { impact: 25, expected: '25.0% price impact' },
    { impact: -30.45, expected: '30.4% price impact' },
  ])(
    'shows danger for very high price impact: $impact',
    ({ impact, expected }) => {
      const notice = getTradeReviewSafetyNotice({
        ...realTrade,
        priceImpactPercent: impact,
      });

      expect(notice.severity).toBe(TradeReviewSafetySeverity.Danger);
      expect(notice.title).toBe('Very high price impact');
      expect(notice.description).toContain(expected);
    },
  );

  it.each([
    {
      securityStatus: TradeReviewSecurityStatus.Warning,
      title: 'Review security warning',
    },
    {
      securityStatus: TradeReviewSecurityStatus.Unavailable,
      title: 'Security check unavailable',
    },
    {
      securityStatus: TradeReviewSecurityStatus.Unchecked,
      title: 'Security check unavailable',
    },
  ])(
    'warns when security status is $securityStatus',
    ({ securityStatus, title }) => {
      expect(
        getTradeReviewSafetyNotice({
          ...realTrade,
          securityStatus,
        }),
      ).toMatchObject({
        severity: TradeReviewSafetySeverity.Warning,
        title,
        securityCheckRequired: true,
      });
    },
  );

  it('warns at the existing bridge 5% price-impact threshold', () => {
    const notice = getTradeReviewSafetyNotice({
      ...realTrade,
      priceImpactPercent: 5,
    });

    expect(notice).toMatchObject({
      severity: TradeReviewSafetySeverity.Warning,
      title: 'High price impact',
      requiresFreshQuote: false,
    });
    expect(notice.description).toContain('5.0% price impact');
  });

  it('warns when a quote expires within 15 seconds', () => {
    expect(
      getTradeReviewSafetyNotice({
        ...realTrade,
        quoteExpiresAt: NOW + 15_000,
      }),
    ).toMatchObject({
      severity: TradeReviewSafetySeverity.Warning,
      title: 'Quote expiring soon',
    });
  });

  it('shows the formatted estimate for a high network fee', () => {
    const notice = getTradeReviewSafetyNotice({
      ...realTrade,
      estimatedNetworkFee: {
        formatted: '$18.42',
        isHigh: true,
      },
    });

    expect(notice).toMatchObject({
      severity: TradeReviewSafetySeverity.Warning,
      title: 'High network fee',
    });
    expect(notice.description).toContain('$18.42');
  });

  it('uses an informational MetaMask review notice for a normal quote', () => {
    expect(
      getTradeReviewSafetyNotice({
        ...realTrade,
        priceImpactPercent: 0.4,
        quoteExpiresAt: NOW + 30_000,
        estimatedNetworkFee: {
          formatted: '$1.24',
        },
      }),
    ).toEqual({
      severity: TradeReviewSafetySeverity.Info,
      title: 'Review in MetaMask',
      description:
        'The assistant prepared this quote. The current network fee estimate is $1.24. Review the final amounts, fees, and security details in MetaMask before you confirm.',
      requiresFreshQuote: false,
      securityCheckRequired: false,
    });
  });

  it('ignores non-finite numeric metadata', () => {
    expect(
      getTradeReviewSafetyNotice({
        ...realTrade,
        priceImpactPercent: Number.NaN,
        quoteExpiresAt: Number.POSITIVE_INFINITY,
      }),
    ).toMatchObject({
      severity: TradeReviewSafetySeverity.Info,
      title: 'Review in MetaMask',
    });
  });
});
