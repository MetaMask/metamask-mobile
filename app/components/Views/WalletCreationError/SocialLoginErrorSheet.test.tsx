import React, { ComponentType } from 'react';
import { Image, Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { AccountType } from '../../../constants/onboarding';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { Authentication } from '../../../core';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';

// Type helper for UNSAFE_getAllByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    deleteWallet: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

const mockError = new Error('Test social login error');

describe('SocialLoginErrorSheet', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  const stateWithGoogleOAuth = {
    engine: {
      backgroundState: {
        ...backgroundState,
        SeedlessOnboardingController: {
          ...backgroundState.SeedlessOnboardingController,
          authConnection: AuthConnection.Google,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({});
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analytics', () => {
    it('tracks screen viewed event on mount', () => {
      renderWithProvider(<SocialLoginErrorSheet error={mockError} />, {
        state: initialState,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks screen viewed event with account_type from getSocialAccountType when OAuth provider is unknown', () => {
      renderWithProvider(<SocialLoginErrorSheet error={mockError} />, {
        state: initialState,
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        account_type: AccountType.Metamask,
        error_type: 'Error',
        error_message: 'Test social login error',
      });
    });

    it('tracks screen viewed event with metamask_google when Google OAuth is in seedless state', () => {
      renderWithProvider(<SocialLoginErrorSheet error={mockError} />, {
        state: stateWithGoogleOAuth,
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        account_type: AccountType.MetamaskGoogle,
        error_type: 'Error',
        error_message: 'Test social login error',
      });
    });

    it('tracks retry clicked event when Try again is pressed', async () => {
      (Authentication.deleteWallet as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
        { state: initialState },
      );

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('Try again'));

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalled();
        expect(mockAddProperties).toHaveBeenCalledWith({
          account_type: AccountType.Metamask,
        });
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });

    it('tracks support clicked event when MetaMask Support is pressed', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginErrorSheet error={mockError} />,
        { state: initialState },
      );

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('MetaMask Support'));

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith({
        account_type: AccountType.Metamask,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('renders error title', () => {
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    expect(getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('renders try again button', () => {
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('renders MetaMask Support link', () => {
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    expect(getByText('MetaMask Support')).toBeOnTheScreen();
  });

  it('deletes wallet and resets navigation when try again is pressed', async () => {
    (Authentication.deleteWallet as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });
    const tryAgainButton = getByText('Try again');

    fireEvent.press(tryAgainButton);

    await waitFor(() => {
      expect(Authentication.deleteWallet).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
    });
  });

  it('opens support URL when MetaMask Support is pressed', () => {
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });
    const supportLink = getByText('MetaMask Support');

    fireEvent.press(supportLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.REVIEW_PROMPT.SUPPORT,
    );
  });

  it('renders fox logo image', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <SocialLoginErrorSheet />,
      {
        state: initialState,
      },
    );

    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders danger icon', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <SocialLoginErrorSheet />,
      {
        state: initialState,
      },
    );

    const icons = UNSAFE_getAllByType(asComponentType('SvgMock'));
    expect(icons.length).toBeGreaterThan(0);
  });
});
