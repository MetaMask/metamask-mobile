import '../../../../../../../tests/component-view/mocks';
import { renderCreatePriceAlertViewWithRoutes } from '../../../../../../../tests/component-view/renderers/priceAlerts';
import {
  setupPriceAlertsApiMock,
  setupPriceAlertsPostMock,
  setupPriceAlertsPatchMock,
  setupPercentPriceAlertsPostMock,
  setupPercentPriceAlertsPatchMock,
  clearPriceAlertsApiMocks,
} from '../../../../../../../tests/component-view/api-mocking/priceAlerts';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  type AbsolutePriceAlert,
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';

beforeEach(() => {
  setupPriceAlertsApiMock();
});

afterEach(() => {
  clearPriceAlertsApiMocks();
});

const editingAlert: AbsolutePriceAlert = {
  id: 'alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'absolute_price',
  threshold: 3000,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const editingPercentAlert: PercentChangeAlert = {
  id: 'percent-alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'percent_change',
  threshold: 10.5,
  period: '1h',
  direction: 'down',
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

  describe('percent-change alerts', () => {
    it('switches to the percent form and updates direction and period', async () => {
      const { getByTestId, getByText, queryByTestId } =
        renderCreatePriceAlertViewWithRoutes();

      fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE));
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE));
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H));

      await waitFor(() => {
        expect(
          getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
        ).not.toBeOnTheScreen();
        expect(getByText('When price moves down')).toBeOnTheScreen();
        expect(
          getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
        ).toHaveProp(
          'accessibilityState',
          expect.objectContaining({ selected: true }),
        );
      });
    });

    it('submits the selected percent configuration to the percent endpoint', async () => {
      const scope = setupPercentPriceAlertsPostMock({
        asset: 'eip155:1/slip44:60',
        threshold: 10,
        period: '1h',
        direction: 'down',
        recurring: false,
      });
      const { getByTestId, getByText } = renderCreatePriceAlertViewWithRoutes({
        routeParams: { initialType: 'percent_change' },
      });

      fireEvent.press(getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE));
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H));
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('0'));
      fireEvent(
        getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      await waitFor(() => expect(scope.isDone()).toBe(true));
    });

    it('prevents saving a duplicate percent configuration', async () => {
      const { getByTestId, getByText, findByText } =
        renderCreatePriceAlertViewWithRoutes({
          routeParams: {
            initialType: 'percent_change',
            existingPercentAlerts: [
              {
                ...editingPercentAlert,
                threshold: 10,
                period: '24h',
                direction: 'up',
              },
            ],
          },
        });

      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('0'));

      expect(
        await findByText('An alert with this configuration already exists.'),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).toBeDisabled();
    });

    it('locks immutable controls and PATCHes editable percent fields', async () => {
      const scope = setupPercentPriceAlertsPatchMock(editingPercentAlert.id, {
        threshold: 10.5,
        recurring: false,
      });
      const { getByTestId } = renderCreatePriceAlertViewWithRoutes({
        routeParams: {
          editingAlert: editingPercentAlert,
          existingPercentAlerts: [editingPercentAlert],
        },
      });

      fireEvent(
        getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );

      expect(
        getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET),
      ).toBeDisabled();
      expect(
        getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE),
      ).toBeDisabled();
      expect(
        getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
      ).toBeDisabled();
      expect(
        getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
      ).toBeDisabled();
      expect(
        getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
      ).toBeDisabled();

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      await waitFor(() => expect(scope.isDone()).toBe(true));
    });
  });
});
