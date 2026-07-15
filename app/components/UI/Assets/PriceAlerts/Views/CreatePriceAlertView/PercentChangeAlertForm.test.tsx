import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';
import PercentChangeAlertForm from './PercentChangeAlertForm';

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockSubmitPercent = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockSetQueryData = jest.fn();
const mockUseSubmitPercentAlert = jest.fn((_editingAlert?: unknown) => ({
  submit: mockSubmitPercent,
  isSubmitting: false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, pop: mockPop }),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../../api', () => ({
  priceAlertsQueryKey: (assetId: string) => ['priceAlerts', assetId],
  useSubmitPercentAlert: (editingAlert?: unknown) =>
    mockUseSubmitPercentAlert(editingAlert),
}));

function WithToast({ children }: { children: React.ReactNode }) {
  const ref = React.useRef({
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  });
  return (
    <ToastContext.Provider value={{ toastRef: ref }}>
      {children}
    </ToastContext.Provider>
  );
}

const baseProps: React.ComponentProps<typeof PercentChangeAlertForm> = {
  assetId: 'eip155:1/slip44:60',
  displayTicker: 'ETH',
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

const renderForm = (
  overrides: Partial<React.ComponentProps<typeof PercentChangeAlertForm>> = {},
) =>
  render(
    <WithToast>
      <PercentChangeAlertForm {...baseProps} {...overrides} />
    </WithToast>,
  );

describe('PercentChangeAlertForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitPercent.mockResolvedValue(undefined);
    mockUseSubmitPercentAlert.mockImplementation(() => ({
      submit: mockSubmitPercent,
      isSubmitting: false,
    }));
  });

  it('renders percent-change controls', () => {
    const screen = renderForm();

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).not.toBeOnTheScreen();
  });

  it('submits selected threshold, period, direction, and recurrence', async () => {
    const screen = renderForm();
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );
    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockSubmitPercent).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      threshold: 10,
      period: '1h',
      direction: 'down',
      recurring: false,
    });
  });

  it('disables saving when the tuple matches another alert', () => {
    const screen = renderForm({
      existingPercentAlerts: [
        {
          ...editingPercentAlert,
          threshold: 10,
          period: '24h',
          direction: 'up',
        },
      ],
    });
    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toHaveTextContent('An alert with this configuration already exists.');
  });

  it('prepopulates edit values and locks immutable form controls', () => {
    const screen = renderForm({
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toHaveTextContent('10.5%');
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('updates a percent alert after recurrence changes', async () => {
    const screen = renderForm({
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });
    fireEvent(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockUseSubmitPercentAlert).toHaveBeenCalledWith(editingPercentAlert);
    expect(mockSubmitPercent).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      threshold: 10.5,
      period: '1h',
      direction: 'down',
      recurring: false,
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['priceAlerts', 'eip155:1/slip44:60'],
      expect.any(Function),
    );
  });

  it('tracks percent-specific properties after creation', async () => {
    const mockAnalytics = jest.mocked(useAnalytics)();
    const screen = renderForm();
    fireEvent.press(screen.getByTestId('keypad-key-5'));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    const interactionCallIndex = jest
      .mocked(mockAnalytics.createEventBuilder)
      .mock.calls.findIndex(
        ([event]) =>
          event === MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      );
    const interactionBuilder = jest.mocked(mockAnalytics.createEventBuilder)
      .mock.results[interactionCallIndex].value;
    expect(interactionBuilder.addProperties).toHaveBeenCalledWith({
      interaction_type: 'created',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'percent_change',
      period: '24h',
      direction: 'up',
      alert_value: 5,
      alert_recurring: true,
      alert_active: true,
    });
  });

  it('displays an error toast when percent submission rejects', async () => {
    mockSubmitPercent.mockRejectedValueOnce(new Error('HTTP 500'));
    const screen = renderForm();
    fireEvent.press(screen.getByTestId('keypad-key-5'));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: 'Failed to save price alert. Please try again.',
          }),
        ]),
      }),
    );
  });
});
