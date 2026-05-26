import React, { ComponentType } from 'react';
import { Image, Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  AccountType,
  WalletCreationErrorCtaType,
} from '../../../constants/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { Authentication } from '../../../core';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';

const defaultAccountType = AccountType.MetamaskGoogle;

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

  const renderSheet = (
    props: { error?: Error; accountType?: AccountType } = {},
    state = initialState,
  ) =>
    renderWithProvider(
      <SocialLoginErrorSheet
        error={props.error ?? mockError}
        accountType={props.accountType ?? defaultAccountType}
      />,
      { state },
    );

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
      renderSheet();

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks screen viewed event with explicit account_type prop', () => {
      renderSheet({ accountType: AccountType.MetamaskGoogle });

      expect(mockAddProperties).toHaveBeenCalledWith({
        account_type: AccountType.MetamaskGoogle,
        error_type: 'Error',
        error_message: 'Test social login error',
      });
    });

    it('uses explicit account_type instead of seedless auth connection state', () => {
      renderSheet(
        { accountType: AccountType.MetamaskApple },
        stateWithGoogleOAuth,
      );

      expect(mockAddProperties).toHaveBeenCalledWith({
        account_type: AccountType.MetamaskApple,
        error_type: 'Error',
        error_message: 'Test social login error',
      });
    });

    it('tracks retry clicked event when Try again is pressed', async () => {
      (Authentication.deleteWallet as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = renderSheet();

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('Try again'));

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_CTA_CLICKED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          cta_type: WalletCreationErrorCtaType.Retry,
          account_type: AccountType.MetamaskGoogle,
        });
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });

    it('tracks support clicked event when MetaMask Support is pressed', () => {
      const { getByText } = renderSheet();

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('MetaMask Support'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_CTA_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        cta_type: WalletCreationErrorCtaType.ContactSupport,
        account_type: AccountType.MetamaskGoogle,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('renders error title', () => {
    const { getByText } = renderSheet({}, initialState);

    expect(getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('renders try again button', () => {
    const { getByText } = renderSheet({}, initialState);

    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('renders MetaMask Support link', () => {
    const { getByText } = renderSheet({}, initialState);

    expect(getByText('MetaMask Support')).toBeOnTheScreen();
  });

  it('deletes wallet and resets navigation when try again is pressed', async () => {
    (Authentication.deleteWallet as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = renderSheet({}, initialState);
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
    const { getByText } = renderSheet({}, initialState);
    const supportLink = getByText('MetaMask Support');

    fireEvent.press(supportLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.REVIEW_PROMPT.SUPPORT,
    );
  });

  it('renders fox logo image', () => {
    const { UNSAFE_getAllByType } = renderSheet({}, initialState);

    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders danger icon', () => {
    const { UNSAFE_getAllByType } = renderSheet({}, initialState);

    const icons = UNSAFE_getAllByType(asComponentType('SvgMock'));
    expect(icons.length).toBeGreaterThan(0);
  });
});
