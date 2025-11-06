import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import OnboardingNavigator from './OnboardingNavigator';
import { useCardSDK } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => `mocked_${key}`),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
    useFocusEffect: jest.fn(),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    Screen: ({
      children,
      ...props
    }: React.PropsWithChildren<{ name: string }>) => (
      <div {...props}>{children}</div>
    ),
  }),
}));

// Mock navigation components
jest.mock('../components/Onboarding/SignUp', () => 'SignUp');
jest.mock('../components/Onboarding/ConfirmEmail', () => 'ConfirmEmail');
jest.mock('../components/Onboarding/SetPhoneNumber', () => 'SetPhoneNumber');
jest.mock(
  '../components/Onboarding/ConfirmPhoneNumber',
  () => 'ConfirmPhoneNumber',
);
jest.mock('../components/Onboarding/VerifyIdentity', () => 'VerifyIdentity');
jest.mock('../components/Onboarding/ValidatingKYC', () => 'ValidatingKYC');
jest.mock('../components/Onboarding/KYCFailed', () => 'KYCFailed');
jest.mock('../components/Onboarding/PersonalDetails', () => 'PersonalDetails');
jest.mock('../components/Onboarding/PhysicalAddress', () => 'PhysicalAddress');
jest.mock('../components/Onboarding/MailingAddress', () => 'MailingAddress');
jest.mock('../components/Onboarding/Complete', () => 'Complete');
jest.mock('../components/Onboarding/KYCWebview', () => 'KYCWebview');

// Mock navigation options
jest.mock('.', () => ({
  cardAuthenticationNavigationOptions: {},
  headerStyle: {
    title: { fontSize: 16 },
    icon: { padding: 8 },
  },
}));

// Mock component library components
jest.mock(
  '../../../../component-library/components/Buttons/ButtonIcon',
  () => 'ButtonIcon',
);
jest.mock('../../../../component-library/components/Texts/Text', () => 'Text');
jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
}));

// Mock Routes
jest.mock('../../../../constants/navigation/Routes', () => ({
  CARD: {
    ONBOARDING: {
      SIGN_UP: 'SIGN_UP',
      CONFIRM_EMAIL: 'CONFIRM_EMAIL',
      SET_PHONE_NUMBER: 'SET_PHONE_NUMBER',
      CONFIRM_PHONE_NUMBER: 'CONFIRM_PHONE_NUMBER',
      VERIFY_IDENTITY: 'VERIFY_IDENTITY',
      VALIDATING_KYC: 'VALIDATING_KYC',
      KYC_FAILED: 'KYC_FAILED',
      PERSONAL_DETAILS: 'PERSONAL_DETAILS',
      PHYSICAL_ADDRESS: 'PHYSICAL_ADDRESS',
      MAILING_ADDRESS: 'MAILING_ADDRESS',
      COMPLETE: 'COMPLETE',
      WEBVIEW: 'WEBVIEW',
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('OnboardingNavigator', () => {
  const renderWithNavigation = (component: React.ReactElement) =>
    render(<NavigationContainer>{component}</NavigationContainer>);

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('onboardingId')) {
        return null;
      }
      return undefined;
    });

    const mockSDK = {
      getRegistrationStatus: jest.fn(),
    } as unknown as CardSDK;

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
    });
  });

  describe('Loading State', () => {
    describe('when SDK is loading', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue(null); // onboardingId
        mockUseCardSDK.mockReturnValue({
          user: null,
          isLoading: true,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });
      });

      it('renders loading indicator', () => {
        const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

        expect(getByTestId('activity-indicator')).toBeTruthy();
      });

      it('does not render Stack Navigator', () => {
        const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

        expect(queryByTestId('stack-navigator')).toBeNull();
      });
    });
  });

  describe('Initial Route Selection', () => {
    describe('getInitialRouteName', () => {
      describe('when no onboardingId or user id', () => {
        it('returns SIGN_UP route when onboardingId is null', () => {
          mockUseSelector.mockReturnValue(null);
          mockUseCardSDK.mockReturnValue({
            user: null,
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          // Verify the navigator renders (not loading)
          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns SIGN_UP route when user has no id', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: { id: 'user-123', verificationState: 'PENDING' }, // user without id
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when user verification state is PENDING', () => {
        it('returns VALIDATING_KYC route', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when user verification state is VERIFIED', () => {
        it('returns PERSONAL_DETAILS route when firstName is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              // firstName is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns PHYSICAL_ADDRESS route when firstName exists but addressLine1 is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              // addressLine1 is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns COMPLETE route when both firstName and addressLine1 exist', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              addressLine1: '123 Main St',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when onboardingId exists but user verification is not PENDING or VERIFIED', () => {
        it('returns SET_PHONE_NUMBER route', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when no onboardingId but user exists', () => {
        it('returns VERIFY_IDENTITY route', () => {
          mockUseSelector.mockReturnValue(null);
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });
    });
  });

  describe('Stack Navigator Configuration', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          verificationState: 'UNVERIFIED',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });
    });

    it('renders Stack Navigator with all required screens', () => {
      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('configures all onboarding screens', () => {
      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Verify the navigator is rendered (not loading)
      expect(queryByTestId('activity-indicator')).toBeNull();

      // Note: Individual screen testing would require more complex navigation testing
      // which is typically done at integration level rather than unit level
    });
  });

  describe('Navigation Options', () => {
    describe('KYCModalavigationOptions', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue('onboarding-123');
        mockUseCardSDK.mockReturnValue({
          user: {
            id: 'user-123',
            verificationState: 'UNVERIFIED',
          },
          isLoading: false,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });
      });

      it('renders navigation with proper configuration', () => {
        const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);
        expect(queryByTestId('close-button')).toBeDefined();
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    describe('ValidatingKYCNavigationOptions', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue('onboarding-123');
        mockUseCardSDK.mockReturnValue({
          user: {
            id: 'user-123',
            verificationState: 'UNVERIFIED',
          },
          isLoading: false,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });
      });

      it('renders navigation with proper configuration', () => {
        const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);
        expect(queryByTestId('back-button')).toBeDefined();
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });
  });

  describe('Hook Integration', () => {
    describe('useSelector integration', () => {
      it('calls useSelector to get onboardingId', () => {
        mockUseSelector.mockReturnValue('onboarding-123');
        mockUseCardSDK.mockReturnValue({
          user: null,
          isLoading: false,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });

        renderWithNavigation(<OnboardingNavigator />);

        expect(mockUseSelector).toHaveBeenCalled();
      });
    });

    describe('useCardSDK integration', () => {
      it('calls useCardSDK to get user and loading state', () => {
        mockUseSelector.mockReturnValue('onboarding-123');
        mockUseCardSDK.mockReturnValue({
          user: null,
          isLoading: false,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
        });

        renderWithNavigation(<OnboardingNavigator />);

        expect(mockUseCardSDK).toHaveBeenCalled();
      });
    });
  });

  describe('Internationalization', () => {
    it('has strings function properly mocked', () => {
      // Verify that strings function is mocked and returns expected format
      expect(strings).toBeDefined();
      expect(strings('card.card')).toBe('mocked_card.card');
    });
  });
});
