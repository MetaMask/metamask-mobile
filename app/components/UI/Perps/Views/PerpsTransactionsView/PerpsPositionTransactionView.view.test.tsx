/**
 * Component view tests for PerpsPositionTransactionView.
 * The transaction arrives as a route param, as it does from the Activity list.
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  FillType,
  type PerpsTransaction,
} from '../../types/transactionHistory';
import PerpsPositionTransactionView from './PerpsPositionTransactionView';

const closedLong = (fee: string): PerpsTransaction => ({
  id: 'trade-123',
  type: 'trade',
  category: 'position_close',
  title: 'Closed long',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$145.75',
    amountNumber: 145.75,
    isPositive: true,
    size: '1.5',
    entryPrice: '2000',
    points: '0',
    pnl: '150.75',
    fee,
    feeToken: 'USDC',
    action: 'Closed',
    fillType: FillType.Standard,
  },
});

const renderDetails = (fee: string) =>
  renderPerpsView(
    PerpsPositionTransactionView,
    Routes.PERPS.POSITION_TRANSACTION,
    { initialParams: { transaction: closedLong(fee) } },
  );

const MISSING_TRANSLATION = /\[missing ".*" translation\]/;

describe('PerpsPositionTransactionView', () => {
  const feesLabel = strings('perps.transactions.position.fees');
  const sizeLabel = strings('perps.transactions.position.size');

  it('shows the fees row for a known fee', async () => {
    renderDetails('5');

    // A missing key renders its fallback, which would also match a lookup.
    expect(feesLabel).not.toMatch(MISSING_TRANSLATION);
    expect(await screen.findByText(feesLabel)).toBeOnTheScreen();
    expect(screen.getByText('$5')).toBeOnTheScreen();
    expect(screen.queryByText(MISSING_TRANSLATION)).not.toBeOnTheScreen();
  });

  it('leaves out the fees row when the order fee is unknown', async () => {
    // A grouped order with a fill missing its fee carries an empty fee.
    renderDetails('');

    // A missing key renders its fallback, which would also match a lookup.
    expect(feesLabel).not.toMatch(MISSING_TRANSLATION);
    expect(sizeLabel).not.toMatch(MISSING_TRANSLATION);
    expect(await screen.findByText(sizeLabel)).toBeOnTheScreen();
    expect(screen.queryByText(feesLabel)).not.toBeOnTheScreen();
    expect(screen.queryByText('$0')).not.toBeOnTheScreen();
    expect(screen.queryByText(MISSING_TRANSLATION)).not.toBeOnTheScreen();
  });
});
