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
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { KeypadTestIds } from '../../../../../Base/Keypad/Keypad.testIds';
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
    // Form pre-fills currentPrice so the button is enabled on mount
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
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
    const { getByRole, getByText, getByTestId } =
      renderCreatePriceAlertViewWithRoutes({
        routeParams: {
          editingAlert,
          existingAbsoluteAlerts: [],
        },
      });

    expect(getByText('Edit ETH price alert')).toBeOnTheScreen();
    // threshold 3000 is pre-filled as "$3000"
    expect(getByRole('text', { name: '$3000' })).toBeOnTheScreen();
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
    const { findByRole, getByTestId } = renderCreatePriceAlertViewWithRoutes();

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(await findByRole('text', { name: '$2625' })).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('keeps a typed percent after the direction changes', async () => {
    const { findByText, getByTestId, getByText } =
      renderCreatePriceAlertViewWithRoutes({
        routeParams: { initialType: 'percent_change' },
      });
    const percentInput = () =>
      getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('0'));

    expect(
      await within(percentInput()).findByRole('text', { name: '10' }),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE));

    expect(
      await findByText(strings('price_alerts.moves_down')),
    ).toBeOnTheScreen();
    expect(
      await within(percentInput()).findByRole('text', { name: '10' }),
    ).toBeOnTheScreen();
  });

  it('shows a high-precision quick percentage and clears back to an empty amount', async () => {
    const { findByRole, getByRole, getByTestId, queryByRole } =
      renderCreatePriceAlertViewWithRoutes({
        routeParams: {
          assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
          currentPrice: 0.00000000000001,
          symbol: 'SHIB',
          ticker: 'SHIB',
        },
      });

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(
      await findByRole('text', { name: '$0.000000000000011' }),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.press(getByTestId(KeypadTestIds.DELETE_BUTTON));
    }

    expect(await findByRole('text', { name: '$' })).toBeOnTheScreen();
    expect(getByRole('text', { name: '$' })).toBeOnTheScreen();
    expect(
      queryByRole('text', { name: '$0.000000000000011' }),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('accepts manual keypad input beyond two decimals for a tiny price', async () => {
    const { findByRole, getByTestId } = renderCreatePriceAlertViewWithRoutes({
      routeParams: {
        assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
        currentPrice: 0.00001234,
        symbol: 'SHIB',
        ticker: 'SHIB',
      },
    });

    for (let index = 0; index < 20; index += 1) {
      fireEvent.press(getByTestId(KeypadTestIds.DELETE_BUTTON));
    }
    for (const key of [
      KeypadTestIds.KEY_0,
      KeypadTestIds.KEY_DOT,
      KeypadTestIds.KEY_0,
      KeypadTestIds.KEY_0,
      KeypadTestIds.KEY_0,
      KeypadTestIds.KEY_0,
      KeypadTestIds.KEY_1,
      KeypadTestIds.KEY_2,
      KeypadTestIds.KEY_3,
      KeypadTestIds.KEY_4,
      KeypadTestIds.KEY_5,
    ]) {
      fireEvent.press(getByTestId(key));
    }

    expect(
      await findByRole('text', { name: '$0.000012345' }),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('blocks a sixteenth decimal digit for a tiny price', async () => {
    const { findByRole, getByTestId } = renderCreatePriceAlertViewWithRoutes({
      routeParams: {
        assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
        currentPrice: 0.0000000001,
        symbol: 'SHIB',
        ticker: 'SHIB',
      },
    });

    for (let index = 0; index < 20; index += 1) {
      fireEvent.press(getByTestId(KeypadTestIds.DELETE_BUTTON));
    }
    fireEvent.press(getByTestId(KeypadTestIds.KEY_DOT));
    for (let index = 0; index < 15; index += 1) {
      fireEvent.press(getByTestId(KeypadTestIds.KEY_1));
    }
    fireEvent.press(getByTestId(KeypadTestIds.KEY_2));

    expect(
      await findByRole('text', { name: '$0.111111111111111' }),
    ).toBeOnTheScreen();
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
        existingAbsoluteAlerts: [
          {
            ...editingAlert,
            id: 'existing-alert',
            threshold: 3000,
          },
        ],
      },
    });

    // Clear the pre-filled currentPrice, then type "3000"
    for (let i = 0; i < 10; i++) {
      fireEvent.press(getByTestId('keypad-delete-button'));
    }
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
        existingAbsoluteAlerts: [],
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

    it('locks alert type and PATCHes updated percent fields including period and direction', async () => {
      const scope = setupPercentPriceAlertsPatchMock(editingPercentAlert.id, {
        threshold: 10.5,
        period: '24h',
        direction: 'up',
        recurring: false,
      });
      const { getByTestId } = renderCreatePriceAlertViewWithRoutes({
        routeParams: {
          editingAlert: editingPercentAlert,
          existingPercentAlerts: [editingPercentAlert],
        },
      });

      fireEvent.press(getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE));
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H));
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
      ).not.toBeDisabled();
      expect(
        getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
      ).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      await waitFor(() => expect(scope.isDone()).toBe(true));
    });
  });
});
