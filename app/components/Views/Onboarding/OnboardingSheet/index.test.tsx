import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OnboardingSheet from '.';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';

// Mock callback functions
const mockOnPressCreate = jest.fn();
const mockOnPressImport = jest.fn();
const mockOnPressContinueWithGoogle = jest.fn();
const mockOnPressContinueWithApple = jest.fn();

const mockNavigate = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: jest.fn(),
        onOpenBottomSheet: jest.fn(),
      }));
      return <View>{children}</View>;
    },
  );
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

const mockUseScreenPerformance = jest.fn();
const mockUseNavigationPerformance = jest.fn();

jest.mock('../../../../hooks/performance/useScreenPerformance', () => ({
  useScreenPerformance: (...args: unknown[]) =>
    mockUseScreenPerformance(...args),
}));

jest.mock('../../../../hooks/performance/useNavigationPerformance', () => ({
  useNavigationPerformance: (...args: unknown[]) =>
    mockUseNavigationPerformance(...args),
}));

describe('OnboardingSheet', () => {
  const defaultProps = {
    onDismiss: jest.fn(),
    onPressCreate: mockOnPressCreate,
    onPressImport: mockOnPressImport,
    onPressContinueWithGoogle: mockOnPressContinueWithGoogle,
    onPressContinueWithApple: mockOnPressContinueWithApple,
    createWallet: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with createWallet=false (import mode)', () => {
      const { getByText } = render(<OnboardingSheet {...defaultProps} />);
      expect(getByText(strings('onboarding.import_srp'))).toBeOnTheScreen();
    });

    it('emits onboarding sheet screen and navigation performance hooks', () => {
      render(<OnboardingSheet {...defaultProps} />);

      expect(mockUseScreenPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          screenId: 'onboarding_sheet',
          contentReady: true,
          isEmpty: false,
        }),
      );
      expect(mockUseNavigationPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationScreenId: 'onboarding_sheet',
          destinationReady: true,
        }),
      );
    });

    it('renders correctly with createWallet=true (create mode)', () => {
      const { getByText } = render(
        <OnboardingSheet {...defaultProps} createWallet />,
      );
      expect(
        getByText(strings('onboarding.continue_with_srp')),
      ).toBeOnTheScreen();
    });
  });

  describe('Behavior Tests', () => {
    it('renders without login callbacks and safely handles button presses', () => {
      const { getByText } = render(<OnboardingSheet onDismiss={jest.fn()} />);

      fireEvent.press(getByText(strings('onboarding.sign_in_with_google')));
      fireEvent.press(getByText(strings('onboarding.sign_in_with_apple')));
      fireEvent.press(getByText(strings('onboarding.import_srp')));

      expect(mockOnPressContinueWithGoogle).not.toHaveBeenCalled();
      expect(mockOnPressContinueWithApple).not.toHaveBeenCalled();
      expect(mockOnPressCreate).not.toHaveBeenCalled();
      expect(mockOnPressImport).not.toHaveBeenCalled();
    });

    describe('Google button interactions', () => {
      it('calls onPressContinueWithGoogle with createWallet=false when import mode', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const googleButton = getByText(
          strings('onboarding.sign_in_with_google'),
        );
        fireEvent.press(googleButton);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledWith(false);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithApple with createWallet=false when import mode', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const appleButton = getByText(strings('onboarding.sign_in_with_apple'));
        fireEvent.press(appleButton);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledWith(false);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithGoogle with createWallet=true when create mode', () => {
        const { getByText } = render(
          <OnboardingSheet {...defaultProps} createWallet />,
        );
        const googleButton = getByText(
          strings('onboarding.continue_with_google'),
        );
        fireEvent.press(googleButton);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledWith(true);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithApple with createWallet=true when create mode', () => {
        const { getByText } = render(
          <OnboardingSheet {...defaultProps} createWallet />,
        );
        const appleButton = getByText(
          strings('onboarding.continue_with_apple'),
        );
        fireEvent.press(appleButton);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledWith(true);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledTimes(1);
      });
    });

    describe('SRP button interactions', () => {
      it('calls onPressImport when createWallet=false and SRP button is pressed', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const srpButton = getByText(strings('onboarding.import_srp'));

        fireEvent.press(srpButton);

        expect(mockOnPressImport).toHaveBeenCalledTimes(1);
        expect(mockOnPressCreate).not.toHaveBeenCalled();
      });

      it('calls onPressCreate when createWallet=true and SRP button is pressed', () => {
        const { getByText } = render(
          <OnboardingSheet {...defaultProps} createWallet />,
        );
        const srpButton = getByText(strings('onboarding.continue_with_srp'));

        fireEvent.press(srpButton);

        expect(mockOnPressCreate).toHaveBeenCalledTimes(1);
        expect(mockOnPressImport).not.toHaveBeenCalled();
      });
    });

    describe('OnboardingSheet - Terms & Privacy', () => {
      afterEach(() => {
        mockNavigate.mockReset();
      });

      it('navigates to Terms of Use when terms link is pressed', () => {
        const { getByTestId } = render(<OnboardingSheet {...defaultProps} />);

        const termsLink = getByTestId('terms-of-use-link');
        fireEvent.press(termsLink);

        expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.SIMPLE, {
          url: AppConstants.URLS.TERMS_OF_USE_URL,
          title: strings('onboarding.terms_of_use'),
          hideShareButton: true,
          useGlassHeader: true,
        });
      });

      it('navigates to Privacy Notice when privacy link is pressed', () => {
        const { getByTestId } = render(<OnboardingSheet {...defaultProps} />);

        const privacyLink = getByTestId('privacy-notice-link');
        fireEvent.press(privacyLink);

        expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.SIMPLE, {
          url: AppConstants.URLS.PRIVACY_NOTICE,
          title: strings('onboarding.privacy_notice'),
          hideShareButton: true,
          useGlassHeader: true,
        });
      });
    });
  });
});
