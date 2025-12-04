import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsCrossMarginWarningBottomSheet from './PerpsCrossMarginWarningBottomSheet';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaConsumer: ({
    children,
  }: {
    children: (insets: unknown) => React.ReactNode;
  }) => children({ insets: { top: 0, bottom: 0, left: 0, right: 0 } }),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { alternative: '#f0f0f0' },
      text: { default: '#000000', muted: '#666666' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#0066cc', muted: '#cce0ff' },
    },
  })),
}));

jest.mock('./PerpsCrossMarginWarningBottomSheet.styles', () => ({
  createStyles: () => ({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');

    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          shouldNavigateBack?: boolean;
          onClose: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));

        return (
          <View testID="bottom-sheet" onTouchStart={onClose}>
            {children}
          </View>
        );
      },
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="header-close-button" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        {children}
      </View>
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    const MockFooter = ({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        label: string;
        onPress: () => void;
        variant?: string;
        size?: string;
      }[];
      buttonsAlignment?: string;
    }) => (
      <View testID="bottom-sheet-footer">
        {buttonPropsArray.map((button, index) => (
          <TouchableOpacity
            key={index}
            testID={`footer-button-${index}`}
            onPress={button.onPress}
          >
            <Text>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );

    return {
      __esModule: true,
      default: MockFooter,
      ButtonsAlignment: {
        Horizontal: 'horizontal',
        Vertical: 'vertical',
      },
    };
  },
);

jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  __esModule: true,
  ButtonVariants: {
    Primary: 'primary',
    Secondary: 'secondary',
  },
  ButtonSize: {
    Lg: 'lg',
    Md: 'md',
    Sm: 'sm',
  },
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');

  const MockText = ({
    children,
    variant,
    color: _color,
    style,
  }: {
    children: React.ReactNode;
    variant?: string;
    color?: string;
    style?: React.ComponentProps<typeof Text>['style'];
  }) => (
    <Text style={style} testID={`text-${variant || 'default'}`}>
      {children}
    </Text>
  );

  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Alternative: 'Alternative',
    },
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('PerpsCrossMarginWarningBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders cross margin warning title', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(screen.getByText('Cross margin not supported')).toBeTruthy();
    });

    it('renders isolated margin requirement message', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(
        screen.getByText(
          'MetaMask Perps only support trading with isolated margin. You need to first close your cross margin position before you can trade on MetaMask.',
        ),
      ).toBeTruthy();
    });

    it('renders dismiss button with correct label', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(screen.getByText('Got it')).toBeTruthy();
    });
  });

  describe('Navigation Handling', () => {
    it('navigates back when dismiss button is pressed', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      const dismissButton = screen.getByTestId('footer-button-0');

      fireEvent.press(dismissButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls onClose callback when provided and dismiss pressed', () => {
      const mockOnClose = jest.fn();

      render(<PerpsCrossMarginWarningBottomSheet onClose={mockOnClose} />);

      const dismissButton = screen.getByTestId('footer-button-0');

      fireEvent.press(dismissButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls onClose when header close button is pressed', () => {
      const mockOnClose = jest.fn();

      render(<PerpsCrossMarginWarningBottomSheet onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('header-close-button');

      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('navigates back when header close pressed without onClose prop', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      const closeButton = screen.getByTestId('header-close-button');

      fireEvent.press(closeButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
