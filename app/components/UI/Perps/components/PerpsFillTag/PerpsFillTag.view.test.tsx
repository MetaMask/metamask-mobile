/**
 * Component view tests for PerpsFillTag.
 * Tests different fill types render the correct tag label (or nothing for Standard).
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsFillTag.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsComponent } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import PerpsFillTag from './PerpsFillTag';
import {
  FillType,
  type PerpsTransaction,
} from '../../types/transactionHistory';

const baseTransaction: PerpsTransaction = {
  id: 'tx_1',
  type: 'trade',
  category: 'position_close',
  title: 'Closed long',
  subtitle: '2.5 ETH',
  timestamp: Date.now(),
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$100',
    amountNumber: 100,
    isPositive: true,
    size: '2.5',
    entryPrice: '2000',
    points: '10',
    pnl: '+$100',
    fee: '$1',
    action: 'close',
    feeToken: 'USDC',
    fillType: FillType.Standard,
  },
};

const renderFillTag = (
  fillType: FillType,
  extra: Record<string, unknown> = {},
) =>
  renderPerpsComponent(
    PerpsFillTag as unknown as React.ComponentType<Record<string, unknown>>,
    {
      transaction: {
        ...baseTransaction,
        fill: { ...baseTransaction.fill, fillType, ...extra },
      },
    },
  );

describe('PerpsFillTag', () => {
  it('renders nothing for Standard fill type', () => {
    renderFillTag(FillType.Standard);

    expect(
      screen.queryByText(strings('perps.transactions.order.take_profit')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.transactions.order.stop_loss')),
    ).not.toBeOnTheScreen();
  });

  it('renders "Take profit" tag for TakeProfit fill type', async () => {
    renderFillTag(FillType.TakeProfit);

    expect(
      await screen.findByText(strings('perps.transactions.order.take_profit')),
    ).toBeOnTheScreen();
  });

  it('renders "Stop loss" tag for StopLoss fill type', async () => {
    renderFillTag(FillType.StopLoss);

    expect(
      await screen.findByText(strings('perps.transactions.order.stop_loss')),
    ).toBeOnTheScreen();
  });

  it('renders "Auto-deleveraging" tag for ADL fill type', async () => {
    renderFillTag(FillType.AutoDeleveraging);

    expect(
      await screen.findByText(
        strings('perps.transactions.order.auto_deleveraging'),
      ),
    ).toBeOnTheScreen();
  });
});
