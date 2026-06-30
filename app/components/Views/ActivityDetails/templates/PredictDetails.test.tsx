import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import Routes from '../../../../constants/navigation/Routes';
import { PredictDetails } from './PredictDetails';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => {
    const actual = jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );
    return {
      ...actual,
      selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => ({
        address: '0x0000000000000000000000000000000000000001',
        metadata: { name: 'Account 1' },
      })),
    };
  },
);

function predictItem(overrides: Partial<ActivityListItem>): ActivityListItem {
  return {
    type: 'predictionPlaced',
    chainId: 'eip155:137',
    status: 'success',
    timestamp: 1_765_361_640_000,
    hash: 'predict-1',
    data: { token: { amount: '100', symbol: 'USDC', direction: 'out' } },
    ...overrides,
  } as ActivityListItem;
}

describe('PredictDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders placed prediction rows and CTA', () => {
    const { getByText, getAllByText } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          raw: {
            type: 'predictActivity',
            data: {
              id: 'predict-1',
              providerId: 'polymarket',
              title: 'Will the Denver Broncos win the AFC West?',
              outcome: 'Yes',
              icon: 'https://example.com/broncos.png',
              eventSlug: 'broncos-afc-west',
              entry: {
                type: 'buy',
                timestamp: 1_765_361_640,
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 1,
                amount: 55,
                price: 10,
              },
            },
          },
        })}
      />,
    );

    expect(getByText('You predicted')).toBeOnTheScreen();
    expect(
      getByText('Will the Denver Broncos win the AFC West?'),
    ).toBeOnTheScreen();
    expect(getAllByText('Yes')).toHaveLength(1);
    expect(getByText('Predicted amount')).toBeOnTheScreen();
    expect(getByText('$55.00')).toBeOnTheScreen();
    expect(getByText('Shares bought')).toBeOnTheScreen();
    expect(getByText('5.50')).toBeOnTheScreen();
    expect(getByText('View on Polymarket')).toBeOnTheScreen();
    expect(getByText('Place another prediction')).toBeOnTheScreen();

    fireEvent.press(getByText('View on Polymarket'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        title: 'Polymarket',
        url: 'https://polymarket.com/event/broncos-afc-west',
      },
    });
  });

  it('renders cashed out activity with prediction context instead of an amount header', () => {
    const { getByText, queryByTestId } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          type: 'predictionCashedOut',
          raw: {
            type: 'predictActivity',
            data: {
              id: 'predict-2',
              providerId: 'polymarket',
              title: 'Will the Denver Broncos win the AFC West?',
              outcome: 'Yes',
              icon: 'https://example.com/broncos.png',
              netPnlUsd: -2.5,
              entry: {
                type: 'sell',
                timestamp: 1_765_361_640,
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 1,
                amount: 10,
                price: 0.7,
              },
            },
          },
        })}
      />,
    );

    expect(getByText('You predicted')).toBeOnTheScreen();
    expect(
      getByText('Will the Denver Broncos win the AFC West?'),
    ).toBeOnTheScreen();
    expect(getByText('Shares sold')).toBeOnTheScreen();
    expect(getByText('Net P&L')).toBeOnTheScreen();
    expect(getByText('-$2.50')).toBeOnTheScreen();
    expect(getByText('View on Polymarket')).toBeOnTheScreen();
    expect(queryByTestId('activity-details-amount-header')).toBeNull();
  });

  it('omits the Net P&L row for a sell when the provider does not supply net P&L', () => {
    const { getByText, queryByText } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          type: 'predictionCashedOut',
          raw: {
            type: 'predictActivity',
            data: {
              id: 'predict-2b',
              providerId: 'polymarket',
              title: 'Will the Denver Broncos win the AFC West?',
              outcome: 'Yes',
              icon: 'https://example.com/broncos.png',
              entry: {
                type: 'sell',
                timestamp: 1_765_361_640,
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 1,
                amount: 10,
                price: 0.7,
              },
            },
          },
        })}
      />,
    );

    expect(getByText('Shares sold')).toBeOnTheScreen();
    expect(queryByText('Net P&L')).toBeNull();
    expect(queryByText('+$10.00')).toBeNull();
  });

  it('renders claimed winnings total and available market payout row', () => {
    const { getAllByText, getByText } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          type: 'predictionClaimWinnings',
          raw: {
            type: 'predictActivity',
            data: {
              id: 'predict-3',
              providerId: 'polymarket',
              title: 'Han Duck-soo in jail by August 10?',
              entry: {
                type: 'claimWinnings',
                timestamp: 1_765_361_640,
                amount: 5.49,
              },
            },
          },
        })}
      />,
    );

    expect(getByText('Total Net P&L')).toBeOnTheScreen();
    expect(getByText('•')).toBeOnTheScreen();
    expect(getByText('Han Duck-soo in jail by August 10?')).toBeOnTheScreen();
    expect(getAllByText('+$5.49')).toHaveLength(3);
  });

  it('uses totalNetPnlUsd / netPnlUsd for the claim breakdown rows when provided', () => {
    const { getByText } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          type: 'predictionClaimWinnings',
          raw: {
            type: 'predictActivity',
            data: {
              id: 'predict-3b',
              providerId: 'polymarket',
              title: 'Han Duck-soo in jail by August 10?',
              totalNetPnlUsd: 12.5,
              netPnlUsd: 4.25,
              entry: {
                type: 'claimWinnings',
                timestamp: 1_765_361_640,
                amount: 5.49,
              },
            },
          },
        })}
      />,
    );

    // Hero shows the gross claimed amount…
    expect(getByText('+$5.49')).toBeOnTheScreen();
    // …while the breakdown uses the dedicated P&L fields (total vs per-market),
    // not the gross amount twice.
    expect(getByText('+$12.50')).toBeOnTheScreen();
    expect(getByText('+$4.25')).toBeOnTheScreen();
  });

  it('renders funded account steps and fund-again CTA', () => {
    const { getByText } = renderWithProvider(
      <PredictDetails
        item={predictItem({
          type: 'predictionsAddFunds',
          hash: '0xfund',
          data: {
            token: {
              amount: '1000000000',
              decimals: 6,
              symbol: 'USDC',
              direction: 'in',
            },
          },
        })}
      />,
    );

    expect(getByText('+1,000 USDC')).toBeOnTheScreen();
    expect(getByText('Steps (2 completed)')).toBeOnTheScreen();
    expect(getByText('Bridge from ETH to USDC.e')).toBeOnTheScreen();
    expect(getByText('Add funds')).toBeOnTheScreen();
    expect(getByText('Fund again')).toBeOnTheScreen();
  });
});
