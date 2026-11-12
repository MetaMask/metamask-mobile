import React from 'react';
import { render } from '@testing-library/react-native';

import { strings } from '../../../../../../../locales/i18n';
import type { InvariantDisplay } from '../../../auth/signing/profileTemplates';
import type { PredictOrderPreview } from '../../../types';
import { OrderPreviewRows } from './OrderPreviewRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Only the fields the rows read. The server's quote and the signed bound
 * differ on purpose, so a test can tell which one a row shows. */
const buy = {
  action: 'buy',
  estimatedContracts: 10,
  averagePrice: '0.4500',
  potentialPayout: '10.00',
  potentialProfit: '5.50',
  fee: '0.10',
  feeBreakdown: [],
  totalDebit: '4.60',
} as unknown as PredictOrderPreview;

const sell = {
  action: 'sell',
  estimatedContracts: 10,
  averagePrice: '0.4500',
  limitPrice: '0.4000',
  estimatedProceeds: '4.00',
  fee: '0.10',
  feeBreakdown: [],
  estimatedNetProceeds: '3.90',
} as unknown as PredictOrderPreview;

const display: InvariantDisplay = {
  maxCost: '4.80',
  contracts: '10.00',
  payout: '10.00',
  minProceeds: '3.70',
};

const textOf = (
  view: ReturnType<typeof render>,
  testID: string,
): string | undefined => {
  const node = view.queryByTestId(testID);
  return node ? [node.props.children].flat().join('') : undefined;
};

describe('OrderPreviewRows', () => {
  it('shows the signed maximum cost, and profit measured against it, for a buy', () => {
    const view = render(<OrderPreviewRows preview={buy} display={display} />);

    expect(textOf(view, PredictOrderFlowTestIds.TOTAL_DEBIT)).toBe('$4.80');
    expect(textOf(view, PredictOrderFlowTestIds.POTENTIAL_PROFIT)).toBe(
      '$5.20',
    );
    expect(
      view.getByText(strings('predict_next.order_preview.max_cost')),
    ).toBeTruthy();
    expect(
      view.queryByText(strings('predict_next.order_preview.total_debit')),
    ).toBeNull();
    expect(
      view.queryByText(
        strings('predict_next.order_preview.partial_fill_proceeds_description'),
      ),
    ).toBeNull();
  });

  it('shows the signed full-fill sell total with partial and no-fill conditions', () => {
    const view = render(<OrderPreviewRows preview={sell} display={display} />);

    expect(textOf(view, PredictOrderFlowTestIds.NET_PROCEEDS)).toBe('$3.70');
    expect(
      view.getByText(
        strings('predict_next.order_preview.proceeds_if_fully_filled'),
      ),
    ).toBeTruthy();
    expect(
      view.getByText(
        strings('predict_next.order_preview.partial_fill_proceeds_description'),
      ),
    ).toBeTruthy();
    expect(
      view.queryByText(strings('predict_next.order_preview.net_proceeds')),
    ).toBeNull();
  });

  it("falls back to the server's totals when there is no signed bound", () => {
    const buyView = render(<OrderPreviewRows preview={buy} />);
    expect(textOf(buyView, PredictOrderFlowTestIds.TOTAL_DEBIT)).toBe('$4.60');
    expect(
      buyView.getByText(strings('predict_next.order_preview.total_debit')),
    ).toBeTruthy();

    const sellView = render(<OrderPreviewRows preview={sell} />);
    expect(textOf(sellView, PredictOrderFlowTestIds.NET_PROCEEDS)).toBe(
      '$3.90',
    );
    expect(
      sellView.queryByText(
        strings('predict_next.order_preview.proceeds_if_fully_filled'),
      ),
    ).toBeNull();
    expect(
      sellView.queryByText(
        strings('predict_next.order_preview.partial_fill_proceeds_description'),
      ),
    ).toBeNull();
  });

  it('shows a negative profit when the signed cost exceeds the payout', () => {
    const view = render(
      <OrderPreviewRows
        preview={buy}
        display={{ ...display, maxCost: '10.50' }}
      />,
    );

    expect(textOf(view, PredictOrderFlowTestIds.POTENTIAL_PROFIT)).toBe(
      '-$0.50',
    );
  });
});
