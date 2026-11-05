import '../../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import {
  renderPayWithBottomSheetView,
  restorePredictFundingEngine,
  switchPredictVenue,
} from '../../../../../../../tests/component-view/renderers/predictFunding';
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';

describeForPlatforms('PayWithBottomSheet Predict source gate', () => {
  afterEach(() => {
    restorePredictFundingEngine();
  });

  it('offers the Predict balance and Add while Polymarket is active', async () => {
    const { findByTestId, getByText } = renderPayWithBottomSheetView({
      venue: 'polymarket',
    });

    expect(
      await findByTestId(PayWithBottomSheetIDs.PREDICT_SECTION),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW),
    ).toBeOnTheScreen();
    expect(getByText('Add')).toBeOnTheScreen();
  });

  it('opens the Predict add-funds sheet from Add while Polymarket is active', async () => {
    const { findByTestId, getByText } = renderPayWithBottomSheetView({
      venue: 'polymarket',
    });
    await findByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW);

    fireEvent.press(getByText('Add'));

    expect(
      await findByTestId(`route-${Routes.PREDICT.MODALS.ROOT}`),
    ).toBeOnTheScreen();
  });

  it('does not render the Predict source while Kalshi is active', async () => {
    const { findByTestId, queryByTestId } = renderPayWithBottomSheetView({
      venue: 'kalshi',
    });

    expect(
      await findByTestId(PayWithBottomSheetIDs.BOTTOM_SHEET),
    ).toBeOnTheScreen();
    expect(queryByTestId(PayWithBottomSheetIDs.PREDICT_SECTION)).toBeNull();
    expect(queryByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW)).toBeNull();
  });

  it('removes the Predict source when the Active Venue moves to Kalshi', async () => {
    const view = renderPayWithBottomSheetView({ venue: 'polymarket' });
    expect(
      await view.findByTestId(PayWithBottomSheetIDs.PREDICT_SECTION),
    ).toBeOnTheScreen();

    await switchPredictVenue(view, 'kalshi');

    expect(
      view.queryByTestId(PayWithBottomSheetIDs.PREDICT_SECTION),
    ).toBeNull();
  });
});
