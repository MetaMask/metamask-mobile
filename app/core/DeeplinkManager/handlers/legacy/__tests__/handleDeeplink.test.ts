import { handleDeeplink } from '../handleDeeplink';
import { checkForDeeplink } from '../../../../../actions/user';
import ReduxService from '../../../../redux';
import Logger from '../../../../../util/Logger';
import { AppStateEventProcessor } from '../../../../AppStateEventListener';
import SDKConnectV2 from '../../../../SDKConnectV2';
import { analytics } from '../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../Analytics/MetaMetrics.events';
import {
  DeepLinkRoute,
  SignatureStatus,
} from '../../../types/deepLinkAnalytics.types';
import { detectAppInstallation } from '../../../util/deeplinks/deepLinkAnalytics';

jest.mock('../../../../../actions/user', () => ({
  checkForDeeplink: jest.fn(() => ({ type: 'CHECK_FOR_DEEPLINK' })),
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isMwpDeeplink: jest.fn(),
    handleMwpDeeplink: jest.fn(),
  },
}));

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockBuild = jest.fn().mockReturnValue({ event: 'mocked' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
jest.mock('../../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: (...args: unknown[]) => mockAddProperties(...args),
      build: (...args: unknown[]) => mockBuild(...args),
    }),
  },
}));

jest.mock('../../../util/deeplinks/deepLinkAnalytics', () => ({
  detectAppInstallation: jest.fn(),
}));

describe('handleDeeplink', () => {
  const mockDispatch = ReduxService.store.dispatch as jest.Mock;
  const mockCheckForDeeplink = checkForDeeplink as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;
  const mockSetCurrentDeeplink =
    AppStateEventProcessor.setCurrentDeeplink as jest.Mock;
  const mockIsMwpDeeplink = SDKConnectV2.isMwpDeeplink as unknown as jest.Mock;
  const mockHandleMwpDeeplink = SDKConnectV2.handleMwpDeeplink as jest.Mock;
  const mockTrackEvent = analytics.trackEvent as jest.Mock;
  const mockDetectAppInstallation = detectAppInstallation as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMwpDeeplink.mockReturnValue(false);
  });

  it('processes valid URI and dispatch checkForDeeplink', () => {
    const testUri = 'metamask://test-deeplink';

    handleDeeplink({ uri: testUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(testUri, undefined);
    expect(mockCheckForDeeplink).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHECK_FOR_DEEPLINK' });
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('processes valid URI with source and passes source to setCurrentDeeplink', () => {
    const testUri = 'metamask://test-deeplink';
    const testSource = 'push-notification';

    handleDeeplink({ uri: testUri, source: testSource });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(testUri, testSource);
    expect(mockCheckForDeeplink).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHECK_FOR_DEEPLINK' });
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('handles undefined URI without processing', () => {
    handleDeeplink({ uri: undefined });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('handles empty string URI without processing', () => {
    handleDeeplink({ uri: '' });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('handles non-string URI without processing', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Testing runtime behavior with invalid type
    handleDeeplink({ uri: 123 });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('handles complex URI schemes', () => {
    const complexUri =
      'metamask://dapp/connect?url=https://example.com&chainId=1';

    handleDeeplink({ uri: complexUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(complexUri, undefined);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHECK_FOR_DEEPLINK' });
  });

  it('handles errors gracefully and log them', () => {
    const testUri = 'metamask://test';
    const mockError = new Error('Test error');

    mockSetCurrentDeeplink.mockImplementationOnce(() => {
      throw mockError;
    });

    handleDeeplink({ uri: testUri });

    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Deeplink: Error parsing deeplink',
    );
  });

  it('handles dispatch errors gracefully', () => {
    const testUri = 'metamask://test';
    const mockError = new Error('Dispatch error');

    mockDispatch.mockImplementationOnce(() => {
      throw mockError;
    });

    handleDeeplink({ uri: testUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(testUri, undefined);
    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Deeplink: Error parsing deeplink',
    );
  });

  it('handles options object without uri parameter', () => {
    handleDeeplink({});

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  describe('MWP deeplink handling', () => {
    const mwpUri = 'metamask://mwp/some-compressed-payload';

    beforeEach(() => {
      mockIsMwpDeeplink.mockReturnValue(true);
    });

    it('routes MWP deeplinks to SDKConnectV2 and bypasses the standard flow', () => {
      mockDetectAppInstallation.mockResolvedValue(true);

      handleDeeplink({ uri: mwpUri });

      expect(mockIsMwpDeeplink).toHaveBeenCalledWith(mwpUri);
      expect(mockHandleMwpDeeplink).toHaveBeenCalledWith(mwpUri);
      expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockCheckForDeeplink).not.toHaveBeenCalled();
    });

    it('fires DEEP_LINK_USED with route MMC_MWP and was_app_installed=true', async () => {
      mockDetectAppInstallation.mockResolvedValue(true);

      handleDeeplink({ uri: mwpUri });

      await flushPromises();

      expect(mockDetectAppInstallation).toHaveBeenCalled();
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.DEEP_LINK_USED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        route: DeepLinkRoute.MMC_MWP,
        signature: SignatureStatus.MISSING,
        was_app_installed: true,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mocked' });
    });

    it('fires DEEP_LINK_USED with was_app_installed=false for fresh installs', async () => {
      mockDetectAppInstallation.mockResolvedValue(false);

      handleDeeplink({ uri: mwpUri });

      await flushPromises();

      expect(mockAddProperties).toHaveBeenCalledWith({
        route: DeepLinkRoute.MMC_MWP,
        signature: SignatureStatus.MISSING,
        was_app_installed: false,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mocked' });
    });

    it('logs error when detectAppInstallation rejects', async () => {
      const installError = new Error('install check failed');
      mockDetectAppInstallation.mockRejectedValue(installError);

      handleDeeplink({ uri: mwpUri });

      await flushPromises();

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        installError,
        'DeepLinkAnalytics: Failed to track MWP deep link event',
      );
    });

    it('still routes to SDKConnectV2 even if analytics fails', async () => {
      mockDetectAppInstallation.mockRejectedValue(new Error('oops'));

      handleDeeplink({ uri: mwpUri });

      expect(mockHandleMwpDeeplink).toHaveBeenCalledWith(mwpUri);

      await flushPromises();

      expect(mockHandleMwpDeeplink).toHaveBeenCalledTimes(1);
    });
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
