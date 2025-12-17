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
  KYCModalNavigationOptions,
  PersonalDetailsNavigationOptions,
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
        it('returns SET_PHONE_NUMBER route when phoneNumber is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              // phoneNumber is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

        it('returns PERSONAL_DETAILS route when phoneNumber exists but firstName is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              phoneNumber: '+1234567890',
              // firstName is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

        it('returns PERSONAL_DETAILS route when dateOfBirth is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              phoneNumber: '+1234567890',
              firstName: 'John',
              lastName: 'Doe',
              countryOfNationality: 'US',
              // dateOfBirth is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

        it('returns PHYSICAL_ADDRESS route when personal details exist but addressLine1 is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              phoneNumber: '+1234567890',
              firstName: 'John',
              lastName: 'Doe',
              countryOfNationality: 'US',
              dateOfBirth: '1990-01-01',
              // addressLine1 is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

        it('returns PHYSICAL_ADDRESS route when city is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              phoneNumber: '+1234567890',
              firstName: 'John',
              lastName: 'Doe',
              countryOfNationality: 'US',
              dateOfBirth: '1990-01-01',
              addressLine1: '123 Main St',
              // city is undefined
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

        it('returns VERIFY_IDENTITY route when all user data is complete', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              phoneNumber: '+1234567890',
              firstName: 'John',
              lastName: 'Doe',
              countryOfNationality: 'US',
              dateOfBirth: '1990-01-01',
              addressLine1: '123 Main St',
              city: 'New York',
              zip: '10001',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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

      describe('when user verification state is VERIFIED', () => {
        it('returns COMPLETE route regardless of user data completeness', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
            },
            isLoading: false,
            sdk: null,
            setUser: jest.fn(),
            logoutFromProvider: jest.fn(),
            fetchUserData: jest.fn(),
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
        it('returns SIGN_UP route regardless of user data', () => {
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
            fetchUserData: jest.fn(),
          });

          const { queryByTestId } = renderWithNavigation(
            <OnboardingNavigator />,
          );

          const stackNavigator = queryByTestId('stack-navigator');
          expect(stackNavigator).not.toBeNull();
          expect(stackNavigator?.props.initialRouteName).toBe(
            Routes.CARD.ONBOARDING.SIGN_UP,
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
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      );
    });

    it('routes to PERSONAL_DETAILS when cardUserPhase is PERSONAL_INFORMATION', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', contactVerificationId: 'contact-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
      );
    });

    it('routes to PHYSICAL_ADDRESS when cardUserPhase is PHYSICAL_ADDRESS', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', contactVerificationId: 'contact-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS,
      );
    });

    it('routes to MAILING_ADDRESS when cardUserPhase is MAILING_ADDRESS', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'MAILING_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', contactVerificationId: 'contact-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      const stackNavigator = queryByTestId('stack-navigator');
      expect(stackNavigator).not.toBeNull();
      expect(stackNavigator?.props.initialRouteName).toBe(
        Routes.CARD.ONBOARDING.MAILING_ADDRESS,
      );
    });
  });

  describe('Navigation Options', () => {
    describe('KYCModalNavigationOptions', () => {
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
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        expect(getByTestId('close-button')).toBeTruthy();
      });

      it('displays alert when close button is pressed', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');
        fireEvent.press(closeButton);

        expect(Alert.alert).toHaveBeenCalledWith(
          'mocked_card.card_onboarding.kyc_webview.close_confirmation_title',
          'mocked_card.card_onboarding.kyc_webview.close_confirmation_message',
          expect.any(Array),
        );
      });

      it('navigates to PERSONAL_DETAILS when close is confirmed in alert', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');
        fireEvent.press(closeButton);

        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        const destructiveButton = alertCall[2][1];

        destructiveButton.onPress();

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'PERSONAL_DETAILS',
        );
      });
    });

    describe('PersonalDetailsNavigationOptions', () => {
      let mockNavigation: Partial<NavigationProp<ParamListBase>>;

      beforeEach(() => {
        mockNavigation = {
          navigate: jest.fn(),
          goBack: jest.fn(),
        };
      });

      it('renders back button in header left', () => {
        const options = PersonalDetailsNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderLeft = options.headerLeft as () => React.ReactElement;
        const headerLeftElement = HeaderLeft();
        const { getByTestId } = render(headerLeftElement);

        expect(getByTestId('back-button')).toBeTruthy();
      });

      it('navigates to VERIFY_IDENTITY when back button is pressed', () => {
        const options = PersonalDetailsNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderLeft = options.headerLeft as () => React.ReactElement;
        const headerLeftElement = HeaderLeft();
        const { getByTestId } = render(headerLeftElement);

        const backButton = getByTestId('back-button');
        fireEvent.press(backButton);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
        );
      });

      it('renders empty header title', () => {
        const options = PersonalDetailsNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderTitle = options.headerTitle as () => React.ReactElement;
        const headerTitleElement = HeaderTitle();

        expect(headerTitleElement).toBeTruthy();
      });

      it('renders empty header right', () => {
        const options = PersonalDetailsNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();

        expect(headerRightElement).toBeTruthy();
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
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockFetchUserData).toHaveBeenCalledTimes(1);
    });
  });
});
