import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
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

/**
 * @param overrides - Fields to replace on the base row.
 * @returns A Predict row, on the injected Polygon chain id.
 */
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

/** Real network configurations, so chain ids resolve to display names. */
const stateWithNetworks = { engine: { backgroundState } };

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

  it('renders MetaMask Pay network fee, bridge fee and total for a funded account', () => {
    const { getByText } = renderWithProvider(
      <PredictDetails
        item={addFundsItemWithPayMetadata({
          networkFeeFiat: '0',
          bridgeFeeFiat: '0.04',
          totalFiat: '0.14',
        })}
      />,
    );

    expect(getByText('Network fee')).toBeOnTheScreen();
    // A sponsored network fee is recorded as zero and must still show.
    expect(getByText('$0')).toBeOnTheScreen();
    expect(getByText('Bridge fee')).toBeOnTheScreen();
    expect(getByText('$0.04')).toBeOnTheScreen();
    expect(getByText('Total amount')).toBeOnTheScreen();
    expect(getByText('$0.14')).toBeOnTheScreen();
  });

  it('omits the fee section when the funding transaction has no MetaMask Pay metadata', () => {
    const { queryByText } = renderWithProvider(
      <PredictDetails item={addFundsItemWithPayMetadata(undefined)} />,
    );

    expect(queryByText('Network fee')).toBeNull();
    expect(queryByText('Total amount')).toBeNull();
    // The step timeline still renders without a fee section above it.
    expect(queryByText('Steps (2 completed)')).not.toBeNull();
  });

  describe('Network row', () => {
    // Every Predict row carries the same injected chain id (Polygon), so the
    // row's own chain can't describe where the user paid.
    it('omits the row entirely for a deposit', () => {
      const { queryByTestId, queryByText } = renderWithProvider(
        <PredictDetails
          item={addFundsItemWithPayMetadata({ chainId: '0x1' })}
        />,
        { state: stateWithNetworks },
      );

      expect(queryByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW)).toBeNull();
      expect(queryByText('Polygon')).toBeNull();
    });

    it('names the payment chain on a withdrawal, not the injected Predict chain', () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <PredictDetails
          item={fundsItemWithPayMetadata('predictionsWithdrawFunds', {
            chainId: '0x1',
          })}
        />,
        { state: stateWithNetworks },
      );

      expect(
        getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
      ).toBeOnTheScreen();
      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(queryByText('Polygon')).toBeNull();
    });

    it("falls back to the row's chain on a withdrawal Pay did not route", () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PredictDetails
          item={fundsItemWithPayMetadata('predictionsWithdrawFunds', undefined)}
        />,
        { state: stateWithNetworks },
      );

      expect(
        getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
      ).toBeOnTheScreen();
      expect(getByText('Polygon')).toBeOnTheScreen();
    });
  });
});

/**
 * @param metamaskPay - Pay metadata for the backing local transaction.
 * @returns A Predict deposit row.
 */
function addFundsItemWithPayMetadata(
  metamaskPay: Record<string, string> | undefined,
): ActivityListItem {
  return fundsItemWithPayMetadata('predictionsAddFunds', metamaskPay);
}

/**
 * @param type - Whether the row is a deposit or a withdrawal.
 * @param metamaskPay - Pay metadata for the backing local transaction.
 * @returns The activity row.
 */
function fundsItemWithPayMetadata(
  type: 'predictionsAddFunds' | 'predictionsWithdrawFunds',
  metamaskPay: Record<string, string> | undefined,
): ActivityListItem {
  return predictItem({
    type,
    hash: '0xfund',
    data: {
      token: {
        amount: '100000',
        decimals: 6,
        symbol: 'USDC',
        direction: type === 'predictionsAddFunds' ? 'in' : 'out',
      },
    },
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: { id: 'tx-1', chainId: '0x89', metamaskPay },
        initialTransaction: { id: 'tx-1', chainId: '0x89' },
        transactions: [],
      },
    },
  } as unknown as Partial<ActivityListItem>);
}
