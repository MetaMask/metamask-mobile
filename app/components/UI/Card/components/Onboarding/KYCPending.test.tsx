import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import KYCPending from './KYCPending';
import Routes from '../../../../../constants/navigation/Routes';
import { useMetrics } from '../../../../hooks/useMetrics';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_VIEWED: 'CARD_VIEWED',
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
        testID: testID || 'kyc-pending-image',
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
      'card.card_onboarding.kyc_pending.title': 'Awaiting approval',
      'card.card_onboarding.kyc_pending.description':
        'Our partner needs to verify your identity in order to approve your application.',
      'card.card_onboarding.kyc_pending.footer_text':
        "Approvals usually take around 12 hours.\nWe'll notify you when a decision is made.",
      'card.card_onboarding.kyc_pending.got_it_button': 'Got it',
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

describe('KYCPending Component', () => {
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
      const { getByTestId } = render(<KYCPending />);

      const title = getByTestId('kyc-pending-title');

      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Awaiting approval');
    });

    it('renders the description text', () => {
      const { getByTestId } = render(<KYCPending />);

      const description = getByTestId('kyc-pending-description');

      expect(description).toBeTruthy();
      expect(description.props.children).toBe(
        'Our partner needs to verify your identity in order to approve your application.',
      );
    });

    it('renders the image', () => {
      const { getByTestId } = render(<KYCPending />);

      const image = getByTestId('kyc-pending-image');

      expect(image).toBeTruthy();
    });

    it('renders the footer text', () => {
      const { getByText } = render(<KYCPending />);

      const footerText = getByText(
        "Approvals usually take around 12 hours.\nWe'll notify you when a decision is made.",
      );

      expect(footerText).toBeTruthy();
    });
  });

  describe('Back Button', () => {
    it('renders the back button with correct testID', () => {
      const { getByTestId } = render(<KYCPending />);

      const backButton = getByTestId('kyc-pending-back-button');

      expect(backButton).toBeTruthy();
    });

    it('navigates to wallet home when back button is pressed', () => {
      const { getByTestId } = render(<KYCPending />);

      const backButton = getByTestId('kyc-pending-back-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });

  describe('Got It Button', () => {
    it('renders the Got it button with correct testID', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');

      expect(button).toBeTruthy();
    });

    it('displays the correct button label', () => {
      const { getByTestId } = render(<KYCPending />);

      const buttonLabel = getByTestId('kyc-pending-got-it-button-label');

      expect(buttonLabel).toBeTruthy();
      expect(buttonLabel.props.children).toBe('Got it');
    });

    it('navigates to wallet home when Got it button is pressed', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('is not disabled by default', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');

      expect(button.props.disabled).toBeFalsy();
    });
  });

  describe('Navigation', () => {
    it('uses navigation hook', () => {
      render(<KYCPending />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });

    it('calls navigate with correct route when back is pressed', () => {
      const { getByTestId } = render(<KYCPending />);

      const backButton = getByTestId('kyc-pending-back-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('calls navigate with correct route when Got it is pressed', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('handles multiple button presses', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on mount', () => {
      render(<KYCPending />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('creates event with KYC_PENDING screen property', () => {
      render(<KYCPending />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      const addPropertiesCall =
        mockCreateEventBuilder.mock.results[0].value.addProperties;
      expect(addPropertiesCall).toHaveBeenCalledWith({
        screen: 'KYC_PENDING',
      });
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n key for title', () => {
      const { getByTestId } = render(<KYCPending />);

      const title = getByTestId('kyc-pending-title');

      expect(title.props.children).toBe('Awaiting approval');
    });

    it('uses correct i18n key for description', () => {
      const { getByTestId } = render(<KYCPending />);

      const description = getByTestId('kyc-pending-description');

      expect(description.props.children).toBe(
        'Our partner needs to verify your identity in order to approve your application.',
      );
    });

    it('uses correct i18n key for Got it button', () => {
      const { getByTestId } = render(<KYCPending />);

      const buttonLabel = getByTestId('kyc-pending-got-it-button-label');

      expect(buttonLabel.props.children).toBe('Got it');
    });
  });

  describe('testID Coverage', () => {
    it('renders all interactive elements with testIDs', () => {
      const { getByTestId } = render(<KYCPending />);

      expect(getByTestId('kyc-pending-back-button')).toBeTruthy();
      expect(getByTestId('kyc-pending-title')).toBeTruthy();
      expect(getByTestId('kyc-pending-description')).toBeTruthy();
      expect(getByTestId('kyc-pending-image')).toBeTruthy();
      expect(getByTestId('kyc-pending-got-it-button')).toBeTruthy();
    });
  });

  describe('User Flow', () => {
    it('provides clear pending state messaging', () => {
      const { getByTestId, getByText } = render(<KYCPending />);

      const title = getByTestId('kyc-pending-title');
      const description = getByTestId('kyc-pending-description');
      const footerText = getByText(/Approvals usually take around 12 hours/);

      expect(title.props.children).toMatch(/awaiting/i);
      expect(description.props.children).toContain('verify your identity');
      expect(footerText).toBeTruthy();
    });

    it('allows user to dismiss screen via back button', () => {
      const { getByTestId } = render(<KYCPending />);

      const backButton = getByTestId('kyc-pending-back-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('allows user to dismiss screen via Got it button', () => {
      const { getByTestId } = render(<KYCPending />);

      const button = getByTestId('kyc-pending-got-it-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });
});
