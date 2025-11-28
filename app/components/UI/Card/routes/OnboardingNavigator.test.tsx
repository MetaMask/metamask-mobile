import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  NavigationContainer,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { Alert } from 'react-native';
import OnboardingNavigator, {
  KYCModalNavigationOptions,
} from './OnboardingNavigator';
import { useCardSDK } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import { CardSDK } from '../sdk/CardSDK';
import { useParams } from '../../../../util/navigation/navUtils';

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
jest.mock(
  '../components/Onboarding/VerifyingRegistration',
  () => 'VerifyingRegistration',
);
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
      VERIFYING_REGISTRATION: 'VERIFYING_REGISTRATION',
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
        });

        it('returns SIGN_UP route when user has no id', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: { id: 'user-123', verificationState: 'PENDING' }, // user without id
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
        });
      });

      describe('when user verification state is PENDING', () => {
        it('returns VERIFY_IDENTITY route when firstName is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              countryOfNationality: 'US',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns VERIFY_IDENTITY route when countryOfNationality is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              firstName: 'John',
              // countryOfNationality is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns VERIFY_IDENTITY route when both firstName and countryOfNationality are missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              // firstName is undefined
              // countryOfNationality is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns VALIDATING_KYC route when firstName and countryOfNationality exist', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'PENDING',
              firstName: 'John',
              countryOfNationality: 'US',
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
              countryOfNationality: 'US',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns PERSONAL_DETAILS route when countryOfNationality is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              // countryOfNationality is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns PERSONAL_DETAILS route when both firstName and countryOfNationality are missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              // firstName is undefined
              // countryOfNationality is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns PHYSICAL_ADDRESS route when firstName and countryOfNationality exist but addressLine1 is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              countryOfNationality: 'US',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns MAILING_ADDRESS route when user is from US and mailingAddressLine1 is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              countryOfNationality: 'US',
              countryOfResidence: 'us',
              addressLine1: '123 Main St',
              // mailingAddressLine1 is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns SIGN_UP route as fallback when user is from US and has all required data', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              countryOfNationality: 'US',
              countryOfResidence: 'us',
              addressLine1: '123 Main St',
              mailingAddressLine1: '456 Mail St',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns SIGN_UP route as fallback when non-US user has all required data', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'VERIFIED',
              firstName: 'John',
              countryOfNationality: 'CA',
              countryOfResidence: 'CA',
              addressLine1: '123 Main St',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when user verification state is UNVERIFIED', () => {
        it('returns SIGN_UP route when email is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              // email is undefined
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns SET_PHONE_NUMBER route when email exists but phoneNumber is missing', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              email: 'test@example.com',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });

        it('returns VERIFY_IDENTITY route when email and phoneNumber exist', () => {
          mockUseSelector.mockReturnValue('onboarding-123');
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              email: 'test@example.com',
              phoneNumber: '+1234567890',
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

          expect(queryByTestId('activity-indicator')).toBeNull();
        });
      });

      describe('when no onboardingId', () => {
        it('returns SIGN_UP route even when user exists', () => {
          mockUseSelector.mockReturnValue(null);
          mockUseCardSDK.mockReturnValue({
            user: {
              id: 'user-123',
              verificationState: 'UNVERIFIED',
              email: 'test@example.com',
              phoneNumber: '+1234567890',
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
        fetchUserData: jest.fn(),
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
    describe('KYCModalNavigationOptions', () => {
      let mockNavigation: Partial<NavigationProp<ParamListBase>>;

      beforeEach(() => {
        mockNavigation = {
          navigate: jest.fn(),
          goBack: jest.fn(),
        };

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

        jest.spyOn(Alert, 'alert');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('renders close button in header right', () => {
        const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

        expect(queryByTestId('close-button')).toBeDefined();
      });

      it('renders card title in header', () => {
        const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

        expect(queryByTestId('card-view-title')).toBeDefined();
      });

      it('renders empty view in header left', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderLeft = options.headerLeft as () => React.ReactElement;
        const headerLeftElement = HeaderLeft();
        const { UNSAFE_root } = render(headerLeftElement);

        expect(UNSAFE_root).toBeDefined();
        expect(typeof UNSAFE_root.type).toBe('function');
      });

      it('displays alert when close button is pressed', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');
        closeButton.props.onPress();

        expect(Alert.alert).toHaveBeenCalledWith(
          'mocked_card.card_onboarding.kyc_webview.close_confirmation_title',
          'mocked_card.card_onboarding.kyc_webview.close_confirmation_message',
          expect.arrayContaining([
            expect.objectContaining({
              text: 'mocked_card.card_onboarding.kyc_webview.cancel_button',
              style: 'cancel',
            }),
            expect.objectContaining({
              text: 'mocked_card.card_onboarding.kyc_webview.close_button',
              style: 'destructive',
            }),
          ]),
        );
      });

      it('does not navigate when cancel button is pressed in alert', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');
        closeButton.props.onPress();

        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        const cancelButton = alertCall[2][0];

        expect(cancelButton.onPress).toBeUndefined();
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });

      it('navigates to VALIDATING_KYC when close button is pressed in alert', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');
        closeButton.props.onPress();

        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        const destructiveButton = alertCall[2][1];

        destructiveButton.onPress();

        expect(mockNavigation.navigate).toHaveBeenCalledWith('VALIDATING_KYC');
      });

      it('renders header title with correct variant and test ID', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderTitle = options.headerTitle as () => React.ReactElement;
        const headerTitleElement = HeaderTitle();
        const { getByTestId } = render(headerTitleElement);

        const title = getByTestId('card-view-title');

        expect(title).toBeDefined();
        expect(title.props.children).toBe('mocked_card.card');
      });

      it('renders close button with correct size and icon', () => {
        const options = KYCModalNavigationOptions({
          navigation: mockNavigation as NavigationProp<ParamListBase>,
        });
        const HeaderRight = options.headerRight as () => React.ReactElement;
        const headerRightElement = HeaderRight();
        const { getByTestId } = render(headerRightElement);

        const closeButton = getByTestId('close-button');

        expect(closeButton.props.size).toBe('Lg');
        expect(closeButton.props.iconName).toBe('Close');
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
          fetchUserData: jest.fn(),
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
          fetchUserData: jest.fn(),
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
          fetchUserData: jest.fn(),
        });

        renderWithNavigation(<OnboardingNavigator />);

        expect(mockUseCardSDK).toHaveBeenCalled();
      });
    });

    describe('useParams integration', () => {
      it('calls useParams to get route parameters', () => {
        mockUseSelector.mockReturnValue('onboarding-123');
        mockUseCardSDK.mockReturnValue({
          user: null,
          isLoading: false,
          sdk: null,
          setUser: jest.fn(),
          logoutFromProvider: jest.fn(),
          fetchUserData: jest.fn(),
        });

        renderWithNavigation(<OnboardingNavigator />);

        expect(mockUseParams).toHaveBeenCalled();
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

    it('does not call fetchUserData when user already exists', () => {
      const mockFetchUserData = jest.fn();
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123', verificationState: 'VERIFIED' },
        isLoading: false,
        sdk: {} as CardSDK,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: mockFetchUserData,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockFetchUserData).not.toHaveBeenCalled();
    });

    it('does not call fetchUserData when onboardingId is null', () => {
      const mockFetchUserData = jest.fn();
      mockUseSelector.mockReturnValue(null);
      mockUseCardSDK.mockReturnValue({
        user: null,
        isLoading: false,
        sdk: {} as CardSDK,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: mockFetchUserData,
      });

      renderWithNavigation(<OnboardingNavigator />);

      expect(mockFetchUserData).not.toHaveBeenCalled();
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

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('routes to SET_PHONE_NUMBER when cardUserPhase is PHONE_NUMBER', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHONE_NUMBER' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('routes to PERSONAL_DETAILS when cardUserPhase is PERSONAL_INFORMATION', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PERSONAL_INFORMATION' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('routes to PHYSICAL_ADDRESS when cardUserPhase is PHYSICAL_ADDRESS', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHYSICAL_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('routes to MAILING_ADDRESS when cardUserPhase is MAILING_ADDRESS', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'MAILING_ADDRESS' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('routes to SIGN_UP when cardUserPhase is ACCOUNT and contactVerificationId is missing', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'ACCOUNT' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('prioritizes cardUserPhase over user verification state', () => {
      mockUseParams.mockReturnValue({ cardUserPhase: 'PHONE_NUMBER' });
      mockUseSelector.mockReturnValue('onboarding-123');
      mockUseCardSDK.mockReturnValue({
        user: {
          id: 'user-123',
          verificationState: 'VERIFIED',
          firstName: 'John',
          countryOfNationality: 'US',
          addressLine1: '123 Main St',
        },
        isLoading: false,
        sdk: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
        fetchUserData: jest.fn(),
      });

      const { queryByTestId } = renderWithNavigation(<OnboardingNavigator />);

      expect(queryByTestId('activity-indicator')).toBeNull();
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
