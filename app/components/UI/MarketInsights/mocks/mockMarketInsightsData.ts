import type { MarketInsightsReport } from '../types/marketInsights';

/**
 * Mock market insights data for BTC
 * Sourced from v3_report_btc.json - will be replaced by API integration
 */
export const mockBtcMarketInsights: MarketInsightsReport = {
  version: '1.0',
  asset: 'btc',
  generatedAt: '2026-02-11T10:32:52.403Z',
  headline:
    'BTC Dips 50% to $68K; Buy-the-Dip Calls Surge as On-Chain Bottom Signals Emerge',
  summary:
    'Bitcoin trades around $68,000 after a sharp 50% correction from its $126K October 2025 ATH, with 24h volume exceeding $40B amid volatility. Influencers like Tom Lee, Saylor, and Scaramucci advocate buying the dip, while on-chain metrics signal potential cycle lows. Long-term optimism persists with projections of outperforming S&P returns.',
  trends: [
    {
      title: 'Institutions Buying the Dip',
      description:
        'Prominent investors and firms like Fundstrat, SkyBridge, and MicroStrategy are accumulating BTC during the pullback, viewing current levels as prime entry points for long-term gains.',
      category: 'macro',
      impact: 'positive',
      articles: [
        {
          title:
            'Tom Lee says stop timing the bottom and start buying the dip',
          url: 'https://www.coindesk.com/markets/2026/02/11/tom-lee-says-stop-timing-the-bottom-and-start-buying-the-dip',
          source: 'coindesk.com',
          date: '2026-02-11',
        },
        {
          title:
            "SkyBridge's Scaramucci is buying the bitcoin dip, calls Trump a crypto President",
          url: 'https://www.coindesk.com/markets/2026/02/11/we-are-a-buyer-of-bitcoin-in-this-market-skybridge-s-scaramucci-says',
          source: 'coindesk.com',
          date: '2026-02-10',
        },
        {
          title:
            "Saylor says bitcoin will 'double or triple' S&P returns over coming years, vows Strategy won't be selling",
          url: 'https://www.theblock.co/post/389253/saylor-bitcoin-double-triple-sp-returns-coming-years-vows-strategy-wont-selling',
          source: 'theblock.co',
          date: '2026-02-10',
        },
      ],
      tweets: [
        {
          contentSummary:
            'You could take out a $67,000 loan today at 7.5% and buy 1 BTC. In 10 years... potentially a 5–10x return.',
          url: 'https://x.com/i/status/2021353484361052550',
          author: '@saylordocs',
          date: '2026-02-10',
        },
        {
          contentSummary:
            'finally made it to .1 BTC thank you for this dip',
          url: 'https://x.com/i/status/2019843486951112839',
          author: '@levhub',
          date: '2026-02-06',
        },
        {
          contentSummary: 'People who bought the dip at $60,000',
          url: 'https://x.com/i/status/2019882981616234801',
          author: '@TheBTCTherapist',
          date: '2026-02-06',
        },
      ],
    },
    {
      title: 'On-Chain Metrics Signal Cycle Bottom',
      description:
        'Convergence of BTC in profit and loss supplies, along with whale accumulation, mirrors historical bottoms, suggesting the current dip may be nearing an end.',
      category: 'technical',
      impact: 'positive',
      articles: [
        {
          title:
            'This onchain metric has identified the Bitcoin bottom every cycle',
          url: 'https://www.coindesk.com/markets/2026/02/04/this-onchain-metric-has-identified-the-bitcoin-bottom-every-cycle',
          source: 'coindesk.com',
          date: '2026-02-04',
        },
      ],
      tweets: [
        {
          contentSummary:
            '$BTC (1M) – When to buy Bitcoin... realized price. This indicator tells us if the average network participant is in a state of profit or loss.',
          url: 'https://x.com/i/status/2020957334290538815',
          author: '@_Crypflow_',
          date: '2026-02-09',
        },
        {
          contentSummary:
            'Bitcoin has a nice set of Relative Equal Lows at 25k',
          url: 'https://x.com/i/status/2019374530796347561',
          author: '@I_Am_The_ICT',
          date: '2026-02-05',
        },
      ],
    },
    {
      title: 'Long-Term BTC Superiority to Traditional Assets',
      description:
        'Analysts forecast BTC to double or triple S&P returns and evolve into digital gold, emphasizing HODL strategy amid volatility.',
      category: 'macro',
      impact: 'positive',
      articles: [
        {
          title:
            'Bitcoin a tech trade for now, not digital gold, says Grayscale',
          url: 'https://www.coindesk.com/markets/2026/02/10/bitcoin-a-tech-trade-for-now-not-digital-gold-says-grayscale',
          source: 'coindesk.com',
          date: '2026-02-10',
        },
        {
          title:
            "Saylor says bitcoin will 'double or triple' S&P returns over coming years, vows Strategy won't be selling",
          url: 'https://www.theblock.co/post/389253/saylor-bitcoin-double-triple-sp-returns-coming-years-vows-strategy-wont-selling',
          source: 'theblock.co',
          date: '2026-02-10',
        },
      ],
      tweets: [
        {
          contentSummary:
            'I truly believe that Michael Saylor is one of the greatest visionaries... When Bitcoin\'s price is low I enjoy listening to this speech.',
          url: 'https://x.com/i/status/2018844601176748127',
          author: '@TheBTCTherapist',
          date: '2026-02-04',
        },
        {
          contentSummary: 'BITCOIN IS GOING TO ZERO',
          url: 'https://x.com/i/status/2019364881020121175',
          author: '@saylordocs',
          date: '2026-02-05',
        },
      ],
    },
  ],
  sources: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com', type: 'news' },
    { name: 'The Block', url: 'https://www.theblock.co', type: 'news' },
    {
      name: 'CoinMarketCap',
      url: 'https://coinmarketcap.com/currencies/bitcoin/',
      type: 'data',
    },
    {
      name: 'CoinGecko',
      url: 'https://www.coingecko.com/en/coins/bitcoin',
      type: 'data',
    },
    { name: 'X', url: 'https://x.com', type: 'social' },
  ],
};

/**
 * Returns mock market insights for a given asset symbol.
 * Currently only BTC is supported. Returns undefined for unsupported assets.
 */
export const getMockMarketInsights = (
  assetSymbol: string,
): MarketInsightsReport | undefined => {
  const symbol = assetSymbol.toLowerCase();
  if (symbol === 'btc') {
    return mockBtcMarketInsights;
  }
  return undefined;
};
