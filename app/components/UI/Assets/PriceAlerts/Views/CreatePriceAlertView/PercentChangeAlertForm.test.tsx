import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
} from '../../constants';
import { type SaveAlertFlowParams } from '../../hooks/useAlertSaveFlow';
import PercentChangeAlertForm from './PercentChangeAlertForm';

const mockSubmitPercent = jest.fn();
const mockSubmitPerpPercent = jest.fn();
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

jest.mock('../../perpApi', () => ({
  useSubmitPerpPercentAlert: jest.fn(() => ({
    submit: mockSubmitPerpPercent,
    isSubmitting: false,
  })),
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

const choosePeriod = (
  screen: ReturnType<typeof renderForm>,
  periodTestId: string,
) => {
  fireEvent.press(screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT));
  fireEvent.press(screen.getByTestId(periodTestId));
};

describe('PercentChangeAlertForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitPercent.mockResolvedValue(undefined);
    mockSubmitPerpPercent.mockResolvedValue(undefined);
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
      screen.getByText(strings('price_alerts.alert_period')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).not.toBeOnTheScreen();
  });

  it('shifts the percent amount row 12px to the right', () => {
    const screen = renderForm();

    expect(
      StyleSheet.flatten(
        screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT).props.style,
      ),
    ).toMatchObject({ transform: [{ translateX: 12 }] });
  });

  it('renders Increase inside the direction button', () => {
    const screen = renderForm();
    const caption = screen.getByText(
      strings('price_alerts.direction_increases'),
    );
    const toggle = screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE);
    const contains = (
      node: { children?: unknown[] },
      target: unknown,
    ): boolean => {
      if (node === target) return true;
      return (node.children ?? []).some(
        (child) =>
          typeof child === 'object' &&
          child !== null &&
          contains(child as { children?: unknown[] }, target),
      );
    };

    expect(contains(toggle, caption)).toBe(true);
  });

  it('keeps the percent sign gray until a number is entered', () => {
    const references = render(
      <>
        <Text color={TextColor.TextDefault}>default-reference</Text>
        <Text color={TextColor.TextAlternative}>alternative-reference</Text>
      </>,
    );
    const colorOf = (node: { props: { style?: unknown } }) =>
      StyleSheet.flatten(node.props.style)?.color;
    const defaultColor = colorOf(references.getByText('default-reference'));
    const alternativeColor = colorOf(
      references.getByText('alternative-reference'),
    );
    const screen = renderForm();

    expect(colorOf(screen.getByText('%'))).toBe(alternativeColor);

    fireEvent.press(screen.getByTestId('keypad-key-5'));

    expect(colorOf(screen.getByText('%'))).toBe(defaultColor);
  });

  it('colors Increase green and Decrease red', () => {
    const references = render(
      <>
        <Text color={TextColor.SuccessDefault}>success-reference</Text>
        <Text color={TextColor.ErrorDefault}>error-reference</Text>
      </>,
    );
    const colorOf = (node: { props: { style?: unknown } }) =>
      StyleSheet.flatten(node.props.style)?.color;
    const successColor = colorOf(references.getByText('success-reference'));
    const errorColor = colorOf(references.getByText('error-reference'));
    const screen = renderForm();

    expect(
      colorOf(screen.getByText(strings('price_alerts.direction_increases'))),
    ).toBe(successColor);

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );

    expect(
      colorOf(screen.getByText(strings('price_alerts.direction_decreases'))),
    ).toBe(errorColor);
  });

  it('places the alert period row above the recurring toggle', () => {
    const screen = renderForm();
    const contains = (
      node: { children?: unknown[] },
      target: unknown,
    ): boolean => {
      if (node === target) return true;
      return (node.children ?? []).some(
        (child) =>
          typeof child === 'object' &&
          child !== null &&
          contains(child as { children?: unknown[] }, target),
      );
    };

    let periodNode = screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT);
    const recurringNode = screen.getByTestId(
      CreatePriceAlertTestIds.RECURRING_TOGGLE,
    );

    while (periodNode.parent && !contains(periodNode.parent, recurringNode)) {
      periodNode = periodNode.parent;
    }

    const parent = periodNode.parent;
    expect(parent).toBeTruthy();
    const periodIndex = parent?.children.indexOf(periodNode) ?? -1;
    let recurringSibling = recurringNode;
    while (recurringSibling.parent !== parent) {
      const next = recurringSibling.parent;
      if (!next) break;
      recurringSibling = next;
    }

    expect(periodIndex).toBeGreaterThanOrEqual(0);
    expect(parent?.children.indexOf(recurringSibling)).toBeGreaterThan(
      periodIndex,
    );
  });

  it('submits selected threshold, period, direction, and recurrence', async () => {
    const screen = renderForm();
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );
    choosePeriod(screen, CreatePriceAlertTestIds.PERIOD_SEGMENT_1H);
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

  it('groups thousands in the percent amount', () => {
    const screen = renderForm();

    fireEvent.press(screen.getByTestId('keypad-key-5'));
    fireEvent.press(screen.getByTestId('keypad-key-5'));
    fireEvent.press(screen.getByTestId('keypad-key-5'));
    fireEvent.press(screen.getByTestId('keypad-key-5'));

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toHaveTextContent('5,555%');
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
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT),
    ).toHaveTextContent(strings('price_alerts.period_1h'));
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT),
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
    choosePeriod(screen, CreatePriceAlertTestIds.PERIOD_SEGMENT_24H);
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

  it('submits a 5m perps percent alert with the market id', async () => {
    const screen = renderForm({
      marketId: 'btc-hyperliquid-mainnet',
    });
    choosePeriod(screen, CreatePriceAlertTestIds.PERIOD_SEGMENT_5M);
    fireEvent.press(screen.getByTestId('keypad-key-5'));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockSubmitPerpPercent).toHaveBeenCalledWith({
      marketId: 'btc-hyperliquid-mainnet',
      threshold: 5,
      period: '5m',
      direction: 'up',
      recurring: true,
    });
    expect(mockSubmitPercent).not.toHaveBeenCalled();
    expect(mockSaveAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsProperties: expect.objectContaining({
          alert_market_type: 'perps',
          alert_period: '5m',
        }),
      }),
    );
  });
});
