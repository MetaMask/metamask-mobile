import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  HeaderSubpage,
  SegmentedControl,
} from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS, type Position } from '@metamask/perps-controller';
import React from 'react';
import {
  PerpsAdjustMarginBottomSheetSelectorsIDs,
  PerpsTradeSheetSelectorsIDs,
} from '../../Perps.testIds';
import PerpsAdjustMarginBottomSheet from './PerpsAdjustMarginBottomSheet';

const mockGoBack = jest.fn();
const mockHandleAddMargin = jest.fn();
const mockHandleRemoveMargin = jest.fn();
const mockUsePerpsAdjustMarginData = jest.fn();
const mockTrack = jest.fn();
const mockUsePerpsEventTracking = jest.fn((_options?: unknown) => ({
  track: mockTrack,
}));
let mockMarginAdjustmentOptions:
  | {
      onSuccess?: () => void;
      onError?: (error: string) => void;
      onAmountChanged?: (maxAmount: number) => void;
    }
  | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../hooks/usePerpsMarginAdjustment', () => ({
  usePerpsMarginAdjustment: (options?: typeof mockMarginAdjustmentOptions) => {
    mockMarginAdjustmentOptions = options;
    return {
      handleAddMargin: mockHandleAddMargin,
      handleRemoveMargin: mockHandleRemoveMargin,
      isAdjusting: false,
    };
  },
}));

jest.mock('../../hooks/usePerpsAdjustMarginData', () => ({
  usePerpsAdjustMarginData: (params: unknown) =>
    mockUsePerpsAdjustMarginData(params),
}));

jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options?: unknown) =>
    mockUsePerpsEventTracking(options),
}));

jest.mock('../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  useHaptics: () => ({ playImpact: jest.fn() }),
  ImpactMoment: {
    PrimaryCTA: 'PrimaryCTA',
    SliderGrip: 'SliderGrip',
    SliderTick: 'SliderTick',
  },
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: (value: number) => `$${value.toFixed(2)}`,
  PRICE_RANGES_UNIVERSAL: {},
  PRICE_RANGES_MINIMAL_VIEW: {},
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../PerpsAmountDisplay', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return ({
    amount,
    accessibilityLabel,
    onPress,
  }: {
    amount: string;
    accessibilityLabel?: string;
    onPress?: () => void;
  }) =>
    ReactActual.createElement(
      Pressable,
      { testID: 'amount-display', accessibilityLabel, onPress },
      amount,
    );
});

jest.mock('../PerpsTradeBottomSheet/PerpsTradeNestedScreens', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  const { PerpsTradeSheetSelectorsIDs: selectors } = jest.requireActual(
    '../../Perps.testIds',
  );
  return {
    PerpsInlineInfoScreen: ({
      contentKey,
      onBack,
    }: {
      contentKey: string;
      onBack: () => void;
    }) =>
      ReactActual.createElement(
        Pressable,
        {
          testID: selectors.INFO_SCREEN,
          onPress: onBack,
        },
        contentKey,
      ),
  };
});

jest.mock('../../../../Base/Keypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ onChange }: { onChange: (value: { value: string }) => void }) =>
    ReactActual.createElement(View, { testID: 'keypad', onChange });
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Slider: ({
      testID,
      value,
      onValueChange,
      accessibilityLabel,
    }: {
      testID?: string;
      value?: number;
      onValueChange?: (value: number) => void;
      accessibilityLabel?: string;
    }) =>
      ReactActual.createElement(View, {
        testID,
        value,
        onValueChange,
        accessibilityLabel,
      }),
  };
});

const position: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { allTime: '10', sinceOpen: '5', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const createMarginData = (mode: 'add' | 'remove', inputAmount = 0) => ({
  position,
  isLoading: false,
  hasValidPositionData: true,
  currentMargin: 500,
  newMargin:
    mode === 'add' ? 500 + inputAmount : Math.max(0, 500 - inputAmount),
  positionValue: 5000,
  maxAmount: mode === 'add' ? 1000 : 200,
  currentLiquidationPrice: 1900,
  newLiquidationPrice: mode === 'add' ? 1800 : 1950,
  currentLiquidationDistance: 5,
  newLiquidationDistance: mode === 'add' ? 10 : 2.5,
  spendableBalance: 1000,
  currentPrice: 2000,
  isAddMode: mode === 'add',
  positionLeverage: 10,
});

describe('PerpsAdjustMarginBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarginAdjustmentOptions = undefined;
    mockHandleAddMargin.mockResolvedValue(undefined);
    mockHandleRemoveMargin.mockResolvedValue(undefined);
    mockUsePerpsAdjustMarginData.mockImplementation(
      ({
        mode,
        inputAmount,
      }: {
        mode: 'add' | 'remove';
        inputAmount: number;
      }) => createMarginData(mode, inputAmount),
    );
  });

  it('renders add mode in the bottom sheet', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toHaveTextContent('perps.adjust_margin.add_margin_sheet');
  });

  it('does not show the live price in the header', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(
      screen.UNSAFE_getByType(HeaderSubpage).props.description,
    ).toBeUndefined();
  });

  it('opens liquidation info inside the current sheet', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    fireEvent.press(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_PRICE_INFO,
      ),
    );

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_SCREEN),
    ).toHaveTextContent('liquidation_price');
    expect(
      screen.queryByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.MODE_TOGGLE,
      ),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_SCREEN),
    );

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.MODE_TOGGLE),
    ).toBeOnTheScreen();
  });

  it('labels the amount input for screen readers', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(screen.getByTestId('amount-display')).toHaveProp(
      'accessibilityLabel',
      'perps.adjust_margin.amount_accessibility_label, 0',
    );
  });

  it('labels the percentage slider for screen readers', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER),
    ).toHaveProp(
      'accessibilityLabel',
      'perps.adjust_margin.slider_accessibility_label',
    );
  });

  it('shows before and after values when the slider changes', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );
    const slider = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER,
    );

    act(() => {
      (
        slider.props as { onValueChange: (percentage: number) => void }
      ).onValueChange(50);
    });

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.MARGIN_VALUE),
    ).toHaveTextContent('$1000.00');
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
      ),
    ).toHaveTextContent('$1800.00');
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
      ),
    ).toHaveTextContent('10.00%');
  });

  it('shows fallback values when liquidation data is unavailable', () => {
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('add'),
      currentLiquidationPrice: 0,
      newLiquidationPrice: 0,
      currentLiquidationDistance: 0,
      newLiquidationDistance: 0,
    });

    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
      ),
    ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
      ),
    ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
  });

  it('supports quick amounts while the keypad is open', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    fireEvent.press(screen.getByTestId('amount-display'));
    fireEvent.press(screen.getByText('25%'));

    expect(screen.getByTestId('amount-display')).toHaveTextContent('250.00');

    fireEvent.press(screen.getByText('perps.deposit.done_button'));

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER),
    ).toBeOnTheScreen();
  });

  it('clamps keypad input to the removable margin', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    fireEvent.press(screen.getByTestId('amount-display'));
    act(() => {
      (
        screen.getByTestId('keypad').props as {
          onChange: (value: { value: string }) => void;
        }
      ).onChange({ value: '500' });
    });

    expect(screen.getByTestId('amount-display')).toHaveTextContent('200.00');
  });

  it('resets the amount and slider when the mode changes', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(50);
    });

    fireEvent.press(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.REMOVE_MODE_BUTTON,
      ),
    );

    expect(screen.getByTestId('amount-display')).toHaveTextContent('0');
    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER),
    ).toHaveProp('value', 0);
  });

  it('switches available amount and CTA to remove mode', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    fireEvent.press(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.REMOVE_MODE_BUTTON,
      ),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Perp UI Interaction' }),
      expect.objectContaining({
        interaction_type: 'remove_margin',
        asset: 'ETH',
      }),
    );
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.AVAILABLE_VALUE,
      ),
    ).toHaveTextContent('$200.00');
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toHaveTextContent('perps.adjust_margin.remove_margin_sheet');
  });

  it('ignores unsupported mode values', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      (
        screen.UNSAFE_getByType(SegmentedControl).props as {
          onChange: (mode: string) => void;
        }
      ).onChange('unsupported');
    });

    expect(mockUsePerpsAdjustMarginData).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'add' }),
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('submits add mode through the existing adjustment handler', async () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );
    const slider = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER,
    );

    act(() => {
      (
        slider.props as { onValueChange: (percentage: number) => void }
      ).onValueChange(25);
    });
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      );
    });

    expect(mockHandleAddMargin).toHaveBeenCalledWith('ETH', 250);
    expect(mockHandleRemoveMargin).not.toHaveBeenCalled();
  });

  it('freezes the margin transition while the submitted adjustment settles', async () => {
    const { rerender } = render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(25);
    });
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      );
    });

    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('add'),
      currentMargin: 750,
    });
    rerender(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(screen.getByText('$500.00')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.MARGIN_VALUE),
    ).toHaveTextContent('$750.00');
  });

  it('shows validation and disables confirm if available margin drops below the amount', () => {
    const { rerender } = render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(100);
    });

    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('add'),
      maxAmount: 500,
    });
    rerender(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    expect(
      screen.getByRole('alert', {
        name: 'perps.adjust_margin.exceeds_available',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('submits remove mode through the existing adjustment handler', async () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    const slider = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER,
    );

    act(() => {
      (
        slider.props as { onValueChange: (percentage: number) => void }
      ).onValueChange(50);
    });
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      );
    });

    expect(mockHandleRemoveMargin).toHaveBeenCalledWith('ETH', 100);
    expect(mockHandleAddMargin).not.toHaveBeenCalled();
  });

  it('shows and tracks a backend adjustment error', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      mockMarginAdjustmentOptions?.onError?.('Margin update failed');
    });

    expect(
      screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.ERROR),
    ).toHaveTextContent('Margin update failed');
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Perp Error' }),
      expect.objectContaining({
        error_type: 'backend',
        error_message: 'Margin update failed',
        screen_type: 'add_margin',
        asset: 'ETH',
      }),
    );
  });

  it('clears a submission error when the amount changes', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );

    act(() => {
      mockMarginAdjustmentOptions?.onError?.('Margin update failed');
    });
    expect(screen.getByText('Margin update failed')).toBeOnTheScreen();

    const slider = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER,
    );
    act(() => {
      (
        slider.props as { onValueChange: (percentage: number) => void }
      ).onValueChange(25);
    });

    expect(screen.queryByText('Margin update failed')).not.toBeOnTheScreen();
  });

  it('shows an accessible error when the live position disappears', () => {
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('remove'),
      position: null,
    });

    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    expect(
      screen.getByRole('alert', {
        name: 'perps.errors.position_not_found',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toBeDisabled();
    expect(mockUsePerpsEventTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: expect.objectContaining({ category: 'Perp Error' }),
        conditions: [true],
        properties: expect.objectContaining({
          error_type: 'validation',
          error_message: 'perps.errors.position_not_found',
          screen_type: 'remove_margin',
          asset: 'ETH',
        }),
      }),
    );
  });

  it('shows only the position error when validation also fails', () => {
    const { rerender } = render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(100);
    });
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('remove', 200),
      position: null,
      maxAmount: 0,
    });
    rerender(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(
      screen.getByRole('alert', {
        name: 'perps.errors.position_not_found',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('perps.errors.marginValidation.exceedsMaxRemovable'),
    ).not.toBeOnTheScreen();
  });

  it('blocks submission when authoritative position data is malformed', () => {
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('add'),
      hasValidPositionData: false,
    });

    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="add" />,
    );
    const slider = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER,
    );
    act(() => {
      (
        slider.props as { onValueChange: (percentage: number) => void }
      ).onValueChange(50);
    });

    expect(
      screen.getByRole('alert', {
        name: 'perps.adjust_margin.position_data_unavailable',
      }),
    ).toBeOnTheScreen();
    const confirmButton = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    );
    expect(confirmButton).toBeDisabled();
    fireEvent.press(confirmButton);
    expect(mockHandleAddMargin).not.toHaveBeenCalled();
  });
  it('explains and blocks removal when no margin can be removed', () => {
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('remove'),
      maxAmount: 0.004,
    });

    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.NO_REMOVABLE_MARGIN,
      ),
    ).toHaveTextContent('perps.adjust_margin.no_removable_margin');
    expect(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('blocks a retained amount once no margin can be removed', () => {
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('remove'),
      exchangeMaxAmount: 250,
    });
    const { rerender } = render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(50);
    });
    mockUsePerpsAdjustMarginData.mockReturnValue({
      ...createMarginData('remove'),
      maxAmount: 0,
      exchangeMaxAmount: 150,
    });

    rerender(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    const confirmButton = screen.getByTestId(
      PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    );
    fireEvent.press(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(mockHandleRemoveMargin).not.toHaveBeenCalled();
  });

  it('hides the zero-state explanation while margin can be removed', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    expect(
      screen.queryByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.NO_REMOVABLE_MARGIN,
      ),
    ).not.toBeOnTheScreen();
  });

  it('sets the amount to the new safe max when removable margin shrank before submit', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );

    act(() => {
      mockMarginAdjustmentOptions?.onAmountChanged?.(150);
    });

    expect(screen.getByTestId('amount-display')).toHaveProp(
      'accessibilityLabel',
      'perps.adjust_margin.amount_accessibility_label, 150.00',
    );
  });

  it('keeps the slider within the fresh limit while the live snapshot still shows more', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    act(() => {
      mockMarginAdjustmentOptions?.onAmountChanged?.(150);
    });

    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(100);
    });

    expect(screen.getByTestId('amount-display')).toHaveProp(
      'accessibilityLabel',
      'perps.adjust_margin.amount_accessibility_label, 150.00',
    );
  });

  const setUpFreshLimit = () => {
    const { rerender } = render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    act(() => {
      mockMarginAdjustmentOptions?.onAmountChanged?.(150);
    });
    const renderLive = (maxAmount: number, livePosition: Position) => {
      mockUsePerpsAdjustMarginData.mockImplementation(
        ({ inputAmount }: { inputAmount: number }) => ({
          ...createMarginData('remove', inputAmount),
          position: livePosition,
          maxAmount,
        }),
      );
      rerender(
        <PerpsAdjustMarginBottomSheet
          position={position}
          initialMode="remove"
        />,
      );
    };
    const expectAmountAtMax = (amount: string) => {
      act(() => {
        (
          screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
            .props as { onValueChange: (percentage: number) => void }
        ).onValueChange(100);
      });
      expect(screen.getByTestId('amount-display')).toHaveProp(
        'accessibilityLabel',
        `perps.adjust_margin.amount_accessibility_label, ${amount}`,
      );
    };
    return { renderLive, expectAmountAtMax };
  };
  const pnlTick = { ...position, unrealizedPnl: '90', marginUsed: '490' };

  it('keeps the fresh limit through PnL re-deliveries and drops it when the size changes', () => {
    const { renderLive, expectAmountAtMax } = setUpFreshLimit();

    renderLive(199, pnlTick);
    expectAmountAtMax('150.00');

    renderLive(250, { ...pnlTick, size: '2' });
    expectAmountAtMax('250.00');
  });

  it('drops the fresh limit once the live max catches up to it', () => {
    const { renderLive, expectAmountAtMax } = setUpFreshLimit();

    renderLive(140, pnlTick);
    renderLive(250, { ...pnlTick, unrealizedPnl: '120' });

    expectAmountAtMax('250.00');
  });

  it('drops the fresh limit when switching modes', () => {
    render(
      <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />,
    );
    act(() => {
      mockMarginAdjustmentOptions?.onAmountChanged?.(150);
    });

    fireEvent.press(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.ADD_MODE_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        PerpsAdjustMarginBottomSheetSelectorsIDs.REMOVE_MODE_BUTTON,
      ),
    );
    act(() => {
      (
        screen.getByTestId(PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER)
          .props as { onValueChange: (percentage: number) => void }
      ).onValueChange(100);
    });

    expect(screen.getByTestId('amount-display')).toHaveProp(
      'accessibilityLabel',
      'perps.adjust_margin.amount_accessibility_label, 200.00',
    );
  });
});
