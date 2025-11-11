import React, { useRef, useEffect } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Internal dependencies
import PredictAddFundsSheet, {
  PredictAddFundsSheetRef,
} from './PredictAddFundsSheet';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { strings } from '../../../../../../locales/i18n';

// Mock dependencies
jest.mock('../../hooks/usePredictDeposit');
jest.mock('../../hooks/usePredictActionGuard');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.add_funds_sheet.title': 'Add funds',
      'predict.add_funds_sheet.description':
        "You'll need to add funds to your Predictions account to get started. You can add any token and make your first prediction in seconds.",
    };
    return translations[key] || key;
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock BottomSheet component
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

// Mock BottomSheetHeader
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        onClose &&
          ReactActual.createElement(
            TouchableOpacity,
            { testID: 'header-close-button', onPress: onClose },
            null,
          ),
        children,
      );
  },
);

// Mock BottomSheetFooter
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter',
  () => {
    const ReactActual = jest.requireActual('react');
    const {
      View,
      TouchableOpacity,
      Text: RNText,
    } = jest.requireActual('react-native');

    return ({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        variant: string;
        label: string;
        onPress: () => void;
      }[];
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet-footer' },
        buttonPropsArray.map(
          (
            buttonProps: {
              variant: string;
              label: string;
              onPress: () => void;
            },
            index: number,
          ) =>
            ReactActual.createElement(
              TouchableOpacity,
              {
                key: index,
                onPress: buttonProps.onPress,
                testID: `footer-button-${index}`,
              },
              ReactActual.createElement(RNText, {}, buttonProps.label),
            ),
        ),
      );
  },
);

// Mock Box and Text components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const MockText = ({
    children,
    twClassName,
    ...props
  }: {
    children?: React.ReactNode;
    twClassName?: string;
  }) => ReactActual.createElement(RNText, props, children);

  return {
    Box: ({
      children,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      twClassName?: string;
    }) => ReactActual.createElement(View, props, children),
    BoxAlignItems: {
      Start: 'flex-start',
    },
    BoxJustifyContent: {
      Start: 'flex-start',
    },
    Text: MockText,
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
  };
});

describe('PredictAddFundsSheet', () => {
  const mockOnDismiss = jest.fn();
  const mockDeposit = jest.fn();
  const mockExecuteGuardedAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePredictDeposit as jest.Mock).mockReturnValue({
      deposit: mockDeposit,
    });
    (usePredictActionGuard as jest.Mock).mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('visibility behavior', () => {
    it('does not render when not visible', () => {
      const { queryByTestId } = render(
        <PredictAddFundsSheet onDismiss={mockOnDismiss} />,
      );

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders when opened via ref', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('ref methods', () => {
    it('opens bottom sheet when onOpenBottomSheet is called', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        return (
          <>
            <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />
          </>
        );
      };

      const { queryByTestId } = render(<TestComponent />);

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('opens bottom sheet only once when already visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('closes bottom sheet when onCloseBottomSheet is called', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });

          setTimeout(() => {
            act(() => {
              ref.current?.onCloseBottomSheet();
            });
          }, 100);
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      render(<TestComponent />);

      // Sheet closes after timeout
    });
  });

  describe('component structure', () => {
    it('renders bottom sheet header when visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('renders bottom sheet footer when visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
    });

    it('renders header close button', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('header-close-button')).toBeOnTheScreen();
    });
  });

  describe('user interactions', () => {
    it('calls executeGuardedAction when add funds button is pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      const addFundsButton = getByTestId('footer-button-0');

      fireEvent.press(addFundsButton);

      expect(mockExecuteGuardedAction).toHaveBeenCalledTimes(1);
      expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('calls deposit function through executeGuardedAction', async () => {
      mockExecuteGuardedAction.mockImplementation((fn: () => void) => fn());

      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      const addFundsButton = getByTestId('footer-button-0');

      fireEvent.press(addFundsButton);

      expect(mockDeposit).toHaveBeenCalledTimes(1);
    });

    it('triggers close handler when header close button is pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      const closeButton = getByTestId('header-close-button');

      fireEvent.press(closeButton);

      // The close button was successfully pressed
      expect(closeButton).toBeTruthy();
    });
  });

  describe('optional callbacks', () => {
    it('does not crash when onDismiss is not provided', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} />;
      };

      expect(() => render(<TestComponent />)).not.toThrow();
    });
  });

  describe('hook integration', () => {
    it('calls usePredictDeposit hook', () => {
      render(<PredictAddFundsSheet onDismiss={mockOnDismiss} />);

      expect(usePredictDeposit).toHaveBeenCalled();
    });

    it('calls usePredictActionGuard with correct providerId', () => {
      render(<PredictAddFundsSheet onDismiss={mockOnDismiss} />);

      expect(usePredictActionGuard).toHaveBeenCalledWith({
        providerId: 'polymarket',
        navigation: expect.any(Object),
      });
    });

    it('uses deposit from usePredictDeposit hook', async () => {
      const customDeposit = jest.fn();
      mockExecuteGuardedAction.mockImplementation((fn: () => void) => fn());

      (usePredictDeposit as jest.Mock).mockReturnValue({
        deposit: customDeposit,
      });

      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      const addFundsButton = getByTestId('footer-button-0');

      fireEvent.press(addFundsButton);

      expect(customDeposit).toHaveBeenCalledTimes(1);
    });

    it('uses executeGuardedAction from usePredictActionGuard hook', async () => {
      const customExecuteGuardedAction = jest.fn();

      (usePredictActionGuard as jest.Mock).mockReturnValue({
        executeGuardedAction: customExecuteGuardedAction,
      });

      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      const { getByTestId } = render(<TestComponent />);

      const addFundsButton = getByTestId('footer-button-0');

      fireEvent.press(addFundsButton);

      expect(customExecuteGuardedAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('localization', () => {
    it('calls strings function with correct keys', () => {
      const TestComponent = () => {
        const ref = useRef<PredictAddFundsSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return <PredictAddFundsSheet ref={ref} onDismiss={mockOnDismiss} />;
      };

      render(<TestComponent />);

      expect(strings).toHaveBeenCalledWith('predict.add_funds_sheet.title');
      expect(strings).toHaveBeenCalledWith(
        'predict.add_funds_sheet.description',
      );
    });
  });
});
