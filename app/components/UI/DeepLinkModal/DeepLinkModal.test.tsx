import { renderScreen } from '../../../util/test/renderWithProvider';
import { DeepLinkModal } from './';
import { fireEvent, act } from '@testing-library/react-native';
import { useParams } from '../../../util/navigation/navUtils';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { setDeepLinkModalDisabled } from '../../../actions/settings';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useNavigation } from '@react-navigation/native';
import { Linking, Platform } from 'react-native';
import { createDeepLinkUsedEventBuilder } from '../../../util/deeplinks/deepLinkAnalytics';

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../components/hooks/useMetrics');

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

jest.mock('../../../util/metrics', () =>
  jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

// Mock the analytics utilities
jest.mock('../../../util/deeplinks/deepLinkAnalytics', () => ({
  createDeepLinkUsedEventBuilder: jest.fn(),
}));

jest.mock(
  '../../../core/DeeplinkManager/types/deepLinkAnalytics.types',
  () => ({
    InterstitialState: {
      ACCEPTED: 'accepted',
      REJECTED: 'rejected',
      NOT_SHOWN: 'not shown',
      SKIPPED: 'skipped',
    },
    SignatureStatus: {
      VALID: 'valid',
      INVALID: 'invalid',
      MISSING: 'missing',
    },
    DeepLinkRoute: {
      HOME: 'home',
      SWAP: 'swap',
      PERPS: 'perps',
      DEPOSIT: 'deposit',
      TRANSACTION: 'transaction',
      BUY: 'buy',
      INVALID: 'invalid',
    },
  }),
);

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

(useNavigation as jest.Mock).mockReturnValue({
  navigate: mockNavigate,
  goBack: mockGoBack,
} as never);

describe('DeepLinkModal', () => {
  const mockOnContinue = jest.fn();
  const mockOnBack = jest.fn();
  const baseParams = {
    pageTitle: 'MetaMask',
    onContinue: mockOnContinue,
    onBack: mockOnBack,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'public',
    });

    // Set up default mock for createDeepLinkUsedEventBuilder
    (createDeepLinkUsedEventBuilder as jest.Mock).mockImplementation(
      (context) => {
        interface MockBuilder {
          additionalProperties: Record<string, unknown>;
          addProperties: jest.MockedFunction<
            (props: Record<string, unknown>) => MockBuilder
          >;
          addSensitiveProperties: jest.MockedFunction<() => MockBuilder>;
          build: jest.MockedFunction<() => unknown>;
        }

        const mockBuilder: MockBuilder = {
          additionalProperties: {},
          addProperties: jest.fn().mockImplementation(function (
            this: MockBuilder,
            props: Record<string, unknown>,
          ) {
            this.additionalProperties = {
              ...this.additionalProperties,
              ...props,
            };
            return this;
          }),
          addSensitiveProperties: jest.fn().mockImplementation(function (
            this: MockBuilder,
          ) {
            return this;
          }),
          build: jest.fn().mockImplementation(function (this: MockBuilder) {
            return {
              name: 'Deep link Used',
              properties: {
                route: 'invalid',
                was_app_installed: true,
                signature: 'missing',
                interstitial: context.interstitialAction || 'not shown',
                attribution_id: '',
                utm_source: '',
                utm_medium: '',
                utm_campaign: '',
                utm_term: '',
                utm_content: '',
                target: '',
                ...this.additionalProperties,
              },
              sensitiveProperties: {},
              saveDataRecording: true,
            };
          }),
        };
        return Promise.resolve(mockBuilder);
      },
    );
  });

  it('renders public link UI', () => {
    const { getByText, queryByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

    const title = getByText('Proceed with caution');
    const description = getByText(
      /You were sent here by a third party, not MetaMask. You'll open MetaMask if you continue./i,
    );
    const checkbox = queryByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(checkbox).not.toBeOnTheScreen();
  });

  it('renders private link UI', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

    const title = getByText('Redirecting you to MetaMask');
    const description = getByText(/You'll open MetaMask if you continue./i);
    const checkbox = getByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(checkbox).toBeOnTheScreen();
  });

  it('calls onContinue when primary CTA is pressed', async () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const continueButton = getByText('Continue');

    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('renders invalid link UI', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'invalid',
    });
    const { getByText, queryByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

    const title = getByText(/This page doesn't exist/i);
    const description = getByText(
      /We can't find the page you're looking for./i,
    );
    const goToHomeButton = getByText('Go to the home page');
    const storeLinkText = getByText(
      "Update to the latest version of MetaMask and we'll take you to the right place.",
    );
    const checkbox = queryByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(goToHomeButton).toBeOnTheScreen();
    expect(storeLinkText).toBeOnTheScreen();
    expect(checkbox).not.toBeOnTheScreen(); // Checkbox only for private link
  });

  describe('store link', () => {
    const originalPlatformOS = Platform.OS;

    afterEach(() => {
      // Restore the original Platform.OS after each test
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatformOS,
        writable: true,
        configurable: true,
      });
    });

    it('opens app store when store link is pressed on iOS', async () => {
      (useParams as jest.Mock).mockReturnValue({
        ...baseParams,
        linkType: 'invalid',
      });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const storeLink = getByText('Update to the latest version of MetaMask');

      await act(async () => {
        fireEvent.press(storeLink);
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'itms-apps://apps.apple.com/app/metamask-blockchain-wallet/id1438144202',
      );
    });

    it('opens play store when store link is pressed on Android', async () => {
      // Mock Platform.OS to return 'android' for this specific test
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      });

      (useParams as jest.Mock).mockReturnValue({
        ...baseParams,
        linkType: 'invalid',
      });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const storeLink = getByText('Update to the latest version of MetaMask');

      await act(async () => {
        fireEvent.press(storeLink);
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'market://details?id=io.metamask',
      );
    });
  });

  it('navigates to home page when primary button is pressed for invalid link', async () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'invalid',
      onContinue: mockOnContinue, // onContinue is now provided for invalid links
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const continueButton = getByText('Go to the home page');

    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'WalletView',
      },
    });
    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('toggles checkbox and dispatches action', async () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const checkbox = getByText(/Don't remind me again/i);

    await act(async () => {
      fireEvent.press(checkbox);
    });

    expect(mockDispatch).toHaveBeenCalledWith(setDeepLinkModalDisabled(true));

    // Toggle again
    await act(async () => {
      fireEvent.press(checkbox);
    });

    expect(mockDispatch).toHaveBeenCalledWith(setDeepLinkModalDisabled(false));
  });

  it.each`
    linkType     | continueButtonText
    ${'public'}  | ${'Continue'}
    ${'private'} | ${'Continue'}
  `(
    'calls onContinue when continue button is pressed for $linkType link',
    async ({ linkType, continueButtonText }) => {
      (useParams as jest.Mock).mockReturnValue({ ...baseParams, linkType });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const continueButton = getByText(continueButtonText);

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockOnContinue).toHaveBeenCalled();
    },
  );

  it.each`
    linkType
    ${'public'}
    ${'private'}
    ${'invalid'}
  `(
    'calls onBack when back button is pressed for $linkType link',
    async ({ linkType }) => {
      (useParams as jest.Mock).mockReturnValue({ ...baseParams, linkType });
      const { getByTestId } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const dismissButton = getByTestId('deep-link-modal-close-button');

      await act(async () => {
        fireEvent.press(dismissButton);
      });

      expect(mockOnBack).toHaveBeenCalled();
    },
  );
});
