import React, { useRef, useEffect } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Internal dependencies
import PredictConsentSheet, {
  PredictConsentSheetRef,
} from './PredictConsentSheet';
import { usePredictAgreement } from '../../hooks/usePredictAgreement';

// Mock dependencies
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('../../hooks/usePredictAgreement');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.consent_sheet.title': 'Terms and Conditions',
      'predict.consent_sheet.description':
        'By continuing, you agree to the terms and conditions.',
      'predict.consent_sheet.learn_more': 'Learn more',
      'predict.consent_sheet.agree': 'I Agree',
      'predict.consent_sheet.disagree': 'Disagree',
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
    const { View } = jest.requireActual('react-native');

    return ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet-header' },
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

// Mock Box component
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    Box: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
  };
});

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text/Text', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      children,
      onPress,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
    }) => ReactActual.createElement(RNText, { onPress, ...props }, children),
    TextColor: {
      Alternative: 'alternative',
    },
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
  };
});

describe('PredictConsentSheet', () => {
  const mockProviderId = 'test-provider-id';
  const mockOnDismiss = jest.fn();
  const mockOnAgree = jest.fn();
  const mockAcceptAgreement = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePredictAgreement as jest.Mock).mockReturnValue({
      isAgreementAccepted: false,
      acceptAgreement: mockAcceptAgreement,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('visibility behavior', () => {
    it('does not render when not visible', () => {
      const { queryByTestId } = render(
        <PredictConsentSheet
          providerId={mockProviderId}
          onDismiss={mockOnDismiss}
          onAgree={mockOnAgree}
        />,
      );

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders when opened via ref', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('ref methods', () => {
    it('opens bottom sheet when onOpenBottomSheet is called', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        return (
          <>
            <PredictConsentSheet
              ref={ref}
              providerId={mockProviderId}
              onDismiss={mockOnDismiss}
              onAgree={mockOnAgree}
            />
          </>
        );
      };

      const { queryByTestId } = render(<TestComponent />);

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('opens bottom sheet only once when already visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('component structure', () => {
    it('renders bottom sheet header when visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('renders bottom sheet footer when visible', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
    });
  });

  describe('user interactions', () => {
    it('calls acceptAgreement when agree button is pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      const agreeButton = getByTestId('footer-button-0');

      fireEvent.press(agreeButton);

      expect(mockAcceptAgreement).toHaveBeenCalledTimes(1);
    });

    it('calls onAgree callback when agree button is pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      const agreeButton = getByTestId('footer-button-0');

      fireEvent.press(agreeButton);

      expect(mockOnAgree).toHaveBeenCalledTimes(1);
    });

    it('does not call onAgree when disagree button is pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      const disagreeButton = getByTestId('footer-button-1');

      fireEvent.press(disagreeButton);

      expect(mockOnAgree).not.toHaveBeenCalled();
    });
  });

  describe('optional callbacks', () => {
    it('does not crash when onDismiss is not provided', () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onAgree={mockOnAgree}
          />
        );
      };

      expect(() => render(<TestComponent />)).not.toThrow();
    });

    it('does not crash when onAgree is not provided', async () => {
      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      const agreeButton = getByTestId('footer-button-0');

      fireEvent.press(agreeButton);

      expect(mockAcceptAgreement).toHaveBeenCalledTimes(1);
    });
  });

  describe('hook integration', () => {
    it('calls usePredictAgreement with correct providerId', () => {
      render(
        <PredictConsentSheet
          providerId="custom-provider-id"
          onDismiss={mockOnDismiss}
          onAgree={mockOnAgree}
        />,
      );

      expect(usePredictAgreement).toHaveBeenCalledWith({
        providerId: 'custom-provider-id',
      });
    });

    it('uses acceptAgreement from usePredictAgreement hook', async () => {
      const customAcceptAgreement = jest.fn();

      (usePredictAgreement as jest.Mock).mockReturnValue({
        isAgreementAccepted: false,
        acceptAgreement: customAcceptAgreement,
      });

      const TestComponent = () => {
        const ref = useRef<PredictConsentSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onOpenBottomSheet();
          });
        }, []);

        return (
          <PredictConsentSheet
            ref={ref}
            providerId={mockProviderId}
            onDismiss={mockOnDismiss}
            onAgree={mockOnAgree}
          />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      const agreeButton = getByTestId('footer-button-0');

      fireEvent.press(agreeButton);

      expect(customAcceptAgreement).toHaveBeenCalledTimes(1);
    });
  });
});
