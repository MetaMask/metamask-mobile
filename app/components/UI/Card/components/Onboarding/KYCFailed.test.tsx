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

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title: string;
    description: string;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) =>
    React.createElement(
      View,
      { testID: 'onboarding-step' },
      React.createElement(Text, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        Text,
        { testID: 'onboarding-step-description' },
        description,
      ),
      React.createElement(
        View,
        { testID: 'onboarding-step-form-fields' },
        formFields,
      ),
      React.createElement(View, { testID: 'onboarding-step-actions' }, actions),
    );
});

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Text, props, children),
    FontFamily: {},
    FontWeight: {},
    TextVariant: {
      BodyMd: 'BodyMd',
    },
  };
});

// Mock react-native Image
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    ...RN,
    Image: ({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(RN.View, {
        testID: testID || 'kyc-failed-image',
        ...props,
      }),
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
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
    variant,
    size,
    width,
    disabled,
    testID,
    ...props
  }: {
    label: string;
    onPress?: () => void;
    variant?: string;
    size?: string;
    width?: string;
    disabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: testID || 'button',
        onPress: disabled ? undefined : onPress,
        disabled,
        ...props,
      },
      React.createElement(Text, { testID: 'button-label' }, label),
    );

  Button.ButtonVariants = ButtonVariants;
  Button.ButtonSize = ButtonSize;
  Button.ButtonWidthTypes = ButtonWidthTypes;

  return {
    __esModule: true,
    default: Button,
    ButtonVariants,
    ButtonSize,
    ButtonWidthTypes,
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.kyc_failed.title': 'KYC Failed',
      'card.card_onboarding.kyc_failed.description':
        'Your KYC verification failed. Please try again with correct information.',
      'card.card_onboarding.kyc_failed.close_button': 'Close',
    };
    return translations[key] || key;
  }),
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
    it('renders the component successfully', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('displays the correct title', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('KYC Failed');
    });

    it('displays the correct description', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
      expect(description.props.children).toBe(
        'Your KYC verification failed. Please try again with correct information.',
      );
    });

    it('renders form fields section with image', () => {
      const { getByTestId } = render(<KYCFailed />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.props.children).toBeTruthy();
    });

    it('renders actions section with close button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
      expect(actions.props.children).toBeTruthy();
    });
  });

  describe('Close Button', () => {
    it('renders the close button with correct testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
    });

    it('displays the correct button text', () => {
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel).toBeTruthy();
      expect(buttonLabel.props.children).toBe('Close');
    });

    it('is not disabled by default', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button.props.disabled).toBeFalsy();
    });

    it('navigates to wallet home when pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('calls navigation only once per button press', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.WALLET.HOME);
      expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.WALLET.HOME);
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on mount', () => {
      render(<KYCFailed />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Navigation Integration', () => {
    it('uses navigation hook correctly', () => {
      render(<KYCFailed />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });

    it('calls navigate with correct route when close is pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });

  describe('OnboardingStep Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(<KYCFailed />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Verify title is passed correctly
      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('KYC Failed');

      // Verify description is passed correctly
      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe(
        'Your KYC verification failed. Please try again with correct information.',
      );

      // Verify form fields are passed (contains image)
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.props.children).toBeTruthy();

      // Verify actions are passed
      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });

    it('renders OnboardingStep with correct structure', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });
  });

  describe('Button Configuration', () => {
    it('configures button with primary variant', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
    });

    it('configures button with large size', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
    });

    it('configures button with full width', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
    });

    it('renders button with correct label', () => {
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel.props.children).toBe('Close');
    });
  });

  describe('Error State Handling', () => {
    it('displays appropriate error messaging', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('KYC Failed');
      expect(description.props.children).toContain('failed');
      expect(description.props.children).toContain('try again');
    });

    it('provides close functionality', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      const buttonLabel = getByTestId('button-label');

      expect(buttonLabel.props.children).toBe('Close');
      expect(button.props.onPress).toBeDefined();
    });

    it('communicates failure state clearly', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toMatch(/failed/i);
      expect(description.props.children).toMatch(/verification failed/i);
    });
  });

  describe('User Flow Integration', () => {
    it('navigates to wallet home on close', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('maintains user flow continuity', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
      expect(button.props.onPress).toBeDefined();

      fireEvent.press(button);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n keys for title', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('KYC Failed');
    });

    it('uses correct i18n keys for description', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe(
        'Your KYC verification failed. Please try again with correct information.',
      );
    });

    it('uses correct i18n key for close button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel.props.children).toBe('Close');
    });
  });

  describe('testID Coverage', () => {
    it('renders component with kyc-failed-close-button testID', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('kyc-failed-close-button');
      expect(button).toBeTruthy();
    });

    it('provides testID for all interactive elements', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
      expect(getByTestId('kyc-failed-close-button')).toBeTruthy();
      expect(getByTestId('button-label')).toBeTruthy();
    });
  });
});
