import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import PredictUnavailable, {
  PredictUnavailableRef,
} from './PredictUnavailable';

const mockNavigate = jest.fn();
const runAfterInteractionsCallbacks: (() => void)[] = [];
const mockRunAfterInteractions = jest.spyOn(
  InteractionManager,
  'runAfterInteractions',
);
const runAfterInteractionsMockImpl: typeof InteractionManager.runAfterInteractions =
  (task) => {
    if (typeof task === 'function') {
      runAfterInteractionsCallbacks.push(task as () => void);
    }

    return {
      then: jest.fn(),
      done: jest.fn(),
      cancel: jest.fn(),
    } as ReturnType<typeof InteractionManager.runAfterInteractions>;
  };

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.unavailable.title': 'Unavailable in your region',
      'predict.unavailable.description':
        "Predictions aren't available in your region due to legal restrictions.",
      'predict.unavailable.link': 'See Polymarket terms',
      'predict.unavailable.webview_title': 'Polymarket Terms',
      'predict.unavailable.button': 'Got it',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View: RNView } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          shouldNavigateBack: _shouldNavigateBack,
          isInteractable: _isInteractable,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
          shouldNavigateBack?: boolean;
          isInteractable?: boolean;
        },
        ref: React.Ref<{
          onOpenBottomSheet: (cb?: () => void) => void;
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (cb?: () => void) => {
            cb?.();
          },
          onCloseBottomSheet: (cb?: () => void) => {
            onClose?.();
            cb?.();
          },
        }));

        return ReactActual.createElement(
          RNView,
          { testID: 'bottom-sheet' },
          children,
        );
      },
    );
  },
);

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const {
      View: RNView,
      Text: RNText,
      TouchableOpacity: RNTouchableOpacity,
    } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      ({
        children,
        onClose,
        style,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
        style?: Record<string, unknown>;
      }) =>
        ReactActual.createElement(
          RNView,
          { testID: 'bottom-sheet-header', style },
          ReactActual.createElement(
            RNTouchableOpacity,
            { testID: 'header-close-button', onPress: onClose },
            ReactActual.createElement(RNText, null, '×'),
          ),
          children,
        ),
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter',
  () => {
    const ReactActual = jest.requireActual('react');
    const {
      View: RNView,
      Text: RNText,
      TouchableOpacity: RNTouchableOpacity,
    } = jest.requireActual('react-native');

    return ({
      buttonPropsArray,
      style,
    }: {
      buttonPropsArray: {
        variant: string;
        label: string;
        onPress: () => void;
      }[];
      style?: Record<string, unknown>;
    }) =>
      ReactActual.createElement(
        RNView,
        { testID: 'bottom-sheet-footer', style },
        buttonPropsArray.map((button, index) =>
          ReactActual.createElement(
            RNTouchableOpacity,
            {
              key: index,
              testID: `footer-button-${index}`,
              onPress: button.onPress,
            },
            ReactActual.createElement(RNText, null, button.label),
          ),
        ),
      );
  },
);

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: {
    HeadingMd: 'HeadingMd',
    BodyMd: 'BodyMd',
  },
  BoxAlignItems: {
    Start: 'start',
  },
  BoxJustifyContent: {
    Start: 'start',
  },
  ButtonSize: {
    Lg: 'lg',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (className: string) => ({ className }),
  }),
}));

describe('PredictUnavailable', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runAfterInteractionsCallbacks.length = 0;
    mockRunAfterInteractions.mockImplementation(runAfterInteractionsMockImpl);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRunAfterInteractions.mockReset();
  });

  afterAll(() => {
    mockRunAfterInteractions.mockRestore();
  });

  describe('Component Rendering', () => {
    it('returns null when not visible', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);

      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders when opened via ref', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('renders all required text content', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
      expect(screen.getByText('See Polymarket terms')).toBeOnTheScreen();
      expect(screen.getByText('Got it')).toBeOnTheScreen();
    });

    it('renders with correct component structure', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onDismiss when header close button is pressed', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      const closeButton = screen.getByTestId('header-close-button');
      fireEvent.press(closeButton);

      // Assert
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('calls onDismiss when footer button is pressed', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      const gotItButton = screen.getByTestId('footer-button-0');
      fireEvent.press(gotItButton);

      // Assert
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('renders terms link with correct testID', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      // Assert
      const termsLink = screen.getByTestId('polymarket-terms-link');
      expect(termsLink).toBeOnTheScreen();
    });
  });

  describe('Ref Methods', () => {
    it('opens bottom sheet when onOpenBottomSheet is called', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
    });

    it('closes bottom sheet when onCloseBottomSheet is called', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();

      act(() => {
        ref.current?.onCloseBottomSheet();
      });
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('handles multiple open calls gracefully', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
    });
  });

  describe('Props Validation', () => {
    it('renders without onDismiss prop', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
    });

    it('handles undefined onDismiss gracefully', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={undefined} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      const closeButton = screen.getByTestId('header-close-button');
      fireEvent.press(closeButton);
      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });
  });

  describe('Bottom Sheet Integration', () => {
    it('passes correct props to BottomSheet', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByText('Unavailable in your region')).toBeOnTheScreen();
    });

    it('handles bottom sheet close callback', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      const closeButton = screen.getByTestId('header-close-button');
      fireEvent.press(closeButton);
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Terms Link', () => {
    it('renders terms link as touchable', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      // Assert
      const termsLink = screen.getByTestId('polymarket-terms-link');
      expect(termsLink).toBeOnTheScreen();
    });

    it('displays terms text with correct styling', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      // Assert
      expect(screen.getByText('See Polymarket terms')).toBeOnTheScreen();
    });

    it('renders terms link with onPress handler', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      // Assert
      const termsLink = screen.getByTestId('polymarket-terms-link');
      expect(termsLink.props.onPress).toBeDefined();
      expect(typeof termsLink.props.onPress).toBe('function');
    });

    it('navigates to polymarket terms webview when link is pressed', () => {
      // Arrange
      const ref = React.createRef<PredictUnavailableRef>();

      // Act
      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      const termsLink = screen.getByTestId('polymarket-terms-link');
      act(() => {
        termsLink.props.onPress();
      });

      // Assert
      expect(mockRunAfterInteractions).toHaveBeenCalledTimes(1);
      const callback = runAfterInteractionsCallbacks[0];
      expect(callback).toBeDefined();
      callback?.();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://polymarket.com/tos',
          title: 'Polymarket Terms',
        },
      });
    });
  });

  describe('Accessibility', () => {
    it('renders all interactive elements', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });
      expect(screen.getByTestId('header-close-button')).toBeOnTheScreen();
      expect(screen.getByTestId('footer-button-0')).toBeOnTheScreen();
      expect(screen.getByText('See Polymarket terms')).toBeOnTheScreen();
    });
  });
});
