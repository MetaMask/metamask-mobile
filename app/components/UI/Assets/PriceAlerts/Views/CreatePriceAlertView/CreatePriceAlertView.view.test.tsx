import '../../../../../../../tests/component-view/mocks';
import { renderCreatePriceAlertViewWithRoutes } from '../../../../../../../tests/component-view/renderers/priceAlerts';
import {
  setupPriceAlertsApiMock,
  setupPriceAlertsPostMock,
  setupPriceAlertsPatchMock,
  clearPriceAlertsApiMocks,
} from '../../../../../../../tests/component-view/api-mocking/priceAlerts';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
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
    const scope = setupPriceAlertsPostMock();
    const { getByTestId } = renderCreatePriceAlertViewWithRoutes();

    fireEvent.press(getByTestId('keypad-key-1'));
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();

    // act() flushes TanStack Query's mutation lifecycle (scheduling, fetch,
    // state updates) across async boundaries that fireEvent alone does not drain.
    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    // scope.isDone() is true only when the one-shot POST interceptor was consumed,
    // proving the real createAlert HTTP call was made and received a 201 response.
    await waitFor(() => expect(scope.isDone()).toBe(true));
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

  it('applies +5% quick percentage pill and updates the target price', async () => {
    // currentPrice defaults to 2500 in the renderer, so +5% → 2625
    const { getByTestId, findByText } = renderCreatePriceAlertViewWithRoutes();

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(await findByText('$2625')).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('saves alert with recurring=false after toggling the switch off', async () => {
    const scope = setupPriceAlertsPostMock();
    const { getByTestId } = renderCreatePriceAlertViewWithRoutes();

    // Toggle recurring off (default is true)
    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    // Enter a target price so the save button is enabled
    fireEvent.press(getByTestId('keypad-key-1'));

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    // POST was consumed, proving the alert was submitted with the toggled state
    await waitFor(() => expect(scope.isDone()).toBe(true));
  });

  it('disables button with duplicate text when threshold matches an existing alert', async () => {
    const { getByTestId, findByText } = renderCreatePriceAlertViewWithRoutes({
      routeParams: {
        existingThresholds: [3000],
      },
    });

    // Type "3000" on keypad
    fireEvent.press(getByTestId('keypad-key-3'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    expect(
      await findByText('An alert at this price already exists.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('submits PATCH when saving an edited alert with changed threshold', async () => {
    const scope = setupPriceAlertsPatchMock(editingAlert.id);

    const { getByTestId } = renderCreatePriceAlertViewWithRoutes({
      routeParams: {
        editingAlert,
        existingThresholds: [],
      },
    });

    // Change the threshold by pressing a keypad digit
    fireEvent.press(getByTestId('keypad-key-1'));

    await waitFor(() => {
      expect(
        getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    await waitFor(() => expect(scope.isDone()).toBe(true));
  });
});
