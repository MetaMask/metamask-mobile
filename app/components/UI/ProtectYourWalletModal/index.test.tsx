import React from 'react';
import ProtectYourWalletModal from './index';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { ProtectWalletModalSelectorsIDs } from './ProtectWalletModal.testIds';

const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockImplementation(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    name: 'Wallet Security Reminder Engaged',
    properties: { source: 'Modal', wallet_protection_required: false },
    saveDataRecording: true,
    sensitiveProperties: {},
  }),
}));

// Mock whenEngineReady to prevent Engine access after Jest teardown
jest.mock('../../../core/Analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

// Mock analytics module
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

// Mock useMetrics hook which is used by withMetricsAwareness HOC
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
    isEnabled: mockMetricsIsEnabled,
  }),
  withMetricsAwareness:
    (Component: React.ComponentType) => (props: Record<string, unknown>) => (
      <Component
        {...props}
        {...({
          metrics: {
            trackEvent: mockTrackEvent,
            createEventBuilder: mockCreateEventBuilder,
            isEnabled: mockMetricsIsEnabled,
          },
        } as Record<string, unknown>)}
      />
    ),
}));

const mockStore = configureMockStore();

const initialState = {
  user: {
    protectWalletModalVisible: true,
    passwordSet: true,
  },
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: null,
      },
    },
  },
};

const store = mockStore(initialState);

interface ProtectYourWalletModalProps {
  navigation?: {
    navigate: jest.Mock;
  };
}

const mockNavigation = {
  navigate: jest.fn(),
};

const defaultProps: ProtectYourWalletModalProps = {
  navigation: mockNavigation,
};

describe('ProtectYourWalletModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('render matches snapshot', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ProtectYourWalletModal {...defaultProps} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render title, top button and bottom button', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ProtectYourWalletModal {...defaultProps} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(getByText(strings('protect_wallet_modal.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('protect_wallet_modal.top_button')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('protect_wallet_modal.bottom_button')),
    ).toBeOnTheScreen();
  });

  it('render learn more button and open webview', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ProtectYourWalletModal {...defaultProps} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const learnMoreButton = getByTestId(
      ProtectWalletModalSelectorsIDs.LEARN_MORE_BUTTON,
    );
    expect(learnMoreButton).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(learnMoreButton);
    });

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
          title: strings('protect_wallet_modal.title'),
        },
      });
    });
  });

  it('render cancel button and onDismiss track event', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ProtectYourWalletModal {...defaultProps} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const cancelButton = getByTestId(
      ProtectWalletModalSelectorsIDs.CANCEL_BUTTON,
    );
    expect(cancelButton).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(cancelButton);
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wallet Security Reminder Engaged',
          properties: { source: 'Modal', wallet_protection_required: false },
          saveDataRecording: true,
          sensitiveProperties: {},
        }),
      );
    });
  });

  it('navigates to set password flow when cancel button is pressed', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ProtectYourWalletModal {...defaultProps} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const cancelButton = getByTestId(
      ProtectWalletModalSelectorsIDs.CANCEL_BUTTON,
    );
    expect(cancelButton).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(cancelButton);
    });

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SetPasswordFlow', {
        screen: 'AccountBackupStep1',
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wallet Security Reminder Engaged',
          properties: { source: 'Modal', wallet_protection_required: false },
          saveDataRecording: true,
          sensitiveProperties: {},
        }),
      );
    });
  });

  it('render matches snapshot when isSeedlessOnboardingLoginFlow is true', () => {
    const { toJSON, queryByText } = renderWithProvider(
      <ProtectYourWalletModal />,
      {
        state: {
          ...initialState,
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'Vault string',
              },
            },
          },
        },
      },
    );
    expect(toJSON()).toMatchSnapshot();
    expect(queryByText(strings('protect_wallet_modal.title'))).toBeNull();
  });
});
