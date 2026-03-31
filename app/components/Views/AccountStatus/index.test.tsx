import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import AccountStatus from '.';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { strings } from '../../../../locales/i18n';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { Platform } from 'react-native';

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
      build: jest.fn(),
    })),
  },
}));

describe('AccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  describe('Snapshots iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('renders correctly with type="not_exist"', () => {
      mockRouteParams = { type: 'not_exist' };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with type="found"', () => {
      mockRouteParams = { type: 'found' };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with accountName in route params', () => {
      mockRouteParams = {
        type: 'found',
        accountName: 'test@example.com',
      };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Snapshots android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('renders correctly with type="not_exist"', () => {
      mockRouteParams = { type: 'not_exist' };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with type="found"', () => {
      mockRouteParams = { type: 'found' };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with accountName in route params', () => {
      mockRouteParams = {
        type: 'found',
        accountName: 'test@example.com',
      };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Behavior Tests', () => {
    describe('Primary button interactions', () => {
      it('navigates to Rehydrate screen when type="found" and primary button is pressed', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        mockRouteParams = { type: 'found' };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText(strings('account_status.log_in'));

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith('Rehydrate', {
          previous_screen: 'Onboarding',
          oauthLoginSuccess: undefined,
        });
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

        expect(StackActions.replace).toHaveBeenCalledWith('ChoosePassword', {
          previous_screen: 'Onboarding',
          oauthLoginSuccess: undefined,
        });
        expect(mockDispatch).toHaveBeenCalledWith(mockReplace);
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('passes oauthLoginSuccess from route params', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        mockRouteParams = { type: 'found', oauthLoginSuccess: true };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText(strings('account_status.log_in'));

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith('Rehydrate', {
          previous_screen: 'Onboarding',
          oauthLoginSuccess: true,
        });
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
      it('tracks WALLET_IMPORT_STARTED event when type="found"', () => {
        const mockBuild = jest.fn();
        const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));
        (
          MetricsEventBuilder.createEventBuilder as jest.Mock
        ).mockImplementation(mockCreateEventBuilder);

        mockRouteParams = { type: 'found' };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText('Log in');

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.WALLET_IMPORT_STARTED,
        );
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('tracks WALLET_SETUP_STARTED event when type="not_exist"', () => {
        const mockBuild = jest.fn();
        const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));
        (
          MetricsEventBuilder.createEventBuilder as jest.Mock
        ).mockImplementation(mockCreateEventBuilder);

        mockRouteParams = { type: 'not_exist' };
        const { getByText } = renderWithProvider(<AccountStatus />);
        const primaryButton = getByText('Create a new wallet');

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.WALLET_SETUP_STARTED,
        );
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });
    });
  });

  describe('Event Tracking', () => {
    it('calls trackOnboarding when primary button is pressed for existing account', () => {
      mockRouteParams = { type: 'found' };
      const { getByText } = renderWithProvider(<AccountStatus />);

      const primaryButton = getByText(strings('account_status.log_in'));
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

  describe('SafeAreaView Configuration', () => {
    it('uses SafeAreaView with top and bottom edges', () => {
      mockRouteParams = { type: 'not_exist' };
      const { toJSON } = renderWithProvider(<AccountStatus />);
      const tree = toJSON();

      expect(tree).toBeTruthy();
      expect(JSON.stringify(tree)).toContain('top');
      expect(JSON.stringify(tree)).toContain('bottom');
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
      const { getByText } = renderWithProvider(<AccountStatus />);
      expect(getByText(strings('account_status.log_in'))).toBeOnTheScreen();
    });
  });
});
