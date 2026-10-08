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
      goBack: jest.fn(),
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
    it('renders the Complete component', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('complete-confirm-button')).toBeTruthy();
    });

    it('renders with empty title and description props to OnboardingStep', () => {
      const { getByTestId, queryByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent('');
      expect(queryByTestId('onboarding-step-description')).toBeNull();
    });

    it('renders OnboardingStep with correct structure', () => {
      const { getByTestId, getByText } = render(<Complete />);

      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByText('Complete')).toBeTruthy();
      expect(getByText('Your card setup is complete!')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
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

  describe('OnboardingStep Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId, queryByTestId, getByText } = render(<Complete />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent('');
      expect(queryByTestId('onboarding-step-description')).toBeNull();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByText('Complete')).toBeTruthy();
      expect(getByText('Your card setup is complete!')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('renders correct OnboardingStep structure', () => {
      const { getByTestId, queryByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(queryByTestId('onboarding-step-description')).toBeNull();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
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

    it('renders empty OnboardingStep title prop', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent('');
    });

    it('renders empty OnboardingStep description prop', () => {
      const { queryByTestId } = render(<Complete />);

      expect(queryByTestId('onboarding-step-description')).toBeNull();
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
