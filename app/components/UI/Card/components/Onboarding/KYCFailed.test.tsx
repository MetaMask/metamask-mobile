import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import KYCFailed from './KYCFailed';
import Routes from '../../../../../constants/navigation/Routes';
import { useMetrics } from '../../../../hooks/useMetrics';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../../core/redux/slices/card', () => ({
  resetOnboardingState: jest.fn(() => ({ type: 'card/resetOnboardingState' })),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_VIEWED: 'CARD_VIEWED',
  },
}));

jest.mock('../../util/metrics', () => ({
  CardScreens: {
    KYC_FAILED: 'KYC_FAILED',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className: string) => ({ className })),
  }),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID, ...props }, children),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
    },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
  };
});

// Mock react-native Image and Dimensions
jest.mock('react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    Image: ({ testID, ...props }: { testID?: string }) =>
      ReactActual.createElement(RN.View, {
        testID: testID || 'kyc-failed-image',
        ...props,
      }),
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const ButtonVariants = {
    Primary: 'primary',
    Secondary: 'secondary',
  };

  const ButtonSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const ButtonWidthTypes = {
    Full: 'full',
    Auto: 'auto',
  };

  const Button = ({
    label,
    onPress,
    disabled,
    testID,
  }: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      {
        testID: testID || 'button',
        onPress: disabled ? undefined : onPress,
        disabled,
      },
      ReactActual.createElement(Text, { testID: `${testID}-label` }, label),
    );

  return {
    __esModule: true,
    default: Button,
    ButtonVariants,
    ButtonSize,
    ButtonWidthTypes,
  };
});

// Mock ButtonIcon component
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity } = jest.requireActual('react-native');

    const ButtonIconSizes = {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    };

    const ButtonIcon = ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(TouchableOpacity, {
        testID: testID || 'button-icon',
        onPress,
      });

    return {
      __esModule: true,
      default: ButtonIcon,
      ButtonIconSizes,
    };
  },
);

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    ArrowLeft: 'ArrowLeft',
  },
}));

// Mock i18n
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

// Mock styles/common
jest.mock('../../../../../styles/common', () => ({
  colors: {
    white: '#FFFFFF',
  },
}));

describe('KYCFailed Component', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue({ event: 'test' }),
      }),
    });
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  describe('Component Rendering', () => {
    it('renders the title text', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('kyc-failed-title');

      expect(title).toBeTruthy();
      expect(title.props.children).toBe(
        "You're not eligible for MetaMask Card right now",
      );
    });

    it('renders the description text', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('kyc-failed-description');

      expect(description).toBeTruthy();
      expect(description.props.children).toBe(
        "Eligibility is determined by our partner's regulatory and verification checks.",
      );
    });

    it('renders the image', () => {
      const { getByTestId } = render(<KYCFailed />);

      const image = getByTestId('kyc-failed-image');

      expect(image).toBeTruthy();
    });
  });

  describe('Back Button', () => {
    it('renders the back button with correct testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');

      expect(backButton).toBeTruthy();
    });

    it('navigates to wallet home when back button is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });

  describe('Close Button', () => {
    it('renders the close button with correct testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');

      expect(button).toBeTruthy();
    });

    it('displays the correct button label', () => {
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('kyc-failed-close-button-label');

      expect(buttonLabel).toBeTruthy();
      expect(buttonLabel.props.children).toBe('Back to home');
    });

    it('navigates to wallet home when close button is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('is not disabled by default', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');

      expect(button.props.disabled).toBeFalsy();
    });
  });

  describe('Navigation', () => {
    it('uses navigation hook', () => {
      render(<KYCFailed />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });

    it('calls navigate with correct route when back is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const backButton = getByTestId('kyc-failed-back-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('calls navigate with correct route when close is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('handles multiple button presses', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
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
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('kyc-failed-close-button-label');

      expect(buttonLabel.props.children).toBe('Back to home');
    });
  });

  describe('testID Coverage', () => {
    it('renders all interactive elements with testIDs', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('kyc-failed-back-button')).toBeTruthy();
      expect(getByTestId('kyc-failed-title')).toBeTruthy();
      expect(getByTestId('kyc-failed-description')).toBeTruthy();
      expect(getByTestId('kyc-failed-image')).toBeTruthy();
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('allows user to dismiss screen via close button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });
});
