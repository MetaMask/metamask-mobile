import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import AccountStatus from '.';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { strings } from '../../../../locales/i18n';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: mockSetOptions,
  dispatch: mockDispatch,
};

const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  StackActions: {
    replace: jest.fn(),
  },
}));

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
    mockRoute.params = {};
  });

  describe('Snapshots', () => {
    it('renders correctly with type="not_exist"', () => {
      const { toJSON } = render(<AccountStatus type="not_exist" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with type="found"', () => {
      const { toJSON } = render(<AccountStatus type="found" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly with accountName in route params', () => {
        mockRoute.params = { accountName: 'test@example.com' };
        const { toJSON } = render(<AccountStatus type="found" />);
        expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Behavior Tests', () => {
    it('sets up navigation header correctly', () => {
      render(<AccountStatus />);

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      expect(setOptionsCall.headerLeft).toBeDefined();
      expect(setOptionsCall.headerRight).toBeDefined();
    });

    describe('Primary button interactions', () => {
      it('navigates to Rehydrate screen when type="found" and primary button is pressed', () => {
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        const { getByText } = render(<AccountStatus type="found" />);
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

        const { getByText } = render(<AccountStatus type="not_exist" />);
        const primaryButton = getByText(strings('account_status.create_new_wallet'));

        fireEvent.press(primaryButton);

        expect(StackActions.replace).toHaveBeenCalledWith('ChoosePassword', {
          previous_screen: 'Onboarding',
          oauthLoginSuccess: undefined,
        });
        expect(mockDispatch).toHaveBeenCalledWith(mockReplace);
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('passes oauthLoginSuccess from route params', () => {
        mockRoute.params = { oauthLoginSuccess: true };
        const mockReplace = jest.fn();
        (StackActions.replace as jest.Mock).mockReturnValue(mockReplace);

        const { getByText } = render(<AccountStatus type="found" />);
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
        const { getByText } = render(<AccountStatus />);
        const secondaryButton = getByText('Use a different login method');

        fireEvent.press(secondaryButton);

        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    describe('Analytics tracking', () => {
      it('tracks WALLET_IMPORT_STARTED event when type="found"', () => {
        const mockBuild = jest.fn();
        const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));
        (MetricsEventBuilder.createEventBuilder as jest.Mock).mockImplementation(mockCreateEventBuilder);

        const { getByText } = render(<AccountStatus type="found" />);
        const primaryButton = getByText('Log in');

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(MetaMetricsEvents.WALLET_IMPORT_STARTED);
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });

      it('tracks WALLET_SETUP_STARTED event when type="not_exist"', () => {
        const mockBuild = jest.fn();
        const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));
        (MetricsEventBuilder.createEventBuilder as jest.Mock).mockImplementation(mockCreateEventBuilder);

        const { getByText } = render(<AccountStatus type="not_exist" />);
        const primaryButton = getByText('Create a new wallet');

        fireEvent.press(primaryButton);

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(MetaMetricsEvents.WALLET_SETUP_STARTED);
        expect(mockBuild).toHaveBeenCalled();
        expect(trackOnboarding).toHaveBeenCalled();
      });
    });
  });
});
