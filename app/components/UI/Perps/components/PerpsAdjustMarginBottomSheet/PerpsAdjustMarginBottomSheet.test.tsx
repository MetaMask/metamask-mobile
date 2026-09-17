import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import React from 'react';
import { PerpsAdjustMarginBottomSheetSelectorsIDs } from '../../Perps.testIds';
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
  const { Text } = jest.requireActual('react-native');
  return ({
    amount,
    accessibilityLabel,
  }: {
    amount: string;
    accessibilityLabel?: string;
  }) =>
    ReactActual.createElement(
      Text,
      { testID: 'amount-display', accessibilityLabel },
      amount,
    );
});

// Subscribes to the live price stream, which needs PerpsStreamProvider.
jest.mock('../LivePriceDisplay/LivePriceHeader', () => 'LivePriceHeader');

jest.mock('../PerpsBottomSheetTooltip', () => 'PerpsBottomSheetTooltip');

jest.mock('../../../../Base/Keypad', () => 'Keypad');

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

const createMarginData = (mode: 'add' | 'remove') => ({
  position,
  isLoading: false,
  currentMargin: 500,
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
      ({ mode }: { mode: 'add' | 'remove' }) => createMarginData(mode),
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
});
