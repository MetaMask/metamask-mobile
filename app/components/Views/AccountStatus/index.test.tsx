import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import AccountStatus from '.';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { strings } from '../../../../locales/i18n';
import renderWithProvider from '../../../util/test/renderWithProvider';

import Routes from '../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import { AccountStatusSelectorIDs } from './AccountStatus.testIds';
import { AccountType } from '../../../constants/onboarding';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: mockDispatch,
};

let mockRouteParams:
  | {
      type?: string;
      accountName?: string;
      oauthLoginSuccess?: boolean;
      onboardingTraceCtx?: unknown;
      provider?: string;
    }
  | undefined = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    key: 'AccountStatus',
    name: 'AccountStatus',
    params: mockRouteParams,
  }),
  StackActions: {
    replace: jest.fn(),
  },
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () =>
  jest.fn(),
);

jest.mock('../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  },
}));

const getMockEventBuilder = () => {
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn().mockReturnThis();
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: mockAddProperties,
    build: mockBuild,
  }));
  (MetricsEventBuilder.createEventBuilder as jest.Mock).mockImplementation(
    mockCreateEventBuilder,
  );
  return { mockBuild, mockAddProperties, mockCreateEventBuilder };
};

describe('AccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  describe('Behavior Tests', () => {
    describe('Primary button interactions', () => {
      it('navigates to Rehydrate screen when type="found" and primary button is pressed', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        mockRouteParams = { type: 'found' };
        const { getByTestId } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByTestId(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
        );

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith(
          Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
          expect.objectContaining({
            [PREVIOUS_SCREEN]: Routes.ONBOARDING.ONBOARDING,
            oauthLoginSuccess: undefined,
          }),
        );
        expect(mockDispatch).toHaveBeenCalledWith(mockReplace);
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('navigates to ChoosePassword screen when type="not_exist" and primary button is pressed', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        mockRouteParams = { type: 'not_exist' };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText(
          strings('account_status.create_new_wallet'),
        );

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith(
          Routes.ONBOARDING.CHOOSE_PASSWORD,
          expect.objectContaining({
            [PREVIOUS_SCREEN]: Routes.ONBOARDING.ONBOARDING,
            oauthLoginSuccess: undefined,
          }),
        );
        expect(mockDispatch).toHaveBeenCalledWith(mockReplace);
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('passes oauthLoginSuccess from route params', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        mockRouteParams = { type: 'found', oauthLoginSuccess: true };
        const { getByTestId } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByTestId(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
        );

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith(
          Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
          expect.objectContaining({
            [PREVIOUS_SCREEN]: Routes.ONBOARDING.ONBOARDING,
            oauthLoginSuccess: true,
          }),
        );
      });
    });

    describe('Secondary button interactions', () => {
      it('navigates back when secondary button is pressed', () => {
        mockRouteParams = {};
        const { getByText } = renderWithProvider(<AccountStatus />);
        const secondaryButton = getByText('Use a different login method');

        fireEvent.press(secondaryButton);

        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    describe('Analytics tracking', () => {
      it('tracks ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED with account_type on mount when type="found"', () => {
        const { mockAddProperties, mockCreateEventBuilder } =
          getMockEventBuilder();

        mockRouteParams = { type: 'found', provider: 'google' };
        renderWithProvider(<AccountStatus />);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          account_type: AccountType.ImportedGoogle,
        });
      });

      it('tracks ACCOUNT_NOT_FOUND_PAGE_VIEWED with account_type on mount when type="not_exist"', () => {
        const { mockAddProperties, mockCreateEventBuilder } =
          getMockEventBuilder();

        mockRouteParams = { type: 'not_exist', provider: 'google' };
        renderWithProvider(<AccountStatus />);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.ACCOUNT_NOT_FOUND_PAGE_VIEWED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          account_type: AccountType.MetamaskGoogle,
        });
      });

      it('tracks WALLET_IMPORT_STARTED event with account_type when type="found"', () => {
        const { mockBuild, mockAddProperties, mockCreateEventBuilder } =
          getMockEventBuilder();

        mockRouteParams = { type: 'found', provider: 'google' };
        const { getByTestId } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByTestId(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
        );

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.WALLET_IMPORT_STARTED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          account_type: AccountType.ImportedGoogle,
        });
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('tracks WALLET_SETUP_STARTED event with account_type when type="not_exist"', () => {
        const { mockBuild, mockAddProperties, mockCreateEventBuilder } =
          getMockEventBuilder();

        mockRouteParams = { type: 'not_exist', provider: 'google' };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText('Create a new wallet');

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.WALLET_SETUP_STARTED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          account_type: AccountType.MetamaskGoogle,
        });
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });
    });
  });

  describe('Event Tracking', () => {
    it('calls trackOnboarding when primary button is pressed for existing account', () => {
      mockRouteParams = { type: 'found' };
      const { getByTestId } = renderWithProvider(<AccountStatus />);

      const primaryButton = getByTestId(
        AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
      );
      fireEvent.press(primaryButton);

      expect(trackOnboarding).toHaveBeenCalled();
    });

    it('calls trackOnboarding when primary button is pressed for new account', () => {
      mockRouteParams = { type: 'not_exist' };
      const { getByText } = renderWithProvider(<AccountStatus />);

      const primaryButton = getByText(
        strings('account_status.create_new_wallet'),
      );
      fireEvent.press(primaryButton);

      expect(trackOnboarding).toHaveBeenCalled();
    });
  });

  describe('Route params handling', () => {
    it('uses default type when route params are empty', () => {
      mockRouteParams = {};
      const { getByText } = renderWithProvider(<AccountStatus />);
      // Default type is 'not_exist' which shows "Create a new wallet" button
      expect(
        getByText(strings('account_status.create_new_wallet')),
      ).toBeOnTheScreen();
    });

    it('renders with undefined route params', () => {
      mockRouteParams = undefined;
      const { getByText } = renderWithProvider(<AccountStatus />);
      // Should render with default type 'not_exist'
      expect(
        getByText(strings('account_status.create_new_wallet')),
      ).toBeOnTheScreen();
    });

    it('renders with all route params provided', () => {
      mockRouteParams = {
        type: 'found',
        accountName: 'user@example.com',
        oauthLoginSuccess: true,
        provider: 'google',
      };
      const { getByTestId } = renderWithProvider(<AccountStatus />);
      expect(
        getByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON),
      ).toBeOnTheScreen();
    });
  });
});
