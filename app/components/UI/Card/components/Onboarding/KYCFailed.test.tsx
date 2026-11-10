import React from 'react';
import { StatusBar } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import KYCFailed from './KYCFailed';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useSelector } from 'react-redux';

const mockExitCardFlow = jest.fn();

jest.mock('../../hooks/useExitCardFlow', () => ({
  useExitCardFlow: () => mockExitCardFlow,
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => effect(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => jest.fn()),
  useSelector: jest.fn(() => 'baanx'),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../../../../../core/redux/slices/card', () => ({
  resetOnboardingState: jest.fn(() => ({ type: 'card/resetOnboardingState' })),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../../util/metrics', () => ({
  ...jest.requireActual('../../util/metrics'),
  CardScreens: {
    KYC_FAILED: 'KYC_FAILED',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className: string) => ({ className })),
  }),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: jest.fn(() => false),
  }),
);

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onBack,
        backButtonProps,
      }: {
        onBack?: () => void;
        backButtonProps?: { testID?: string };
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header-standard-glass' },
          ReactActual.createElement(TouchableOpacity, {
            testID: backButtonProps?.testID || 'back-button',
            onPress: onBack,
          }),
        ),
    };
  },
);

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ name }: { name?: string }) =>
        ReactActual.createElement(View, {
          testID: 'kyc-failed-vba-failure-svg',
          accessibilityLabel: name,
        }),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    TitleStandard: ({
      title,
      bottomLabel,
      titleProps,
      bottomLabelProps,
      topAccessory,
    }: {
      title?: string;
      bottomLabel?: string;
      titleProps?: { testID?: string };
      bottomLabelProps?: { testID?: string };
      topAccessory?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'title-standard' },
        topAccessory,
        ReactActual.createElement(Text, { testID: titleProps?.testID }, title),
        ReactActual.createElement(
          Text,
          { testID: bottomLabelProps?.testID },
          bottomLabel,
        ),
      ),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID, ...props }, children),
    Button: ({
      children,
      testID,
      onPress,
      label,
      isDisabled,
      disabled,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      label?: string;
      isDisabled?: boolean;
      disabled?: boolean;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID, onPress, disabled: disabled || isDisabled, ...props },
        ReactActual.createElement(Text, {}, children || label),
      ),
    Icon: ({ name, testID }: { name?: string; testID?: string }) =>
      ReactActual.createElement(View, {
        testID: testID || 'kyc-failed-circle-x',
        accessibilityLabel: name,
      }),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
    },
    ButtonVariant: {
      Primary: 'Primary',
      Secondary: 'Secondary',
      Link: 'Link',
    },
    ButtonSize: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
    IconName: {
      CircleX: 'CircleX',
      ArrowLeft: 'ArrowLeft',
    },
    IconSize: {
      Xl: 'Xl',
    },
    IconColor: {
      ErrorDefault: 'ErrorDefault',
    },
    BoxAlignItems: {
      Center: 'Center',
    },
    BoxJustifyContent: {
      Center: 'Center',
      End: 'End',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.kyc_failed.title':
        "You're not eligible for MetaMask Card right now",
      'card.card_onboarding.kyc_failed.description':
        "Eligibility is determined by our partner's regulatory and verification checks.",
      'card.card_onboarding.kyc_failed.close_button': 'Back to home',
    };
    return translations[key] || key;
  }),
}));

describe('KYCFailed Component', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // First selector is the glass header flag; later calls are the provider.
    // A non-boolean provider value keeps the glass header off.
    mockUseSelector.mockReturnValue('baanx');
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue({ event: 'test' }),
      }),
    });
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  describe('Component Rendering', () => {
    it('renders the title text', () => {
      const setBarStyle = jest
        .spyOn(StatusBar, 'setBarStyle')
        .mockImplementation(() => undefined);
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('kyc-failed-title');

      expect(title).toBeTruthy();
      expect(title.props.children).toBe(
        "You're not eligible for MetaMask Card right now",
      );
      expect(setBarStyle).toHaveBeenCalledWith('dark-content', true);
      setBarStyle.mockRestore();
    });

    it('renders the description text', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('kyc-failed-description');

      expect(description).toBeTruthy();
      expect(description.props.children).toBe(
        "Eligibility is determined by our partner's regulatory and verification checks.",
      );
    });

    it('renders the VBA account-create-failure illustration', () => {
      const { getByTestId, getByLabelText } = render(<KYCFailed />);

      expect(getByTestId('kyc-failed-illustration')).toBeTruthy();
      expect(getByLabelText('vba-account-create-failure')).toBeTruthy();
      expect(getByTestId('kyc-failed-vba-failure-svg')).toBeTruthy();
    });

    it('does not render the old-brand purple artwork', () => {
      const { queryByTestId } = render(<KYCFailed />);

      expect(queryByTestId('kyc-failed-image')).toBeNull();
    });
  });

  describe('Back Button', () => {
    it('renders the back button with correct testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');

      expect(backButton).toBeTruthy();
    });

    it('leaves the card flow when back button is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');
      fireEvent.press(backButton);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close Button', () => {
    it('renders the close button with correct testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');

      expect(button).toBeTruthy();
    });

    it('displays the correct button label', () => {
      const { getByTestId, getByText } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
      expect(getByText('Back to home')).toBeTruthy();
    });

    it('leaves the card flow when close button is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });

    it('is not disabled by default', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');

      expect(button).not.toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('leaves the card flow when back is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');
      fireEvent.press(backButton);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });

    it('leaves the card flow when close is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });

    it('leaves again on each button press', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on mount', () => {
      render(<KYCFailed />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('creates event with KYC_FAILED screen property', () => {
      render(<KYCFailed />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      const addPropertiesCall =
        mockCreateEventBuilder.mock.results[0].value.addProperties;
      expect(addPropertiesCall).toHaveBeenCalledWith({
        provider: 'baanx',
        screen: 'KYC_FAILED',
      });
    });

    it('does not track while activeProviderId is null', () => {
      mockUseSelector.mockReset();
      mockUseSelector.mockReturnValueOnce(false).mockReturnValue(null);

      render(<KYCFailed />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks once when provider resolves after a null provider render', () => {
      mockUseSelector.mockReset();
      mockUseSelector.mockReturnValueOnce(false).mockReturnValue(null);
      const { rerender } = render(<KYCFailed />);

      expect(mockTrackEvent).not.toHaveBeenCalled();

      mockUseSelector.mockReset();
      mockUseSelector.mockReturnValueOnce(false).mockReturnValue('immersve');
      rerender(<KYCFailed />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const addPropertiesCall =
        mockCreateEventBuilder.mock.results[0].value.addProperties;
      expect(addPropertiesCall).toHaveBeenCalledWith({
        provider: 'immersve',
        screen: 'KYC_FAILED',
      });
    });
  });

  describe('Redux Integration', () => {
    it('dispatches resetOnboardingState on mount', () => {
      const mockDispatch = jest.fn();
      const { useDispatch } = jest.requireMock('react-redux');
      useDispatch.mockReturnValue(mockDispatch);

      render(<KYCFailed />);

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n key for title', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('kyc-failed-title');

      expect(title.props.children).toBe(
        "You're not eligible for MetaMask Card right now",
      );
    });

    it('uses correct i18n key for description', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('kyc-failed-description');

      expect(description.props.children).toBe(
        "Eligibility is determined by our partner's regulatory and verification checks.",
      );
    });

    it('uses correct i18n key for close button', () => {
      const { getByText } = render(<KYCFailed />);

      expect(getByText('Back to home')).toBeTruthy();
    });
  });

  describe('testID Coverage', () => {
    it('renders all interactive elements with testIDs', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('kyc-failed-back-button')).toBeTruthy();
      expect(getByTestId('kyc-failed-title')).toBeTruthy();
      expect(getByTestId('kyc-failed-description')).toBeTruthy();
      expect(getByTestId('kyc-failed-illustration')).toBeTruthy();
      expect(getByTestId('kyc-failed-close-button')).toBeTruthy();
    });
  });

  describe('User Flow', () => {
    it('provides clear failure state messaging', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('kyc-failed-title');
      const description = getByTestId('kyc-failed-description');

      expect(title.props.children).toMatch(/not eligible/i);
      expect(description.props.children).toContain('verification');
    });

    it('allows user to dismiss screen via back button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');
      fireEvent.press(backButton);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });

    it('allows user to dismiss screen via close button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    });
  });
});
