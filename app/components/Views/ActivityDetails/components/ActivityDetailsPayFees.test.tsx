import React from 'react';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import type {
  MetamaskPayMetadata,
  TransactionMeta,
} from '@metamask/transaction-controller';
import {
  ActivityDetailsPayFeesAndTotal,
  useActivityPayFiat,
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

/** A provider-backed row — its Pay metadata lives on the local tx behind `hash`. */
const providerItem = {
  type: 'predictionPlaced',
  chainId: 'eip155:137',
  status: 'success',
  timestamp: 1,
  hash: 'predict-1',
  data: {},
  raw: { type: 'predictActivity', data: { id: 'predict-1' } },
} as unknown as ActivityListItem;

/** Pay metadata as the component receives it, already resolved by the hook. */
function pay(metamaskPay: Record<string, string>): MetamaskPayMetadata {
  return metamaskPay as MetamaskPayMetadata;
}

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

/** The local transaction a provider-backed row's hash points at. */
const stateWithLocalPayTransaction = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionController: {
        ...backgroundState.TransactionController,
        transactions: [
          {
            id: 'tx-1',
            chainId: '0x89',
            hash: 'predict-1',
            metamaskPay: { networkFeeFiat: '1.23', bridgeFeeFiat: '0.09' },
          } as unknown as TransactionMeta,
        ],
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
      AssetsController: {
        ...backgroundState.AssetsController,
        selectedCurrency: 'eur' as const,
      },
    },
  },
};

describe('ActivityDetailsPayFeesAndTotal', () => {
  it('renders network fee, bridge fee and total', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        pay={pay({
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

  it('labels the network fee row from networkFeeLabel', () => {
    // Perps calls the same value "Transaction fee".
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        pay={pay({ networkFeeFiat: '1.23' })}
        networkFeeLabel="Transaction fee"
      />,
    );

    expect(getByText('Transaction fee')).toBeOnTheScreen();
    expect(queryByText('Network fee')).toBeNull();
  });

  it('formats in USD even when the display currency is not USD', () => {
    // Pay's values are USD amounts; reformatting them as EUR would relabel the
    // same number as a different currency.
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        pay={pay({ bridgeFeeFiat: '0.04', totalFiat: '0.14' })}
      />,
      { state: eurState },
    );

    expect(getByText('$0.04')).toBeOnTheScreen();
    expect(queryByText('\u20ac0.04')).toBeNull();
  });

  it('denominates the network fee in the payment chain native asset and the bridge fee in the payment token', () => {
    // Source-side both: gas in mainnet ETH, the provider's cut out of the USDC
    // the user paid with.
    const { getByText } = renderWithProvider(
      <ActivityDetailsPayFeesAndTotal
        pay={pay({
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
        pay={pay({
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
        pay={pay({
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
      <ActivityDetailsPayFeesAndTotal pay={pay({ totalFiat: '0.14' })} />,
    );

    expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
    expect(queryByTestId(NETWORK_FEE_ROW)).toBeNull();
    expect(queryByTestId(BRIDGE_FEE_ROW)).toBeNull();
  });
});

describe('useActivityPayFiat', () => {
  const renderPayFiat = (item: ActivityListItem, state?: object) =>
    renderHookWithProvider(() => useActivityPayFiat(item), { state }).result
      .current;

  it('reads Pay metadata straight off a local row', () => {
    expect(
      renderPayFiat(payItem({ networkFeeFiat: '0', bridgeFeeFiat: '0.04' })),
    ).toMatchObject({ networkFeeFiat: '0', bridgeFeeFiat: '0.04' });
  });

  it('resolves Pay metadata for a provider-backed row from the local transaction behind its hash', () => {
    // Perps rows come from the HyperLiquid feed and carry no `metamaskPay`;
    // only the on-chain hash ties them back to the local transaction.
    expect(
      renderPayFiat(providerItem, stateWithLocalPayTransaction),
    ).toMatchObject({ networkFeeFiat: '1.23', bridgeFeeFiat: '0.09' });
  });

  it('is undefined for a provider-backed row with no matching local transaction', () => {
    expect(renderPayFiat(providerItem)).toBeUndefined();
  });

  it('ignores a hash match on a different chain', () => {
    const otherChainState = {
      engine: {
        backgroundState: {
          ...backgroundState,
          TransactionController: {
            ...backgroundState.TransactionController,
            transactions: [
              {
                id: 'tx-1',
                chainId: '0x1',
                hash: 'predict-1',
                metamaskPay: { networkFeeFiat: '1.23' },
              } as unknown as TransactionMeta,
            ],
          },
        },
      },
    };

    expect(renderPayFiat(providerItem, otherChainState)).toBeUndefined();
  });

  it.each([
    ['a recorded zero fee resolves', { networkFeeFiat: '0' }, true],
    ['a total with no fees resolves', { totalFiat: '0.14' }, true],
    ['empty Pay metadata does not', {}, false],
  ])('%s', (_name, metamaskPay, resolved) => {
    expect(Boolean(renderPayFiat(payItem(metamaskPay)))).toBe(resolved);
  });

  it('is undefined when the local transaction has no Pay metadata', () => {
    expect(renderPayFiat(payItem(undefined))).toBeUndefined();
  });
});
