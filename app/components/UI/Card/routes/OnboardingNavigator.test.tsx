import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  NavigationContainer,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { Alert } from 'react-native';
import OnboardingNavigator, {
  PostEmailNavigationOptions,
  KYCStatusNavigationOptions,
} from './OnboardingNavigator';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import { useParams } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';

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

// Mock useParams from navUtils
jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({})),
}));

// Mock navigation functions - shared across tests
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
    useFocusEffect: jest.fn(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    }),
  };
});

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => {
  const { View } = jest.requireActual('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <View testID="stack-navigator" {...props}>
          {children}
        </View>
      ),
      Screen: ({
        children,
        ...props
      }: React.PropsWithChildren<{ name: string }>) => (
        <View testID={`screen-${props.name}`} {...props}>
          {children}
        </View>
      ),
    }),
  };
});

// Mock LockManagerService - must use inline jest.fn() to avoid hoisting issues
jest.mock('../../../../core/LockManagerService', () => ({
  __esModule: true,
  default: {
    stopListening: jest.fn(),
    startListening: jest.fn(),
  },
}));

// Get references to the mock functions for assertions
const mockLockManagerService = jest.requireMock(
  '../../../../core/LockManagerService',
).default;
const mockStopListening = mockLockManagerService.stopListening;
const mockStartListening = mockLockManagerService.startListening;

// Mock navigation components
jest.mock('../components/Onboarding/SignUp', () => 'SignUp');
jest.mock('../components/Onboarding/ConfirmEmail', () => 'ConfirmEmail');
jest.mock('../components/Onboarding/SetPhoneNumber', () => 'SetPhoneNumber');
jest.mock(
  '../components/Onboarding/ConfirmPhoneNumber',
  () => 'ConfirmPhoneNumber',
);
jest.mock('../components/Onboarding/VerifyIdentity', () => 'VerifyIdentity');
jest.mock(
  '../components/Onboarding/VerifyingVeriffKYC',
  () => 'VerifyingVeriffKYC',
);
jest.mock('../components/Onboarding/KYCFailed', () => 'KYCFailed');
jest.mock('../components/Onboarding/KYCPending', () => 'KYCPending');
jest.mock('../components/Onboarding/PersonalDetails', () => 'PersonalDetails');
jest.mock('../components/Onboarding/PhysicalAddress', () => 'PhysicalAddress');
jest.mock('../components/Onboarding/Complete', () => 'Complete');
jest.mock('../components/Onboarding/KYCWebview', () => 'KYCWebview');

// Mock navigation options
jest.mock('.', () => ({
  cardDefaultNavigationOptions: {},
  headerStyle: {
    title: { fontSize: 16 },
    icon: { padding: 8 },
  },
}));

// Mock component library components
jest.mock(
  '../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: 'ButtonIcon',
    ButtonIconSizes: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
  }),
);

jest.mock('../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextVariant: {
    HeadingSM: 'HeadingSM',
    BodyMd: 'BodyMd',
  },
}));

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Close: 'Close',
    ArrowLeft: 'ArrowLeft',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock Routes
jest.mock('../../../../constants/navigation/Routes', () => ({
  CARD: {
    ONBOARDING: {
      SIGN_UP: 'SIGN_UP',
      CONFIRM_EMAIL: 'CONFIRM_EMAIL',
      SET_PHONE_NUMBER: 'SET_PHONE_NUMBER',
      CONFIRM_PHONE_NUMBER: 'CONFIRM_PHONE_NUMBER',
      VERIFY_IDENTITY: 'VERIFY_IDENTITY',
      VERIFYING_VERIFF_KYC: 'VERIFYING_VERIFF_KYC',
      KYC_FAILED: 'KYC_FAILED',
      PERSONAL_DETAILS: 'PERSONAL_DETAILS',
      PHYSICAL_ADDRESS: 'PHYSICAL_ADDRESS',
      COMPLETE: 'COMPLETE',
      WEBVIEW: 'WEBVIEW',
    },
    MODALS: {
      ID: 'CARD_MODALS',
      CONFIRM_MODAL: 'CONFIRM_MODAL',
    },
  },
  WALLET: {
    HOME: 'WALLET_HOME',
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

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
      fetchUserData: jest.fn(),
      isReturningSession: false,
    });

    // Default mock for useParams - returns empty object (no route params)
    mockUseParams.mockReturnValue({});
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
          fetchUserData: jest.fn(),
          isReturningSession: false,
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
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          // Verify the navigator renders (not loading)
          expect(queryByTestId('activity-indicator')).toBeNull();
          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.SIGN_UP,
          );
        });

        it('returns SIGN_UP route when user has no verificationState', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: { id: 'user-123' }, // user without verificationState - falls back to SIGN_UP
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          expect(queryByTestId('activity-indicator')).toBeNull();
          // Fallback to SIGN_UP when verificationState is missing
          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.SIGN_UP,
          );
        });
      });

      describe('when user verification state is PENDING', () => {
        it('returns VERIFY_IDENTITY route when firstName is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              // firstName is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
          );
        });

        it('returns VERIFYING_VERIFF_KYC route when firstName exists', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              firstName: 'John',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC,
          );
        });
      });

      describe('when user verification state is VERIFIED', () => {
        it('returns PHYSICAL_ADDRESS route when address is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              countryOfNationality: 'US',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS,
          );
        });

        it('returns PERSONAL_DETAILS route when countryOfNationality is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              addressLine1: '123 Main St',
              city: 'New York',
              zip: '10001',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
          );
        });

        it('returns COMPLETE route when all address data and countryOfNationality exists', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              addressLine1: '123 Main St',
              city: 'New York',
              zip: '10001',
              countryOfNationality: 'US',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.COMPLETE,
          );
        });
      });

      describe('when user verification state is UNVERIFIED', () => {
        it('returns SET_PHONE_NUMBER route when phoneNumber is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              // phoneNumber is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
          );
        });

        it('returns VERIFY_IDENTITY route when phoneNumber exists', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              phoneNumber: '+1234567890',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
          );
        });
      });

      describe('when user verification state is REJECTED', () => {
        it('returns KYC_FAILED route', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'REJECTED',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
            isReturningSession: false,
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.KYC_FAILED,
          );
        });
      });
    });
  });

  describe('cardUserPhase routing', () => {
    it('routes to SIGN_UP when cardUserPhase is ACCOUNT', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'ACCOUNT' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', contactVerificationId: 'contact-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.SIGN_UP,
      );
    });

    it('routes to SIGN_UP when cardUserPhase is NOT ACCOUNT but contactVerificationId is missing', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHONE_NUMBER' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' }, // Missing contactVerificationId
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.SIGN_UP,
      );
    });

    it('routes to SET_PHONE_NUMBER when cardUserPhase is PHONE_NUMBER and contactVerificationId exists', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHONE_NUMBER' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', contactVerificationId: 'contact-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      );
    });

    it('routes to PERSONAL_DETAILS when cardUserPhase is PERSONAL_INFORMATION and verificationState is VERIFIED', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'VERIFIED',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
      );
    });

    it('routes to KYC_FAILED when cardUserPhase is PERSONAL_INFORMATION and verificationState is REJECTED', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'REJECTED',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.KYC_FAILED,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PERSONAL_INFORMATION and verificationState is PENDING', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'PENDING',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PERSONAL_INFORMATION and verificationState is UNVERIFIED', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'UNVERIFIED',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PERSONAL_INFORMATION and verificationState is undefined', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          // verificationState is undefined
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });

    it('routes to PHYSICAL_ADDRESS when cardUserPhase is PHYSICAL_ADDRESS, verificationState is VERIFIED, and countryOfNationality exists', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'VERIFIED',
          countryOfNationality: 'US',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS,
      );
    });

    it('routes to PERSONAL_DETAILS when cardUserPhase is PHYSICAL_ADDRESS, verificationState is VERIFIED, but countryOfNationality is missing', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'VERIFIED',
          // countryOfNationality is missing
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
      );
    });

    it('routes to KYC_FAILED when cardUserPhase is PHYSICAL_ADDRESS and verificationState is REJECTED', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'REJECTED',
          countryOfNationality: 'US',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.KYC_FAILED,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PHYSICAL_ADDRESS and verificationState is UNVERIFIED', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'UNVERIFIED',
          countryOfNationality: 'US',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PHYSICAL_ADDRESS and verificationState is PENDING', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          verificationState: 'PENDING',
          countryOfNationality: 'US',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });

    it('routes to VERIFY_IDENTITY when cardUserPhase is PHYSICAL_ADDRESS and verificationState is undefined', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          contactVerificationId: 'contact-123',
          // verificationState is undefined
          countryOfNationality: 'US',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });
  });

  describe('Navigation Options', () => {
    describe('PostEmailNavigationOptions', () => {
      let mockNavigation: Partial<NavigationProp<ParamListBase>>;

      beforeEach(() => {
        mockNavigation = {
          navigate: jest.fn(),
          goBack: jest.fn(),
        };

        jest.spyOn(Alert, 'alert');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('renders close button in header right', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        expect(getByTestId('exit-onboarding-button')).toBeTruthy();
      });

      it('displays exit confirmation alert when close button is pressed', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('exit-onboarding-button');
        fireEvent.press(closeButton);

        expect(Alert.alert).toHaveBeenCalledWith(
          'mocked_card.card_onboarding.exit_confirmation.title',
          'mocked_card.card_onboarding.exit_confirmation.message',
          expect.any(Array),
        );
      });

      it('navigates to WALLET.HOME when exit is confirmed in alert', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('exit-onboarding-button');
        fireEvent.press(closeButton);

        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        const destructiveButton = alertCall[2][1];

        destructiveButton.onPress();

        expect(mockNavigation.navigate).toHaveBeenCalledWith('WALLET_HOME');
      });

      it('has gestureEnabled set to false', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });

        expect(options.gestureEnabled).toBe(false);
      });

      it('renders empty header left', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderLeft = options.headerLeft as () => React.ReactElement;
        const headerLeftElement = HeaderLeft();

        expect(headerLeftElement).toBeTruthy();
      });

      it('renders empty header title', () => {
        const options = PostEmailNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderTitle = options.headerTitle as () => React.ReactElement;
        const headerTitleElement = HeaderTitle();

        expect(headerTitleElement).toBeTruthy();
      });
    });

    describe('KYCStatusNavigationOptions', () => {
      let mockNavigation: Partial<NavigationProp<ParamListBase>>;

      beforeEach(() => {
        mockNavigation = {
          navigate: jest.fn(),
          goBack: jest.fn(),
        };

        jest.spyOn(Alert, 'alert');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('renders close button in header right', () => {
        const options = KYCStatusNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        expect(getByTestId('exit-onboarding-button')).toBeTruthy();
      });

      it('navigates directly to WALLET.HOME without alert when close button is pressed', () => {
        const options = KYCStatusNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('exit-onboarding-button');
        fireEvent.press(closeButton);

        expect(Alert.alert).not.toHaveBeenCalled();
        expect(mockNavigation.navigate).toHaveBeenCalledWith('WALLET_HOME');
      });

      it('has gestureEnabled set to false', () => {
        const options = KYCStatusNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });

        expect(options.gestureEnabled).toBe(false);
      });

      it('renders empty header left', () => {
        const options = KYCStatusNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderLeft = options.headerLeft as () => React.ReactElement;
        const headerLeftElement = HeaderLeft();

        expect(headerLeftElement).toBeTruthy();
      });

      it('renders empty header title', () => {
        const options = KYCStatusNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderTitle = options.headerTitle as () => React.ReactElement;
        const headerTitleElement = HeaderTitle();

        expect(headerTitleElement).toBeTruthy();
      });
    });
  });

  describe('fetchUserData on mount', () => {
    it('calls fetchUserData when onboardingId exists and user is null', () => {
      const mockFetchUserData = jest.fn();
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: null,
        isLoading: false,
        sdk: {} as CardSDK,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: mockFetchUserData,
        isReturningSession: false,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockFetchUserData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-lock Management', () => {
    beforeEach(() => {
      mockStopListening.mockClear();
      mockStartListening.mockClear();
    });

    it('disables auto-lock when component mounts', () => {
      mockUseSelector.mockReturnValue(null);
      mockUseCardSDK.mockReturnValue({
        user: null,
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockStopListening).toHaveBeenCalledTimes(1);
    });

    it('re-enables auto-lock when component unmounts', () => {
      mockUseSelector.mockReturnValue(null);
      mockUseCardSDK.mockReturnValue({
        user: null,
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      const { unmount } = renderWithNavigation(<OnboardingNavigator />);

      expect(mockStartListening).not.toHaveBeenCalled();

      unmount();

      expect(mockStartListening).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keep Going Modal', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('shows keep going modal when isReturningSession is true and not on SIGN_UP route', () => {
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          verificationState: 'UNVERIFIED',
          phoneNumber: '+1234567890',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: true,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.objectContaining({
          screen: Routes.CARD.MODALS.CONFIRM_MODAL,
        }),
      );
    });

    it('does not show keep going modal when isReturningSession is false', () => {
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          verificationState: 'UNVERIFIED',
          phoneNumber: '+1234567890',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: false,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.anything(),
      );
    });

    it('does not show keep going modal when initialRouteName is SIGN_UP', () => {
      mockUseSelector.mockReturnValue(null); // No onboardingId means SIGN_UP route
      mockUseCardSDK.mockReturnValue({
        user: null,
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: true,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.anything(),
      );
    });

    it('does not show keep going modal when user verificationState is REJECTED', () => {
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          verificationState: 'REJECTED',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
        isReturningSession: true,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.anything(),
      );
    });
  });
});
