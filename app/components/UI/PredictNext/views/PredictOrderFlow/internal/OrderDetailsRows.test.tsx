import React from 'react';
import { render } from '@testing-library/react-native';

import { strings } from '../../../../../../../locales/i18n';
import type {
  PredictAmount,
  PredictBuyOrderPreview,
  PredictDecimal,
  PredictSellOrderPreview,
} from '../../../types';
import { formatOdds, OrderDetailsRows } from './OrderDetailsRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const price = (value: string) => value as PredictDecimal;

const basePreview = {
  action: 'buy',
  estimatedContracts: 41,
  averagePrice: '0.4651',
  limitPrice: '0.4651',
  orderAmount: '19.07',
  fee: '0.82',
  feeBreakdown: [
    { source: 'venue', amount: '0.41' },
    { source: 'metamask', amount: '0.41' },
  ],
  totalDebit: '19.89',
  potentialPayout: '41.00',
  potentialProfit: '21.11',
} as unknown as PredictBuyOrderPreview;

const textOf = (
  view: ReturnType<typeof render>,
  testID: string,
): string | undefined => {
  const node = view.queryByTestId(testID);
  return node ? [node.props.children].flat().join('') : undefined;
};

describe('formatOdds', () => {
  it('formats whole-number odds without decimals', () => {
    expect(formatOdds(price('0.53'))).toBe('53%');
    expect(formatOdds(price('0.5'))).toBe('50%');
    expect(formatOdds(price('1'))).toBe('100%');
  });

  it('keeps one decimal place for fractional odds', () => {
    expect(formatOdds(price('0.4651'))).toBe('46.5%');
    expect(formatOdds(price('0.525'))).toBe('52.5%');
  });

  it('rounds fractional odds to one decimal place', () => {
    expect(formatOdds(price('0.5299'))).toBe('53%');
  });

  it('formats zero as 0%', () => {
    expect(formatOdds(price('0'))).toBe('0%');
  });

  it('returns undefined when price is absent or non-numeric', () => {
    expect(formatOdds(undefined)).toBeUndefined();
    expect(formatOdds('' as PredictDecimal)).toBeUndefined();
    expect(formatOdds('not-a-price' as PredictDecimal)).toBeUndefined();
  });
});

describe('OrderDetailsRows', () => {
  it('renders Prediction order, MetaMask fee, Exchange fee, Total, and the partial-fill note', () => {
    const view = render(<OrderDetailsRows preview={basePreview} />);

    expect(
      view.getByText(strings('predict.fee_summary.prediction_order')),
    ).toBeOnTheScreen();
    expect(
      view.getByText(
        '~41 contracts at 46.5¢ each. Final amount may vary based on order book availability.',
      ),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_ORDER_AMOUNT)).toBe(
      '$19.07',
    );

    expect(
      view.getByText(strings('predict.fee_summary.metamask_fee')),
    ).toBeOnTheScreen();
    expect(
      view.getByText(strings('predict.fee_summary.metamask_fee_description')),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_METAMASK_FEE)).toBe(
      '$0.41',
    );

    expect(
      view.getByText(strings('predict.fee_summary.exchange_fee')),
    ).toBeOnTheScreen();
    expect(
      view.getByText(strings('predict.fee_summary.exchange_fee_description')),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_EXCHANGE_FEE)).toBe(
      '$0.41',
    );

    expect(
      view.getByText(strings('predict.fee_summary.total')),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_TOTAL)).toBe('$19.89');
    expect(
      view.getByTestId(PredictOrderFlowTestIds.DETAILS_PARTIAL_FILL_NOTE),
    ).toHaveTextContent(strings('predict.fee_summary.fak_partial_fill_note'));
  });

  it('falls back to a single Fees row when feeBreakdown is empty', () => {
    const view = render(
      <OrderDetailsRows
        preview={{
          ...basePreview,
          feeBreakdown: [],
        }}
      />,
    );

    expect(
      view.getByText(strings('predict_next.order_preview.fees')),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_FEES)).toBe('$0.82');
    expect(
      view.queryByTestId(PredictOrderFlowTestIds.DETAILS_METAMASK_FEE),
    ).toBeNull();
    expect(
      view.queryByTestId(PredictOrderFlowTestIds.DETAILS_EXCHANGE_FEE),
    ).toBeNull();
  });

  it('renders only present fee sources when feeBreakdown carries a single component', () => {
    const view = render(
      <OrderDetailsRows
        preview={{
          ...basePreview,
          fee: '0.41' as PredictAmount,
          feeBreakdown: [{ source: 'venue', amount: '0.41' as PredictAmount }],
        }}
      />,
    );

    expect(
      view.queryByTestId(PredictOrderFlowTestIds.DETAILS_METAMASK_FEE),
    ).toBeNull();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_EXCHANGE_FEE)).toBe(
      '$0.41',
    );
    expect(view.queryByTestId(PredictOrderFlowTestIds.DETAILS_FEES)).toBeNull();
  });

  it('renders a Cash Out with gross Proceeds as the order and Net Proceeds as the Total', () => {
    const sellPreview = {
      action: 'sell',
      requestedContracts: 75,
      estimatedContracts: 70,
      averagePrice: '0.4800',
      limitPrice: '0.4000',
      fee: '0.34',
      feeBreakdown: [
        { source: 'venue', amount: '0.17' },
        { source: 'metamask', amount: '0.17' },
      ],
      estimatedProceeds: '33.60',
      estimatedNetProceeds: '33.26',
    } as unknown as PredictSellOrderPreview;

    const view = render(<OrderDetailsRows preview={sellPreview} />);

    expect(
      view.getByText(
        '~70 contracts at 48¢ each. Final amount may vary based on order book availability.',
      ),
    ).toBeOnTheScreen();
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_ORDER_AMOUNT)).toBe(
      '$33.60',
    );
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_METAMASK_FEE)).toBe(
      '$0.17',
    );
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_EXCHANGE_FEE)).toBe(
      '$0.17',
    );
    expect(textOf(view, PredictOrderFlowTestIds.DETAILS_TOTAL)).toBe('$33.26');
    expect(
      view.getByTestId(PredictOrderFlowTestIds.DETAILS_PARTIAL_FILL_NOTE),
    ).toBeOnTheScreen();
  });
});
