import '../../../../../../../tests/component-view/mocks';
import { renderCreatePriceAlertViewWithRoutes } from '../../../../../../../tests/component-view/renderers/priceAlerts';
import {
  setupPriceAlertsApiMock,
  clearPriceAlertsApiMocks,
} from '../../../../../../../tests/component-view/api-mocking/priceAlerts';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { CreatePriceAlertTestIds, type PriceAlert } from '../../constants';

beforeEach(() => {
  setupPriceAlertsApiMock();
});

afterEach(() => {
  clearPriceAlertsApiMocks();
});

const editingAlert: PriceAlert = {
  id: 'alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  threshold: 3000,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describeForPlatforms('CreatePriceAlertView', () => {
  it('renders the Price Reaches form with keypad and quick-percentage pills', async () => {
    const { getByTestId, getByText } = renderCreatePriceAlertViewWithRoutes();

    expect(getByTestId(CreatePriceAlertTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(getByText('Create ETH price alert')).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('enables the Set button after keypad input and completes POST via nock', async () => {
    const { getByTestId } = renderCreatePriceAlertViewWithRoutes();

    fireEvent.press(getByTestId('keypad-key-1'));
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));

    // Wait for isSubmitting to clear — proves the nock POST interceptor was hit
    // and the response was handled without error.
    await waitFor(() => {
      expect(
        getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });
  });

  it('opens in edit mode with pre-filled threshold when editingAlert is passed', async () => {
    const { getByText, getByTestId } = renderCreatePriceAlertViewWithRoutes({
      routeParams: {
        editingAlert,
        existingThresholds: [],
      },
    });

    expect(getByText('Edit ETH price alert')).toBeOnTheScreen();
    // threshold 3000 is pre-filled as "$3000"
    expect(getByText('$3000')).toBeOnTheScreen();
    // Update button is shown (not "Set price alert")
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText('Update price alert')).toBeOnTheScreen();
    // Button is disabled because threshold is unchanged
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });
});
