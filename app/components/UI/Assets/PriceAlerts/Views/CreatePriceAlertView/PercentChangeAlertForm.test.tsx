import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';
import { type SaveAlertFlowParams } from '../../hooks/useAlertSaveFlow';
import PercentChangeAlertForm from './PercentChangeAlertForm';

const mockSubmitPercent = jest.fn();
const mockSaveAlert = jest.fn(async ({ submit }: SaveAlertFlowParams) => {
  await submit();
});
const mockUseSubmitPercentAlert = jest.fn((_editingAlert?: unknown) => ({
  submit: mockSubmitPercent,
  isSubmitting: false,
}));

jest.mock('../../api', () => ({
  useSubmitPercentAlert: (editingAlert?: unknown) =>
    mockUseSubmitPercentAlert(editingAlert),
}));

const baseProps: React.ComponentProps<typeof PercentChangeAlertForm> = {
  assetId: 'eip155:1/slip44:60',
  saveAlert: mockSaveAlert,
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
) => render(<PercentChangeAlertForm {...baseProps} {...overrides} />);

describe('PercentChangeAlertForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitPercent.mockResolvedValue(undefined);
    mockSaveAlert.mockImplementation(
      async ({ submit }: SaveAlertFlowParams) => {
        await submit();
      },
    );
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
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
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

  it('disables saving when a down alert exceeds 100%', () => {
    const screen = renderForm();
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );
    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent.press(screen.getByTestId('keypad-key-1'));

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toHaveTextContent("Price can't fall by more than 100%.");
  });

  it('allows saving an up alert above 100%', async () => {
    const screen = renderForm();
    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent.press(screen.getByTestId('keypad-key-1'));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockSubmitPercent).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 101,
        direction: 'up',
      }),
    );
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

  it('prepopulates edit values and disables save until something changes', () => {
    const screen = renderForm({
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toHaveTextContent('10.5%');
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).not.toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    ).not.toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('updates a percent alert after period, direction, and recurrence change', async () => {
    const screen = renderForm({
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    );
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
      period: '24h',
      direction: 'up',
      recurring: false,
    });
  });

  it('passes percent-specific properties to saveAlert after creation', async () => {
    const screen = renderForm();
    fireEvent.press(screen.getByTestId('keypad-key-5'));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockSaveAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsProperties: expect.objectContaining({
          alert_type: 'percent',
          alert_period: '24h',
          alert_direction: 'up',
          alert_value: 5,
          alert_recurring: true,
        }),
      }),
    );
  });
});
