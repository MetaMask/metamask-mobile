import {
  trackForcedReset,
  trackForgotPasswordBackupOffered,
} from './accountAccessTracking';
import { UnlockWalletErrorType } from '../../core/Authentication/types';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

jest.mock('./analytics');
jest.mock('./AnalyticsEventBuilder');
jest.mock('../Logger');

const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;
const mockedAnalyticsEventBuilder = AnalyticsEventBuilder as jest.Mocked<
  typeof AnalyticsEventBuilder
>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('accountAccessTracking', () => {
  const mockEventBuilder = {
    addProperties: jest.fn(),
    build: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAnalytics.trackEvent.mockImplementation(() => undefined);

    mockedAnalyticsEventBuilder.createEventBuilder.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.addProperties.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.build.mockReturnValue({ event: 'test' });
  });

  describe('trackForcedReset', () => {
    it('tracks the forced reset event with the classified error type', () => {
      trackForcedReset(UnlockWalletErrorType.UNRECOGNIZED_ERROR, true);

      expect(
        mockedAnalyticsEventBuilder.createEventBuilder,
      ).toHaveBeenCalledWith(MetaMetricsEvents.ACCOUNT_ACCESS_FORCED_RESET);
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        unlock_error_type: UnlockWalletErrorType.UNRECOGNIZED_ERROR,
        forced_reset: true,
      });
      expect(mockedAnalytics.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
    });

    it('logs error and does not throw when trackEvent fails', () => {
      mockedAnalytics.trackEvent.mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      expect(() => {
        trackForcedReset(UnlockWalletErrorType.VAULT_CORRUPTION, false);
      }).not.toThrow();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error tracking account access forced reset event - analytics tracking failed',
      );
    });
  });

  describe('trackForgotPasswordBackupOffered', () => {
    it('tracks whether a backup restore was offered', () => {
      trackForgotPasswordBackupOffered(true);

      expect(
        mockedAnalyticsEventBuilder.createEventBuilder,
      ).toHaveBeenCalledWith(
        MetaMetricsEvents.ACCOUNT_ACCESS_FORGOT_PASSWORD_BACKUP_OFFERED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        backup_offered: true,
      });
      expect(mockedAnalytics.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
    });

    it('logs error and does not throw when trackEvent fails', () => {
      mockedAnalytics.trackEvent.mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      expect(() => {
        trackForgotPasswordBackupOffered(false);
      }).not.toThrow();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error tracking forgot password backup offered event - analytics tracking failed',
      );
    });
  });
});
