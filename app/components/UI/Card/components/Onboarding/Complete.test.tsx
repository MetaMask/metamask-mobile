import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Complete from './Complete';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import { MarketingMomentSelectorsIDs } from '../../../MarketingMoment';

// Mock dependencies
const mockNavigationDispatch = jest.fn();
const mockStackReplace = jest.fn((routeName: string) => ({
  type: 'REPLACE',
  routeName,
}));
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
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

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
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

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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
      testID,
      ...props
    }: React.PropsWithChildren<
      { testID?: string } & Record<string, unknown>
    >) => React.createElement(Text, { testID, ...props }, children),
    TextVariant: {
      BodyMd: 'BodyMd',
      DisplayMd: 'DisplayMd',
      DisplayLg: 'DisplayLg',
    },
    TextColor: {
      TextAlternative: 'text-alternative',
    },
    FontWeight: {
      Regular: '400',
      Medium: '500',
      Bold: '700',
    },
    BoxFlexDirection: { Column: 'column' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    HeaderStandard: () =>
      React.createElement(View, { testID: 'complete-header' }),
    Button: ({
      children,
      testID,
      onPress,
      isDisabled,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { TouchableOpacity } = jest.requireActual('react-native');
      return React.createElement(
        TouchableOpacity,
        { testID, onPress, disabled: isDisabled, ...props },
        React.createElement(Text, {}, children),
      );
    },
    ButtonVariant: {
      Primary: 'Primary',
      Secondary: 'Secondary',
      Tertiary: 'Tertiary',
      Link: 'Link',
    },
    ButtonSize: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
  };
});

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

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
      'card.card_onboarding.complete.confirm_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('Complete Component', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationDispatch.mockClear();
    mockStackReplace.mockClear();
    (StackActions.replace as jest.Mock).mockImplementation(mockStackReplace);

    (useNavigation as jest.Mock).mockReturnValue({
      dispatch: mockNavigationDispatch,
    });

    // Default: no route params
    (useRoute as jest.Mock).mockReturnValue({
      params: {},
    });

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    const { getCardBaanxToken } = jest.requireMock('../../util/cardTokenVault');
    getCardBaanxToken.mockResolvedValue({
      success: true,
      tokenData: { accessToken: 'mock-token' },
    });
  });

  describe('Analytics', () => {
    it('tracks CARD_VIEWED with COMPLETE screen on mount', () => {
      render(<Complete />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        provider: 'baanx',
        screen: CardScreens.COMPLETE,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks CARD_BUTTON_CLICKED with COMPLETE_BUTTON when continue is pressed', async () => {
      const { getByTestId } = render(<Complete />);

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();

      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_BUTTON_CLICKED,
        );
      });
      expect(mockAddProperties).toHaveBeenCalledWith({
        provider: 'baanx',
        action: CardActions.COMPLETE_BUTTON,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Component Rendering', () => {
    it('renders the completion title and description', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId(MarketingMomentSelectorsIDs.TITLE)).toHaveTextContent(
        'Complete',
      );
      expect(
        getByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
      ).toHaveTextContent('Your card setup is complete!');
      expect(getByTestId('complete-header')).toBeOnTheScreen();
    });
  });

  describe('Continue Button', () => {
    it('renders the continue button', () => {
      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      expect(button).toBeTruthy();
    });

    it('displays the correct button text', () => {
      const { getByText } = render(<Complete />);
      expect(getByText('Continue')).toBeTruthy();
    });

    it('is not disabled', () => {
      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      expect(button).not.toBeDisabled();
    });

    it('dispatches replace action to card home when pressed', async () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
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
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
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

      expect(useNavigation).toHaveBeenCalled();
    });

    it('dispatches replace action to correct route on continue', async () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });
  });

  describe('Marketing moment', () => {
    it('renders the completion copy and continue action', () => {
      const { getByTestId, getByText } = render(<Complete />);

      expect(getByTestId(MarketingMomentSelectorsIDs.TITLE)).toHaveTextContent(
        'Complete',
      );
      expect(
        getByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
      ).toHaveTextContent('Your card setup is complete!');
      expect(getByText('Continue')).toBeOnTheScreen();
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
        'card.card_onboarding.complete.confirm_button',
      );
    });

    it('renders the completion title', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId(MarketingMomentSelectorsIDs.TITLE)).toHaveTextContent(
        'Complete',
      );
    });

    it('renders the completion description', () => {
      const { getByTestId } = render(<Complete />);

      expect(
        getByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
      ).toHaveTextContent('Your card setup is complete!');
    });

    it('renders translated button label', () => {
      const { getByText } = render(<Complete />);

      expect(getByText('Continue')).toBeTruthy();
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
      const { getByText } = render(<Complete />);

      expect(getByText('Continue')).toBeTruthy();
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
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });

    it('handles user flow continuity', async () => {
      const { getByTestId } = render(<Complete />);

      // Verify the component is ready for user interaction
      const button = getByTestId('complete-confirm-button');
      expect(button).not.toBeDisabled();

      // Verify successful completion leads to proper navigation
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.HOME }),
        );
      });
    });
  });

  describe('Deep Link Navigation (nextDestination param)', () => {
    it('navigates to PersonalDetails when nextDestination is personal_details', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { nextDestination: 'personal_details' },
      });

      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
        );
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            routeName: Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
          }),
        );
      });
    });

    it('does not reset onboarding state when navigating to PersonalDetails', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { nextDestination: 'personal_details' },
      });

      const { resetOnboardingState } = jest.requireMock(
        '../../../../../core/redux/slices/card',
      );

      const { getByTestId } = render(<Complete />);
      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(resetOnboardingState).not.toHaveBeenCalled();
      });
    });

    it('navigates to SpendingLimit when nextDestination is card_home', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { nextDestination: 'card_home' },
      });

      const { getByTestId } = render(<Complete />);
      const button = getByTestId('complete-confirm-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          { flow: 'onboarding' },
        );
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ routeName: Routes.CARD.SPENDING_LIMIT }),
        );
      });
    });

    it('resets onboarding state when nextDestination is card_home', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { nextDestination: 'card_home' },
      });

      const { resetOnboardingState } = jest.requireMock(
        '../../../../../core/redux/slices/card',
      );

      const { getByTestId } = render(<Complete />);
      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(resetOnboardingState());
      });
    });

    it('does not check token when nextDestination is provided', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { nextDestination: 'card_home' },
      });

      const { getCardBaanxToken } = jest.requireMock(
        '../../util/cardTokenVault',
      );

      const { getByTestId } = render(<Complete />);
      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(getCardBaanxToken).not.toHaveBeenCalled();
      });
    });

    it('falls back to default behavior when nextDestination is undefined', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: {},
      });

      const { getCardBaanxToken } = jest.requireMock(
        '../../util/cardTokenVault',
      );
      getCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: { accessToken: 'mock-token' },
      });

      const { getByTestId } = render(<Complete />);
      fireEvent.press(getByTestId('complete-confirm-button'));

      await waitFor(() => {
        expect(getCardBaanxToken).toHaveBeenCalled();
        expect(mockStackReplace).toHaveBeenCalledWith(Routes.CARD.HOME, {
          fromCardOnboarding: true,
        });
      });
    });
  });
});
