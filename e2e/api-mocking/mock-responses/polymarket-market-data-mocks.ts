import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../helpers/mockHelpers';

/**
 * Test-specific mock for Polymarket API with sample market data
 */
export const POLYMARKET_MARKET_DATA_MOCKS = async (mockServer: Mockttp) => {
  // Mock the Polymarket events pagination endpoint with sample data
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination/,
    responseCode: 200,
    response: {
      data: [
        {
          id: 'test-market-1',
          title: 'Will Bitcoin reach $100,000 by end of 2024?',
          description: 'A prediction market about Bitcoin price',
          endDate: '2024-12-31T23:59:59Z',
          outcomes: [
            {
              id: 'outcome-1',
              title: 'Yes',
              groupItemTitle: 'Yes',
              image: 'https://example.com/bitcoin.jpg',
              volume: '1000000',
              tokens: [
                { id: 'token-1', title: 'Yes', price: 0.65 },
                { id: 'token-2', title: 'No', price: 0.35 }
              ]
            }
          ],
          recurrence: 'NONE'
        },
        {
          id: 'test-market-2',
          title: 'Will Ethereum reach $5,000 by end of 2024?',
          description: 'A prediction market about Ethereum price',
          endDate: '2024-12-31T23:59:59Z',
          outcomes: [
            {
              id: 'outcome-2',
              title: 'Yes',
              groupItemTitle: 'Yes',
              image: 'https://example.com/ethereum.jpg',
              volume: '800000',
              tokens: [
                { id: 'token-3', title: 'Yes', price: 0.45 },
                { id: 'token-4', title: 'No', price: 0.55 }
              ]
            }
          ],
          recurrence: 'NONE'
        },
        {
          id: 'test-market-3',
          title: 'Will Solana reach $200 by end of 2024?',
          description: 'A prediction market about Solana price',
          endDate: '2024-12-31T23:59:59Z',
          outcomes: [
            {
              id: 'outcome-3',
              title: 'Yes',
              groupItemTitle: 'Yes',
              image: 'https://example.com/solana.jpg',
              volume: '500000',
              tokens: [
                { id: 'token-5', title: 'Yes', price: 0.30 },
                { id: 'token-6', title: 'No', price: 0.70 }
              ]
            }
          ],
          recurrence: 'NONE'
        }
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 3,
        hasMore: false
      }
    },
  });

  // Mock the geoblock endpoint
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: {
      blocked: false,
    },
  });
};
