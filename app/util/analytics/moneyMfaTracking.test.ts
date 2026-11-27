import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';
import {
  getErrorName,
  getMoneyUpgradeStepFailure,
  trackMoneyMfaSetupStatus,
  trackMoneyMpcSigningRequested,
} from './moneyMfaTracking';

jest.mock('./analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

jest.mock('../Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockTrackEvent = jest.mocked(analytics.trackEvent);

const ADDRESS = '0x1111111111111111111111111111111111111111';

describe('moneyMfaTracking', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMoneyUpgradeStepFailure', () => {
    it('maps a Money Account upgrade step error to its step', () => {
      const cause = new Error('unauthorized');

      const result = getMoneyUpgradeStepFailure({
        step: 'associate-address',
        terminal: true,
        cause,
      });

      expect(result).toStrictEqual({
        step: 'associate_address',
        isTerminal: true,
        cause,
      });
    });

    it.each([
      ['an unknown step', { step: 'something-else' }],
      ['a plain error', new Error('boom')],
      ['a non-object', 'boom'],
      ['null', null],
    ])('returns undefined for %s', (_label, error) => {
      expect(getMoneyUpgradeStepFailure(error)).toBeUndefined();
    });
  });

  describe('getErrorName', () => {
    it('returns the error name for an Error', () => {
      const error = new TypeError('bad');

      expect(getErrorName(error)).toBe('TypeError');
    });

    it('returns the value type for a non-Error', () => {
      expect(getErrorName('boom')).toBe('string');
    });
  });

  describe('trackMoneyMfaSetupStatus', () => {
    it('tracks Money MFA Setup Status Updated with the given properties', () => {
      const properties = {
        status: 'failed' as const,
        trigger: 'retry' as const,
        attempt: 2,
        duration_ms: 1200,
        failed_step: 'associate_address' as const,
        error_name: 'HttpError',
        is_terminal: false,
      };

      trackMoneyMfaSetupStatus(properties);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.MONEY_MFA_SETUP_STATUS_UPDATED,
        )
          .addProperties(properties)
          .build(),
      );
    });

    it('logs instead of throwing when tracking fails', () => {
      mockTrackEvent.mockImplementationOnce(() => {
        throw new Error('analytics down');
      });

      trackMoneyMfaSetupStatus({
        status: 'started',
        trigger: 'turn_on',
        attempt: 1,
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Money MFA setup status not tracked',
      );
    });
  });

  describe('trackMoneyMpcSigningRequested', () => {
    it('tracks a whitelisted request with its rule', () => {
      trackMoneyMpcSigningRequested(
        { method: 'signPersonalMessage', address: ADDRESS, message: '0x00' },
        { mfaRequired: false, rule: 'chomp-authentication' },
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.MONEY_MPC_SIGNING_REQUESTED,
        )
          .addProperties({
            signing_method: 'signPersonalMessage',
            mfa_required: false,
            whitelist_rule: 'chomp-authentication',
          })
          .build(),
      );
    });

    it('tracks a request that needs 2-step verification without a rule', () => {
      trackMoneyMpcSigningRequested(
        { method: 'signPersonalMessage', address: ADDRESS, message: '0x00' },
        { mfaRequired: true, reason: 'not whitelisted' },
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.MONEY_MPC_SIGNING_REQUESTED,
        )
          .addProperties({
            signing_method: 'signPersonalMessage',
            mfa_required: true,
          })
          .build(),
      );
    });

    it('logs instead of throwing when tracking fails', () => {
      mockTrackEvent.mockImplementationOnce(() => {
        throw new Error('analytics down');
      });

      trackMoneyMpcSigningRequested(
        { method: 'signPersonalMessage', address: ADDRESS, message: '0x00' },
        { mfaRequired: true, reason: 'not whitelisted' },
      );

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Money MPC signing request not tracked',
      );
    });
  });
});
