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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  StackActions: {
    replace: jest.fn(),
  },
}));

// Helper to create route props
const createMockRoute = (params = {}) => ({
  params,
  key: 'AccountStatus',
  name: 'AccountStatus' as const,
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({ colors: { text: { default: '#24292E' } } }),
}));

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
  });

  describe('Snapshots iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('renders correctly with type="not_exist"', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with type="found"', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'found' })} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with accountName in route params', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus
          route={createMockRoute({
            type: 'found',
            accountName: 'test@example.com',
          })}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Snapshots android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('renders correctly with type="not_exist"', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with type="found"', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'found' })} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with accountName in route params', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus
          route={createMockRoute({
            type: 'found',
            accountName: 'test@example.com',
          })}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Behavior Tests', () => {
    describe('Primary button interactions', () => {
      it('navigates to Rehydrate screen when type="found" and primary button is pressed', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        const { getByText } = renderWithProvider(
          <AccountStatus route={createMockRoute({ type: 'found' })} />,
        );
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

        const { getByText } = renderWithProvider(
          <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
        );
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

        const { getByText } = renderWithProvider(
          <AccountStatus
            route={createMockRoute({ type: 'found', oauthLoginSuccess: true })}
          />,
        );
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
        const { getByText } = renderWithProvider(
          <AccountStatus route={createMockRoute()} />,
        );
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

        const { getByText } = renderWithProvider(
          <AccountStatus route={createMockRoute({ type: 'found' })} />,
        );
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

        const { getByText } = renderWithProvider(
          <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
        );
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
      const { getByText } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'found' })} />,
      );

      const primaryButton = getByText(strings('account_status.log_in'));
      fireEvent.press(primaryButton);

      expect(trackOnboarding).toHaveBeenCalled();
    });

    it('calls trackOnboarding when primary button is pressed for new account', () => {
      const { getByText } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
      );

      const primaryButton = getByText(
        strings('account_status.create_new_wallet'),
      );
      fireEvent.press(primaryButton);

      expect(trackOnboarding).toHaveBeenCalled();
    });
  });

  describe('SafeAreaView Configuration', () => {
    it('uses SafeAreaView with top and bottom edges', () => {
      const { toJSON } = renderWithProvider(
        <AccountStatus route={createMockRoute({ type: 'not_exist' })} />,
      );
      const tree = toJSON();

      expect(tree).toBeTruthy();
      expect(JSON.stringify(tree)).toContain('top');
      expect(JSON.stringify(tree)).toContain('bottom');
    });
  });

  describe('Route params handling', () => {
    it('uses default type when route params are empty', () => {
      const { getByText } = renderWithProvider(
        <AccountStatus route={createMockRoute()} />,
      );
      // Default type is 'not_exist' which shows "Create a new wallet" button
      expect(
        getByText(strings('account_status.create_new_wallet')),
      ).toBeOnTheScreen();
    });

    it('renders with undefined route params', () => {
      const routeWithNoParams = {
        params: undefined,
        key: 'AccountStatus',
        name: 'AccountStatus' as const,
      };

      const { getByText } = renderWithProvider(
        <AccountStatus
          route={
            routeWithNoParams as unknown as ReturnType<typeof createMockRoute>
          }
        />,
      );
      // Should render with default type 'not_exist'
      expect(
        getByText(strings('account_status.create_new_wallet')),
      ).toBeOnTheScreen();
    });

    it('renders with all route params provided', () => {
      const { getByText } = renderWithProvider(
        <AccountStatus
          route={createMockRoute({
            type: 'found',
            accountName: 'user@example.com',
            oauthLoginSuccess: true,
            provider: 'google',
          })}
        />,
      );
      expect(getByText(strings('account_status.log_in'))).toBeOnTheScreen();
    });
  });
});
