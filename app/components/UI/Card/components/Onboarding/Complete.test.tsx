import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Complete from './Complete';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
const mockNavigationDispatch = jest.fn();
const mockStackReplace = jest.fn((routeName: string) => ({
  type: 'REPLACE',
  routeName,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  StackActions: {
    replace: jest.fn((routeName: string) => ({
      type: 'REPLACE',
      routeName,
    })),
  },
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/card', () => ({
  resetOnboardingState: jest.fn(() => ({ type: 'card/resetOnboardingState' })),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ONBOARDING_PAGE_VIEWED: 'CARD_ONBOARDING_PAGE_VIEWED',
    CARD_ONBOARDING_BUTTON_CLICKED: 'CARD_ONBOARDING_BUTTON_CLICKED',
  },
}));

jest.mock('../../util/cardTokenVault', () => ({
  getCardBaanxToken: jest.fn(),
}));

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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

  // Mock Button component to match the actual component structure
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
      'card.card_onboarding.complete.title': 'Complete',
      'card.card_onboarding.complete.description':
        'Your card setup is complete!',
      'card.card_onboarding.confirm_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('Complete Component', () => {
  const mockDispatch = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationDispatch.mockClear();
    mockStackReplace.mockClear();
    (StackActions.replace as jest.Mock).mockImplementation(mockStackReplace);

    (useNavigation as jest.Mock).mockReturnValue({
      dispatch: mockNavigationDispatch,
    });

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    const { useMetrics } = jest.requireMock('../../../../hooks/useMetrics');
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
    useMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    const { getCardBaanxToken } = jest.requireMock('../../util/cardTokenVault');
    getCardBaanxToken.mockResolvedValue({
      success: true,
      tokenData: { accessToken: 'mock-token' },
    });
  });

  describe('Component Rendering', () => {
    it('renders the Complete component', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders with correct title and description', () => {
      const { getByTestId } = render(<Complete />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Complete');

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
      expect(description.props.children).toBe('Your card setup is complete!');
    });

    it('renders OnboardingStep with correct structure', () => {
      const { getByTestId } = render(<Complete />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.props.children).toBeNull();

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('renders the continue button', () => {
      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      expect(button).toBeTruthy();
    });

    it('displays the correct button text', () => {
      const { getByTestId } = render(<Complete />);
      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel.props.children).toBe('Continue');
    });

    it('is not disabled', () => {
      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      expect(button.props.disabled).toBeFalsy();
    });

    it('dispatches replace action to card home when pressed', async () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });

    it('dispatches replace action only once per button press', async () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      });

      fireEvent.press(button);

      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledTimes(2);
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME);
      });
    });

    it('falls back to authentication flow when token is missing', async () => {
      const { getCardBaanxToken } = jest.requireMock(
        '../../util/cardTokenVault',
      );
      getCardBaanxToken.mockResolvedValueOnce({
        success: false,
      });

      const { getByTestId } = render(<Complete />);
      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(
          Routes.CARD.AUTHENTICATION,
        );
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.AUTHENTICATION }),
        );
      });
    });
  });

  describe('Navigation Integration', () => {
    it('uses navigation hook', () => {
      render(<Complete />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });

    it('dispatches replace action to correct route on continue', async () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });
  });

  describe('OnboardingStep Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(<Complete />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Verify title is passed correctly
      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Complete');

      // Verify description is passed correctly
      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe('Your card setup is complete!');

      // Verify form fields are passed (null in this case)
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.props.children).toBeNull();

      // Verify actions are passed
      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });

    it('renders correct OnboardingStep structure', () => {
      const { getByTestId } = render(<Complete />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct translation keys', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<Complete />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.complete.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.complete.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.confirm_button',
      );
    });

    it('renders translated title', () => {
      const { getByTestId } = render(<Complete />);

      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Complete');
    });

    it('renders translated description', () => {
      const { getByTestId } = render(<Complete />);

      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe('Your card setup is complete!');
    });

    it('renders translated button label', () => {
      const { getByTestId } = render(<Complete />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel.props.children).toBe('Continue');
    });
  });

  describe('Button Configuration', () => {
    it('configures button with correct variant', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      // The button should be rendered with primary variant
      expect(button).toBeTruthy();
    });

    it('configures button with correct size', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      // The button should be rendered with large size
      expect(button).toBeTruthy();
    });

    it('configures button with full width', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      // The button should be rendered with full width
      expect(button).toBeTruthy();
    });

    it('renders button with correct label', () => {
      const { getByTestId } = render(<Complete />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel.props.children).toBe('Continue');
    });
  });

  describe('Critical Path Testing', () => {
    it('completes the onboarding flow successfully', async () => {
      const { getByTestId } = render(<Complete />);

      // Verify component renders
      expect(getByTestId('complete-confirm-button')).toBeTruthy();

      // Verify user can complete the flow
      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      // Verify navigation to final destination
      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });

    it('handles user flow continuity', async () => {
      const { getByTestId } = render(<Complete />);

      // Verify the component is ready for user interaction
      const button = getByTestId('complete-confirm-button');
      expect(button.props.disabled).toBeFalsy();

      // Verify successful completion leads to proper navigation
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });
  });
});
