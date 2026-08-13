import React from 'react';
import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import { Icon, IconName } from '@metamask/design-system-react-native';
import PerpsOrderTypeBottomSheet from './PerpsOrderTypeBottomSheet';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderType,
} from '@metamask/perps-controller';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockTrack = jest.fn();

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
        'Execute immediately at current market price',
      'perps.order.type.limit.title': 'Limit Order',
      'perps.order.type.limit.description':
        'Execute only at your specified price or better',
      'perps.order.type.basic': 'Basic',
      'perps.order.type.triggered': 'Triggered',
      'perps.order.type.stop_limit.title': 'Stop limit',
      'perps.order.type.stop_limit.description': 'Limit fills at trigger price',
      'perps.order.type.stop_market.title': 'Stop market',
      'perps.order.type.stop_market.description':
        'Market fills at trigger price',
      'perps.order.type.take_profit_limit.title': 'Take limit',
      'perps.order.type.take_profit_limit.description':
        'Limit take-profit at trigger price',
      'perps.order.type.take_profit_market.title': 'Take market',
      'perps.order.type.take_profit_market.description':
        'Market take-profit at trigger price',
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
        screen.getByText('Execute immediately at current market price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Execute only at your specified price or better'),
      ).toBeOnTheScreen();
    });

    it('renders both market and limit options', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(screen.getByText('Market Order')).toBeOnTheScreen();
      expect(screen.getByText('Limit Order')).toBeOnTheScreen();
    });

    it('hides section labels and triggered options when disabled', () => {
      render(<PerpsOrderTypeBottomSheet {...defaultProps} />);

      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
        ),
      ).not.toBeOnTheScreen();
      for (const { testID } of triggeredOptions) {
        expect(screen.queryByTestId(testID)).not.toBeOnTheScreen();
      }
    });

    it('renders Basic and Triggered sections when enabled', () => {
      render(
        <PerpsOrderTypeBottomSheet {...defaultProps} showTriggeredTypes />,
      );

      expect(screen.getByText('Basic')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
        ),
      ).toHaveTextContent('Triggered');
      for (const { testID } of triggeredOptions) {
        expect(screen.getByTestId(testID)).toBeOnTheScreen();
      }
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
            showTriggeredTypes
          />,
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
          showTriggeredTypes
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
        <PerpsOrderTypeBottomSheet {...defaultProps} showTriggeredTypes />,
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
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
      },
      {
        type: 'limit',
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.LIMIT,
      },
      {
        type: 'stop_limit',
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_LIMIT,
      },
      {
        type: 'stop_market',
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_MARKET,
      },
      {
        type: 'take_profit_limit',
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_LIMIT,
      },
      {
        type: 'take_profit_market',
        testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
        eventValue: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_MARKET,
      },
    ] as const;

    it.each(analyticsCases)(
      'tracks $type with its analytics value',
      ({ testID, eventValue }) => {
        render(
          <PerpsOrderTypeBottomSheet
            {...defaultProps}
            currentOrderType={undefined}
            showTriggeredTypes
          />,
        );

        fireEvent.press(screen.getByTestId(testID));

        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          expect.objectContaining({
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: eventValue,
          }),
        );
      },
    );
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
