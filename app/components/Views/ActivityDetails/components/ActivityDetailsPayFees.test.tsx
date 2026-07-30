import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailsPayFeesAndTotal,
  hasActivityPayFiat,
} from './ActivityDetailsPayFees';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

const { NETWORK_FEE_ROW, BRIDGE_FEE_ROW, TOTAL_ROW } =
  ActivityDetailsSelectorsIDs;

function payItem(
  metamaskPay: Record<string, string> | undefined,
): ActivityListItem {
  return {
    type: 'predictionsAddFunds',
    chainId: 'eip155:137',
    status: 'success',
    timestamp: 1,
    hash: '0xfund',
    data: { token: { amount: '100000', decimals: 6, symbol: 'USDC' } },
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: { id: 'tx-1', chainId: '0x89', metamaskPay },
        initialTransaction: { id: 'tx-1', chainId: '0x89' },
        transactions: [],
      },
    },
  } as unknown as ActivityListItem;
}

/** A provider-backed row — no local `TransactionMeta`, so no Pay metadata. */
const providerItem = {
  type: 'predictionPlaced',
  chainId: 'eip155:137',
  status: 'success',
  timestamp: 1,
  hash: 'predict-1',
  data: {},
  raw: { type: 'predictActivity', data: { id: 'predict-1' } },
} as unknown as ActivityListItem;

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ACCOUNT = '0x0000000000000000000000000000000000000001';

/** State where the payment token is a tracked ERC-20 on mainnet. */
const stateWithPayToken = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TokensController: {
        ...backgroundState.TokensController,
        allTokens: {
          '0x1': {
            [ACCOUNT]: [{ address: USDC_MAINNET, symbol: 'USDC', decimals: 6 }],
          },
        },
      },
    },
  },
};

/** Non-USD display currency, to pin the deliberate USD formatting. */
const eurState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      CurrencyRateController: {
        ...backgroundState.CurrencyRateController,
        currentCurrency: 'eur',
      },
      // Read instead of `CurrencyRateController` once assets state unifies.
      AssetsController: { selectedCurrency: 'eur' },
    },
  },
};

describe('ActivityDetailsPayFeesAndTotal', () => {
  it('renders network fee, bridge fee and total', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        item={payItem({
          networkFeeFiat: '0',
          bridgeFeeFiat: '0.04',
          totalFiat: '0.14',
        })}
      />,
    );

    expect(getByTestId(NETWORK_FEE_ROW)).toBeOnTheScreen();
    expect(getByTestId(BRIDGE_FEE_ROW)).toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
    // A sponsored network fee is recorded as zero and must still show.
    expect(getByText('$0')).toBeOnTheScreen();
    expect(getByText('$0.04')).toBeOnTheScreen();
    expect(getByText('$0.14')).toBeOnTheScreen();
  });

  it('formats in USD even when the display currency is not USD', () => {
    // Pay's values are USD amounts; reformatting them as EUR would relabel the
    // same number as a different currency.
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        item={payItem({ bridgeFeeFiat: '0.04', totalFiat: '0.14' })}
      />,
      { state: eurState },
    );

    expect(getByText('$0.04')).toBeOnTheScreen();
    expect(queryByText('€0.04')).toBeNull();
  });

  it('denominates the network fee in the payment chain native asset and the bridge fee in the payment token', () => {
    // Source-side both: gas in mainnet ETH, the provider's cut out of the USDC
    // the user paid with.
    const { getByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        item={payItem({
          chainId: '0x1',
          tokenAddress: USDC_MAINNET,
          networkFeeFiat: '1.23',
          bridgeFeeFiat: '0.09',
          totalFiat: '1001.24',
        })}
      />,
      { state: stateWithPayToken },
    );

    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
  });

  it('denominates both fees in the native asset when the user paid with it', () => {
    const { getAllByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        item={payItem({
          chainId: '0x1',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          networkFeeFiat: '1.23',
          bridgeFeeFiat: '0.09',
        })}
      />,
    );

    expect(getAllByText('ETH')).toHaveLength(2);
  });

  it('renders fees as fiat alone when the payment token is unknown', () => {
    // An untracked payment token has no symbol, so no nameless avatar.
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        item={payItem({
          chainId: '0x1',
          tokenAddress: USDC_MAINNET,
          bridgeFeeFiat: '0.09',
        })}
      />,
    );

    expect(getByText('$0.09')).toBeOnTheScreen();
    expect(queryByText('USDC')).toBeNull();
  });

  it('renders the total alone when Pay recorded no fees', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal item={payItem({ totalFiat: '0.14' })} />,
    );

    expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
    expect(queryByTestId(NETWORK_FEE_ROW)).toBeNull();
    expect(queryByTestId(BRIDGE_FEE_ROW)).toBeNull();
  });

  it('renders nothing when the transaction has no Pay metadata', () => {
    const { toJSON } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal item={payItem(undefined)} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders nothing for a row with no local transaction', () => {
    const { toJSON } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal item={providerItem} />,
    );

    expect(toJSON()).toBeNull();
  });
});

describe('hasActivityPayFiat', () => {
  it.each([
    ['is true for a recorded zero fee', { networkFeeFiat: '0' }, true],
    ['is true for a total with no fees', { totalFiat: '0.14' }, true],
    ['is false for empty Pay metadata', {}, false],
  ])('%s', (_name, metamaskPay, expected) => {
    expect(hasActivityPayFiat(payItem(metamaskPay))).toBe(expected);
  });

  it('is false without Pay metadata or a local transaction', () => {
    expect(hasActivityPayFiat(payItem(undefined))).toBe(false);
    expect(hasActivityPayFiat(providerItem)).toBe(false);
  });
});
