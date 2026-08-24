import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react-native';
import { Icon, IconName } from '@metamask/design-system-react-native';
import PerpsOrderTypeBottomSheet from './PerpsOrderTypeBottomSheet';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderType,
} from '@metamask/perps-controller';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';

const mockTrack = jest.fn();

function render(
  ui: React.ReactElement,
  appTheme: AppThemeKey = AppThemeKey.dark,
) {
  const themeAppearance =
    appTheme === AppThemeKey.light ? AppThemeKey.light : AppThemeKey.dark;

  return renderWithProvider(
    ui,
    {
      state: { user: { appTheme } },
      theme: {
        ...mockTheme,
        themeAppearance,
      },
    },
    false,
  );
}

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const resolveStyle = (...args: unknown[]) => {
    const classNames = JSON.stringify(args);
    if (classNames.includes('bg-transparent')) {
      return { backgroundColor: 'transparent' };
    }
    if (classNames.includes('bg-background-muted')) {
      return { backgroundColor: 'muted' };
    }
    return {};
  };
  const tw = (...args: unknown[]) => resolveStyle(...args);
  tw.style = jest.fn(resolveStyle);
  return { useTailwind: () => tw };
});

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order.type.title': 'Order Type',
      'perps.order.type.market.title': 'Market Order',
      'perps.order.type.market.description':
        'Execute instantly at best available price',
      'perps.order.type.limit.title': 'Limit Order',
      'perps.order.type.limit.description':
        'Execute at your specified price or better',
      'perps.order.type.scale.title': 'Scale',
      'perps.order.type.scale.description':
        'Place multiple limit orders across a price range',
      'perps.order.type.basic': 'Basic',
      'perps.order.type.triggered': 'Triggered',
      'perps.order.type.advanced': 'Advanced',
      'perps.order.type.stop_limit.title': 'Stop limit',
      'perps.order.type.stop_limit.description':
        'Place a limit order if trigger price hits',
      'perps.order.type.stop_market.title': 'Stop market',
      'perps.order.type.stop_market.description':
        'Place a market order if trigger price hits',
      'perps.order.type.take_profit_limit.title': 'Take limit',
      'perps.order.type.take_profit_limit.description':
        'Place a limit order if trigger price is reached',
      'perps.order.type.take_profit_market.title': 'Take market',
      'perps.order.type.take_profit_market.description':
        'Place a market order if trigger price is reached',
      'perps.order.type.twap.title': 'TWAP',
      'perps.order.type.twap.description':
        'Split orders to execute at regular time interval',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsOrderTypeBottomSheet', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    currentOrderType: 'market' as OrderType,
  };
  const triggeredOptions = [
    {
      type: 'stop_limit',
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
    },
    {
      type: 'stop_market',
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
    },
    {
      type: 'take_profit_limit',
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
    },
    {
      type: 'take_profit_market',
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
    },
  ] as const;
  const triggeredOrderTypes: readonly OrderType[] = triggeredOptions.map(
    ({ type }) => type,
  );
  const proOrderTypes: readonly OrderType[] = [
    'market',
    'limit',
    ...triggeredOrderTypes,
  ];
  const proOrderTypesWithTwap: readonly OrderType[] = [
    ...proOrderTypes,
    'twap',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(screen.getByText('Order Type')).toBeOnTheScreen();
      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Order Type')).toBeNull();
      expect(screen.queryByText('Market Order')).toBeNull();
      expect(screen.queryByText('Limit Order')).toBeNull();
    });

    it('renders order type descriptions', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('Execute instantly at best available price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Execute at your specified price or better'),
      ).toBeOnTheScreen();
    });

    it('renders triggered order type descriptions when enabled', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypes}
        />,
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      );

      expect(
        screen.getByText('Place a limit order if trigger price hits'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Place a market order if trigger price hits'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Place a limit order if trigger price is reached'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Place a market order if trigger price is reached'),
      ).toBeOnTheScreen();
    });

    it('renders both market and limit options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('preserves the Basic-only sheet when categorized options are omitted', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TABS),
      ).not.toBeOnTheScreen();
      for (const { testID } of triggeredOptions) {
        expect(screen.queryByTestId(testID)).not.toBeOnTheScreen();
      }
    });

    it('renders only non-empty Basic and Triggered tabs', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypes}
        />,
      );

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      ).toBeOnTheScreen();
      expect(screen.getAllByText('Basic')).not.toHaveLength(0);
      expect(screen.getAllByText('Triggered')).not.toHaveLength(0);
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the Figma Basic, Triggered, Advanced tab order when each category has an option', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );

      const tabs = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.TABS,
      );
      const tabTestIDs = [
        PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB,
        PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
      ];
      const renderedTabTestIDs = [
        ...new Set(
          tabs
            .findAll((node) => tabTestIDs.includes(node.props.testID))
            .map((node) => node.props.testID),
        ),
      ];

      expect(renderedTabTestIDs).toEqual(tabTestIDs);
      expect(screen.getAllByText('Basic').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Triggered').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Advanced').length).toBeGreaterThan(0);
    });

    it('shows only the active tab order types', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      );

      for (const { testID } of triggeredOptions) {
        expect(screen.getByTestId(testID)).toBeOnTheScreen();
      }
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
    });

    it('keeps Triggered active when Advanced becomes available', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypes}
        />,
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB),
      );

      rerender(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );

      expect(
        screen.getByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).not.toBeOnTheScreen();
    });

    it('falls back to the selected order type category when the active category disappears', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType="stop_limit"
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      );

      rerender(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType="stop_limit"
          availableOrderTypes={proOrderTypes}
        />,
      );

      expect(
        screen.getByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        ),
      ).not.toBeOnTheScreen();
    });

    it('derives the initial active tab from the selected order type', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType="twap"
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders options with stable testIDs', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      ).toBeOnTheScreen();
    });

    it('shows order type icons only in the Pro presentation', () => {
      const marketIconTestID = `${PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION}-icon`;
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} />,
      );

      expect(screen.queryByTestId(marketIconTestID)).not.toBeOnTheScreen();

      rerender(
        <PerpsOrderTypeBottomSheet {...defaultProps} showSelectedIcon />,
      );

      expect(screen.getByTestId(marketIconTestID)).toBeOnTheScreen();
    });

    it('renders dark order type icons when the app theme is dark', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          showSelectedIcon
          availableOrderTypes={proOrderTypes}
          currentOrderType="stop_limit"
        />,
        AppThemeKey.dark,
      );

      expect(screen.getAllByLabelText(/-icon-dark$/)).toHaveLength(4);
      expect(screen.queryByLabelText(/-icon-light$/)).not.toBeOnTheScreen();
    });

    it('renders light order type icons when the app theme is light', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          showSelectedIcon
          availableOrderTypes={proOrderTypes}
          currentOrderType="stop_limit"
        />,
        AppThemeKey.light,
      );

      expect(screen.getAllByLabelText(/-icon-light$/)).toHaveLength(4);
      expect(screen.queryByLabelText(/-icon-dark$/)).not.toBeOnTheScreen();
    });

    it('renders the 32px TWAP graph asset in dark theme', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
          currentOrderType="twap"
        />,
        AppThemeKey.dark,
      );

      const iconContainer = screen.getByTestId(
        `${PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION}-icon`,
      );
      const graphIcon = within(iconContainer).UNSAFE_getByProps({
        name: 'perps-order-type-twap',
      });

      expect(iconContainer).toHaveProp(
        'accessibilityLabel',
        `${PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION}-icon-dark`,
      );
      expect(graphIcon).toHaveProp('name', 'perps-order-type-twap');
      expect(graphIcon).toHaveProp('width', 32);
      expect(graphIcon).toHaveProp('height', 32);
      expect(within(iconContainer).UNSAFE_queryByType(Icon)).toBeNull();
    });

    it('renders the exact Figma TWAP description', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
          currentOrderType="twap"
        />,
      );

      expect(
        within(
          screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
        ).getByText('Split orders to execute at regular time interval'),
      ).toBeOnTheScreen();
    });

    it('renders the 32px TWAP graph asset in light theme', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypesWithTwap}
          currentOrderType="twap"
        />,
        AppThemeKey.light,
      );

      const iconContainer = screen.getByTestId(
        `${PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION}-icon`,
      );
      const graphIcon = within(iconContainer).UNSAFE_getByProps({
        name: 'perps-order-type-twap',
      });

      expect(iconContainer).toHaveProp(
        'accessibilityLabel',
        `${PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION}-icon-light`,
      );

      expect(graphIcon).toHaveProp('name', 'perps-order-type-twap');
      expect(graphIcon).toHaveProp('width', 32);
      expect(graphIcon).toHaveProp('height', 32);
      expect(within(iconContainer).UNSAFE_queryByType(Icon)).toBeNull();
    });

    it('forwards the Pro title and selected-icon presentation', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          title="Choose order type"
          showSelectedIcon
        />,
      );

      expect(screen.getByText('Choose order type')).toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId(
            PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
          ),
        ).UNSAFE_getByType(Icon).props.name,
      ).toBe(IconName.Check);
    });
  });

  describe('Order Type Selection', () => {
    it('calls onSelect and onClose when market order is pressed', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="limit"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSelect and onClose when limit order is pressed', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('limit');
      expect(onClose).toHaveBeenCalled();
    });

    it('emits Scale when its enabled option is pressed', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          showScaleType
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('scale');
    });

    it('handles selecting the same order type', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
          currentOrderType="market"
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );

      expect(onSelect).toHaveBeenCalledWith('market');
      expect(onClose).toHaveBeenCalled();
    });

    it.each(triggeredOptions)(
      'emits $type and closes when its option is pressed',
      ({ type, testID }) => {
        const onSelect = jest.fn();
        const onClose = jest.fn();
        render(
          <PerpsOrderTypeBottomSheet
            {...defaultProps}
            currentOrderType="market"
            onSelect={onSelect}
            onClose={onClose}
            availableOrderTypes={proOrderTypes}
          />,
        );
        fireEvent.press(
          screen.getByTestId(
            PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
          ),
        );

        fireEvent.press(screen.getByTestId(testID));

        expect(onSelect).toHaveBeenCalledWith(type);
        expect(onClose).toHaveBeenCalledTimes(1);
      },
    );

    it('marks only the current triggered order type as selected', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType="stop_limit"
          availableOrderTypes={proOrderTypes}
        />,
      );

      const selectedOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
      );
      const unselectedOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
      );

      expect(within(selectedOption).UNSAFE_getByType(Icon).props.name).toBe(
        IconName.Check,
      );
      expect(within(unselectedOption).UNSAFE_queryByType(Icon)).toBeNull();
    });

    it('preserves the selected background when selected icons are hidden', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} />,
      );

      const selectedOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
      );

      expect(selectedOption).toHaveStyle({ backgroundColor: 'muted' });
      expect(within(selectedOption).UNSAFE_queryByType(Icon)).toBeNull();

      rerender(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          availableOrderTypes={proOrderTypes}
        />,
      );

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toHaveStyle({ backgroundColor: 'transparent' });
    });
  });

  describe('Analytics', () => {
    const analyticsCases = [
      {
        type: 'market',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
      },
      {
        type: 'limit',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.LIMIT,
      },
      {
        type: 'stop_limit',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_LIMIT,
      },
      {
        type: 'stop_market',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_MARKET,
      },
      {
        type: 'take_profit_limit',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_LIMIT,
      },
      {
        type: 'take_profit_market',
        tabTestID: PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_MARKET,
      },
    ] as const;

    it.each(analyticsCases)(
      'tracks $type with its analytics value',
      ({ tabTestID, testID, eventValue }) => {
        render(
          <PerpsOrderTypeBottomSheet
            {...defaultProps}
            currentOrderType={undefined}
            availableOrderTypes={proOrderTypes}
          />,
        );
        fireEvent.press(screen.getByTestId(tabTestID));

        fireEvent.press(screen.getByTestId(testID));

        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          expect.objectContaining({
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: eventValue,
          }),
        );
      },
    );

    it('tracks TWAP with the strategy analytics value', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType={undefined}
          availableOrderTypes={proOrderTypesWithTwap}
        />,
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB),
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION),
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: PERPS_EVENT_VALUE.ORDER_TYPE.TWAP,
        }),
      );
    });
  });

  describe('Bottom Sheet Interaction', () => {
    it('opens bottom sheet when visible becomes true', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('calls onClose once when header close button is pressed', () => {
      const onClose = jest.fn();

      render(<PerpsOrderTypeBottomSheet {...defaultProps} onClose={onClose} />);

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose once when header close button is pressed with external sheetRef', () => {
      const onClose = jest.fn();
      const sheetRef: React.RefObject<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      } | null> = { current: null };

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onClose={onClose}
          sheetRef={sheetRef}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(sheetRef.current?.onCloseBottomSheet).toBeDefined();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props Validation', () => {
    it('handles undefined order type gracefully', () => {
      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          currentOrderType={undefined as unknown as OrderType}
        />,
      );

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('renders with minimal props', () => {
      render(
        <PerpsOrderTypeBottomSheet
          isVisible
          onClose={jest.fn()}
          onSelect={jest.fn()}
          currentOrderType="market"
        />,
      );

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible touch targets for order type options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      ).toBeOnTheScreen();
    });

    it('maintains correct order of options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      const marketOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
      );
      const limitOption = screen.getByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
      );

      expect(marketOption).toBeOnTheScreen();
      expect(limitOption).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid selection changes', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <PerpsOrderTypeBottomSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
      );
      fireEvent.press(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
      );

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, 'market');
      expect(onSelect).toHaveBeenNthCalledWith(2, 'limit');
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Memoization', () => {
    it('prevents unnecessary re-renders when props remain the same', () => {
      const props = {
        isVisible: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        currentOrderType: 'market' as OrderType,
      };

      const { rerender } = render(<PerpsOrderTypeBottomSheet {...props} />);

      rerender(<PerpsOrderTypeBottomSheet {...props} />);

      expect(screen.getByText('Order Type')).toBeOnTheScreen();
    });

    it('re-renders when isVisible changes', () => {
      const { rerender } = render(
        <PerpsOrderTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      rerender(<PerpsOrderTypeBottomSheet {...defaultProps} isVisible />);

      expect(
        screen.getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });
});
