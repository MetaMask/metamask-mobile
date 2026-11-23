import '../../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import {
  renderPayWithBottomSheetView,
  restorePredictFundingEngine,
  switchPredictVenue,
} from '../../../../../../../tests/component-view/renderers/predictFunding';
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';

const ADD_LABEL = strings('confirm.pay_with_bottom_sheet.add');

// The Predict section renders in the same pass as the sheet (no async load
// gates it), so once the sheet is on screen an absent section is final.

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
    expect(getByText(ADD_LABEL)).toBeOnTheScreen();
  });

  it('opens the Predict add-funds sheet from Add while Polymarket is active', async () => {
    const { findByTestId, getByText } = renderPayWithBottomSheetView({
      venue: 'polymarket',
    });
    await findByTestId(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW);

    fireEvent.press(getByText(ADD_LABEL));

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

  it('does not render the Predict source while Predict trading is off on Polymarket', async () => {
    const { findByTestId, queryByTestId } = renderPayWithBottomSheetView({
      venue: 'polymarket',
      predictTradingEnabled: false,
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
      view.getByTestId(PayWithBottomSheetIDs.BOTTOM_SHEET),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PayWithBottomSheetIDs.PREDICT_SECTION),
    ).toBeNull();
  });
});
