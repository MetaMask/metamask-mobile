import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import PerpsOrderSizeBottomSheet from './PerpsOrderSizeBottomSheet';
import { PerpsOrderSizeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import Engine from '../../../../../core/Engine';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../Base/Keypad', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return function Keypad({
    onChange,
    value,
  }: {
    onChange: (payload: { value: string; valueAsNumber: number }) => void;
    value: string;
  }) {
    return (
      <View testID="mock-keypad">
        <Pressable
          testID="mock-keypad-set-size"
          onPress={() => onChange({ value: '2', valueAsNumber: 2 })}
        >
          <Text>Set 2</Text>
        </Pressable>
        <Pressable
          testID="mock-keypad-set-huge-size"
          onPress={() =>
            onChange({ value: '555555555', valueAsNumber: 555555555 })
          }
        >
          <Text>Set huge</Text>
        </Pressable>
        <Text>{value}</Text>
      </View>
    );
  };
});

jest.mock('../../hooks/useMinimumOrderAmount', () => ({
  useMinimumOrderAmount: () => ({
    minimumOrderAmount: 10,
    isLoading: false,
    error: null,
  }),
}));

let mockAvailableToTradeUsd = '1000';
let mockAvailableToTradePending = false;
let mockAvailableToTradeFails = false;
let mockAccountSpendableBalance: string | null = null;

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: ({ enabled }: { enabled?: boolean }) => ({
    account:
      enabled && mockAccountSpendableBalance !== null
        ? { spendableBalance: mockAccountSpendableBalance }
        : null,
    isInitialLoading: false,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToAvailableToTrade: jest.fn(
        (params: {
          symbol: string;
          callback: (update: {
            providerId: 'hyperliquid';
            symbol: string;
            long: string;
            short: string;
          }) => void;
          onError?: (error: Error) => void;
        }) => {
          if (mockAvailableToTradeFails) {
            params.onError?.(new Error('stream failed'));
          } else if (!mockAvailableToTradePending) {
            params.callback({
              providerId: 'hyperliquid',
              symbol: params.symbol,
              long: mockAvailableToTradeUsd,
              short: mockAvailableToTradeUsd,
            });
          }
          return jest.fn();
        },
      ),
    },
  },
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

describe('PerpsOrderSizeBottomSheet', () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAvailableToTradeUsd = '1000';
    mockAvailableToTradePending = false;
    mockAvailableToTradeFails = false;
    mockAccountSpendableBalance = null;
  });

  it('renders and confirms a new size', () => {
    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="SOL"
        orderSize="1"
        limitPrice="160"
        szDecimals={3}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-size'));
    fireEvent.press(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(onConfirm).toHaveBeenCalledWith('2');
  });

  it('returns null when not visible', () => {
    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible={false}
        asset="SOL"
        orderSize="1"
        limitPrice="160"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.queryByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.SIZE_DISPLAY),
    ).not.toBeOnTheScreen();
  });

  it('formats large sizes with thousand separators', () => {
    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205020"
        limitPrice="0.04888"
        szDecimals={2}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByDisplayValue('205,020')).toBeOnTheScreen();
  });

  it('shows a single dollar sign in the minimum size error', () => {
    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="SOL"
        orderSize="0.001"
        limitPrice="1"
        szDecimals={3}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Minimum order size is $10')).toBeOnTheScreen();
  });

  it('warns and disables Set when a size increase needs more margin than is available', () => {
    mockAvailableToTradeUsd = '0.51';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));

    expect(
      screen.getByText(/Insufficient balance\. Required:/),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('does not warn when decreasing size even with a low available balance', () => {
    mockAvailableToTradeUsd = '0.51';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="SOL"
        orderSize="10"
        limitPrice="160"
        szDecimals={3}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-size'));

    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).not.toBeDisabled();
  });

  it('skips the margin check for reduce-only orders', () => {
    mockAvailableToTradeUsd = '0.51';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        reduceOnly
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));

    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).not.toBeDisabled();
  });

  it('does not warn when the size is comfortably within available margin', () => {
    mockAvailableToTradeUsd = '1000';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="SOL"
        orderSize="1"
        limitPrice="160"
        szDecimals={3}
        leverage={3}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).not.toBeDisabled();
  });

  it('holds keypad and confirm while market data is loading', () => {
    mockAvailableToTradeUsd = '0.51';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="555555555"
        limitPrice="0.04888"
        szDecimals={6}
        leverage={3}
        isMarketDataReady={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByTestId('mock-keypad')).not.toBeOnTheScreen();
    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('holds keypad and confirm while available to trade is still loading', () => {
    mockAvailableToTradePending = true;

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="555555555"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByTestId('mock-keypad')).not.toBeOnTheScreen();
    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('warns and disables Set when spendable balance is zero on a size increase', () => {
    mockAvailableToTradeUsd = '0';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));

    expect(
      screen.getByText(/Insufficient balance\. Required:/),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('uses effective leverage so lower leverage can block a size increase max leverage would allow', () => {
    // additional notional for huge size ≈ 555555555 * 0.04888
    // at 40x: margin ≈ 678k; at 3x: margin ≈ 9.05M
    // spendable 700k clears 40x but not 3x
    mockAvailableToTradeUsd = '700000';

    const { rerender } = render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));
    expect(
      screen.queryByText(/Insufficient balance\. Required:/),
    ).not.toBeOnTheScreen();

    // Keep resting orderSize prop at 205 so current notional stays the original
    // order; only effective leverage changes.
    rerender(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={3}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(/Insufficient balance\. Required:/),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('falls back to the account spendable balance when the available-to-trade stream fails', () => {
    mockAvailableToTradeFails = true;
    mockAccountSpendableBalance = '1000';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="SOL"
        orderSize="1"
        limitPrice="160"
        szDecimals={3}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-size'));
    fireEvent.press(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(onConfirm).toHaveBeenCalledWith('2');
  });

  it('checks margin against the account spendable balance when the available-to-trade stream fails', () => {
    mockAvailableToTradeFails = true;
    mockAccountSpendableBalance = '0.51';

    render(
      <PerpsOrderSizeBottomSheet
        direction="long"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));

    expect(
      screen.getByText(/Insufficient balance\. Required:/),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('checks the short figure for a short order', () => {
    mockAvailableToTradeUsd = '1000';
    jest
      .mocked(Engine.context.PerpsController.subscribeToAvailableToTrade)
      .mockImplementationOnce((params) => {
        params.callback({
          providerId: 'hyperliquid',
          symbol: params.symbol,
          long: '1000',
          short: '0.51',
        });
        return jest.fn();
      });

    render(
      <PerpsOrderSizeBottomSheet
        direction="short"
        isVisible
        asset="CASHCAT"
        orderSize="205"
        limitPrice="0.04888"
        szDecimals={2}
        leverage={40}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByTestId('mock-keypad-set-huge-size'));

    expect(
      screen.getByText(/Insufficient balance\. Required:/),
    ).toBeOnTheScreen();
  });
});
