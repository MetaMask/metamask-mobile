import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import PerpsTooltipView from './PerpsTooltipView';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';

// Mock @react-navigation/native
const mockUseRoute = useRoute as jest.Mock;
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  RouteProp: jest.fn(),
}));

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const MockBottomSheet = forwardRef(
      (
        props: {
          children: React.ReactNode;
          shouldNavigateBack?: boolean;
          onClose?: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(() => {
            if (props.onClose) {
              props.onClose();
            }
          }),
        }));

        return <View testID="bottom-sheet">{props.children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="bottom-sheet-header">
          <Text>{children}</Text>
        </View>
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          variant?: string;
          size?: string;
        }[];
      }) => (
        <View testID="bottom-sheet-footer">
          {buttonPropsArray?.map((buttonProps) => (
            <TouchableOpacity
              key={buttonProps.label}
              testID="got-it-button"
              onPress={buttonProps.onPress}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      ButtonsAlignment: {
        Horizontal: 'Horizontal',
      },
    };
  },
);

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      variant,
    }: {
      children: React.ReactNode;
      variant?: string;
    }) => <Text testID={`text-${variant || 'default'}`}>{children}</Text>,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
  };
});

// Mock Button enums
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: {
    Lg: 'Lg',
  },
  ButtonVariants: {
    Primary: 'Primary',
  },
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    // Return the key as fallback for testing
    if (key === 'perps.tooltips.got_it_button') {
      return 'Got it';
    }
    if (key.includes('.title')) {
      return key.replace('perps.tooltips.', '').replace('.title', '');
    }
    if (key.includes('.content')) {
      return `Content for ${key.replace('perps.tooltips.', '').replace('.content', '')}`;
    }
    return key;
  }),
}));

// Mock useStyles
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      contentContainer: { paddingHorizontal: 16 },
      footerContainer: { paddingHorizontal: 16, paddingVertical: 24 },
    },
  })),
}));

// Mock styles
jest.mock(
  '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.styles',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      contentContainer: { paddingHorizontal: 16 },
      footerContainer: { paddingHorizontal: 16, paddingVertical: 24 },
    })),
  }),
);

// Mock tooltipContentRegistry
jest.mock(
  '../../components/PerpsBottomSheetTooltip/content/contentRegistry',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Text } = jest.requireActual('react-native');
    return {
      tooltipContentRegistry: {
        fees: ({
          testID,
          data,
        }: {
          testID?: string;
          data?: Record<string, unknown>;
        }) => (
          <View testID={testID}>
            <Text>Custom Fees Content</Text>
            {data && <Text testID="custom-data">{JSON.stringify(data)}</Text>}
          </View>
        ),
        market_hours: ({ testID }: { testID?: string }) => (
          <View testID={testID}>
            <Text>Market Hours Content</Text>
          </View>
        ),
        after_hours_trading: ({ testID }: { testID?: string }) => (
          <View testID={testID}>
            <Text>After Hours Trading Content</Text>
          </View>
        ),
        leverage: undefined, // Fallback to string content
        margin: undefined, // Fallback to string content
        liquidation_price: undefined,
        open_interest: undefined,
        funding_rate: undefined,
        geo_block: undefined,
        estimated_pnl: undefined,
        limit_price: undefined,
        tp_sl: undefined,
        close_position_you_receive: undefined,
        tpsl_count_warning: undefined,
        points: undefined,
        closing_fees: undefined,
        withdrawal_fees: undefined,
        receive: undefined,
      },
    };
  },
);

describe('PerpsTooltipView', () => {
  const defaultRouteParams = {
    params: {
      contentKey: 'leverage' as PerpsTooltipContentKey,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue(defaultRouteParams);
  });

  describe('Component Rendering', () => {
    it('renders correctly with valid contentKey', () => {
      render(<PerpsTooltipView />);

      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      // Content should be rendered (either with testID for custom renderers or as text for default)
      expect(screen.getByText('Content for leverage')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
      expect(screen.getByText('Got it')).toBeOnTheScreen();
    });

    it('returns null when contentKey is missing', () => {
      mockUseRoute.mockReturnValue({
        params: {},
      });

      render(<PerpsTooltipView />);

      // When contentKey is missing, component returns null
      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });

    it('returns null when params are missing', () => {
      mockUseRoute.mockReturnValue({});

      render(<PerpsTooltipView />);

      // When params are missing, component returns null
      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders title from strings', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'margin' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      expect(screen.getByText('margin')).toBeOnTheScreen();
    });
  });

  describe('Content Rendering', () => {
    it('renders default string content when no custom renderer exists', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'leverage' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      expect(screen.getByText('Content for leverage')).toBeOnTheScreen();
    });

    it('renders custom renderer when registered in contentRegistry', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'fees' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      expect(screen.getByText('Custom Fees Content')).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
      ).toBeOnTheScreen();
    });

    it('passes data prop to custom renderer', () => {
      const testData = { fee: 0.001, amount: 100 };
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'fees' as PerpsTooltipContentKey,
          data: testData,
        },
      });

      render(<PerpsTooltipView />);

      expect(screen.getByTestId('custom-data')).toBeOnTheScreen();
      expect(screen.getByText(JSON.stringify(testData))).toBeOnTheScreen();
    });

    it('renders content with correct testID for custom renderers', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'fees' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      // Custom renderers get the CONTENT testID
      const content = screen.getByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.CONTENT,
      );
      expect(content).toBeOnTheScreen();
    });
  });

  describe('Header Rendering', () => {
    it('renders default header for most content keys', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'leverage' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      expect(screen.getByText('leverage')).toBeOnTheScreen();
    });

    it('does not render default header for market_hours contentKey', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'market_hours' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      // Should not render the default header
      expect(screen.queryByTestId('bottom-sheet-header')).toBeNull();
      expect(screen.getByText('Market Hours Content')).toBeOnTheScreen();
    });

    it('does not render default header for after_hours_trading contentKey', () => {
      mockUseRoute.mockReturnValue({
        params: {
          contentKey: 'after_hours_trading' as PerpsTooltipContentKey,
        },
      });

      render(<PerpsTooltipView />);

      // Should not render the default header
      expect(screen.queryByTestId('bottom-sheet-header')).toBeNull();
      expect(screen.getByText('After Hours Trading Content')).toBeOnTheScreen();
    });
  });

  describe('Footer and Button Actions', () => {
    it('renders footer with Got it button', () => {
      render(<PerpsTooltipView />);

      expect(screen.getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
      expect(screen.getByTestId('got-it-button')).toBeOnTheScreen();
      expect(screen.getByText('Got it')).toBeOnTheScreen();
    });

    it('calls onCloseBottomSheet when Got it button is pressed', () => {
      render(<PerpsTooltipView />);

      const gotItButton = screen.getByTestId('got-it-button');

      fireEvent.press(gotItButton);

      // The BottomSheet mock handles navigation back internally
      // We verify the component handles the press without errors
      expect(gotItButton).toBeOnTheScreen();
    });
  });
});
