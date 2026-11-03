import { SubjectType } from '@metamask/permission-controller';
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import { captureException } from '@sentry/react-native';

import { SOLANA_WALLET_SNAP_ID } from '../SnapKeyring/SolanaWalletSnap';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../util/Logger';
import snapMethodMiddlewareBuilder, {
  trackSnapEvent,
} from './SnapsMethodMiddleware';

jest.mock('@metamask/snaps-rpc-methods', () => ({
  createSnapsMethodMiddleware: jest.fn(),
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

const mockBuiltEvent = {
  name: 'snap_action',
  properties: { snap_id: 'npm:@metamask/test' },
};
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  addSensitiveProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue(mockBuiltEvent),
};

jest.mock('../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => mockEventBuilder),
  },
}));

describe('trackSnapEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards event name, properties, and sensitiveProperties to analytics', () => {
    const payload = {
      event: 'snap_action',
      properties: { snap_id: 'npm:@metamask/test', action: 'install' },
      sensitiveProperties: { wallet_address: '0xabc' },
    };

    trackSnapEvent(payload);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      payload.event,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      payload.properties,
    );
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalledWith(
      payload.sensitiveProperties,
    );
    expect(mockEventBuilder.build).toHaveBeenCalled();
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });

  it('passes empty objects when no properties are provided', () => {
    const payload = {
      event: 'snap_minimal',
      properties: {},
      sensitiveProperties: {},
    };

    trackSnapEvent(payload);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      'snap_minimal',
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({});
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalledWith({});
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });
});

describe('snapMethodMiddlewareBuilder trackError', () => {
  const controllerMessenger = {} as Parameters<
    typeof snapMethodMiddlewareBuilder
  >[0];
  const error = new Error('snap failed');
  const eventId = 'event-id';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(captureException).mockReturnValue(eventId);
  });

  it('tags snap subject errors with feature and snap_id and returns the Sentry event id', () => {
    const origin = 'npm:@metamask/tron-wallet-snap';

    snapMethodMiddlewareBuilder(controllerMessenger, origin, SubjectType.Snap);

    const trackError = jest.mocked(createSnapsMethodMiddleware).mock.calls[0][1]
      .trackError;
    const returnedEventId = trackError(error);

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: 'snaps', snap_id: origin },
    });
    expect(returnedEventId).toBe(eventId);
  });

  it('reports website subject errors without a snap_id tag and returns the Sentry event id', () => {
    const origin = 'https://example.com/path?account=0xabc';

    snapMethodMiddlewareBuilder(
      controllerMessenger,
      origin,
      SubjectType.Website,
    );

    const trackError = jest.mocked(createSnapsMethodMiddleware).mock.calls[0][1]
      .trackError;
    const returnedEventId = trackError(error);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(returnedEventId).toBe(eventId);
  });

  describe('handled Solana snap fallback errors', () => {
    const solanaOrigin = SOLANA_WALLET_SNAP_ID;
    const otherSnapOrigin = 'npm:@metamask/tron-wallet-snap';
    const droppedLogMessage = 'Dropped handled Solana snap fallback error';

    beforeEach(() => {
      jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    });

    it('drops unsupported program address errors from the Solana snap', () => {
      const unsupportedProgramError = new Error('Unsupported program address');

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(unsupportedProgramError);

      expect(captureException).not.toHaveBeenCalled();
      expect(returnedEventId).toBe('');
      expect(Logger.log).toHaveBeenCalledWith(
        droppedLogMessage,
        'UNSUPPORTED_PROGRAM_ADDRESS',
        solanaOrigin,
      );
    });

    it('drops Solana error 8500000 from the Solana snap', () => {
      const solanaProgramError = new Error(
        "Solana error #8500000; Decode this error by running npx @solana/errors decode -- 8500000 'YQ=='",
      );
      solanaProgramError.name = 'SolanaError';

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(solanaProgramError);

      expect(captureException).not.toHaveBeenCalled();
      expect(returnedEventId).toBe('');
      expect(Logger.log).toHaveBeenCalledWith(
        droppedLogMessage,
        'SOLANA_ERROR_8500000',
        solanaOrigin,
      );
    });

    it('drops SolanaError 8500000 when the snap serializes an undefined cause', () => {
      const solanaProgramError = new Error(
        'Solana error #8500000; Decode this error by running `npx @solana/errors decode -- 8500000`',
      );
      solanaProgramError.name = 'SolanaError';
      // snaps-sdk getJsonError turns an undefined own `cause` into Error('undefined').
      solanaProgramError.cause = new Error('undefined');

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(solanaProgramError);

      expect(returnedEventId).toBe('');
      expect(captureException).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        droppedLogMessage,
        'SOLANA_ERROR_8500000',
        solanaOrigin,
      );
    });

    it('drops a stale background event id reported as an unknown error', () => {
      const staleBackgroundEventError = new Error('Unknown error');
      staleBackgroundEventError.cause = new Error(
        'A background event with the id of "stale-id" does not exist.',
      );

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(staleBackgroundEventError);

      expect(captureException).not.toHaveBeenCalled();
      expect(returnedEventId).toBe('');
      expect(Logger.log).toHaveBeenCalledWith(
        droppedLogMessage,
        'STALE_BACKGROUND_EVENT',
        solanaOrigin,
      );
    });

    it('reports unsupported program address errors from a non-Solana snap', () => {
      const unsupportedProgramError = new Error('Unsupported program address');

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        otherSnapOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(unsupportedProgramError);

      expect(captureException).toHaveBeenCalledWith(unsupportedProgramError, {
        tags: { feature: 'snaps', snap_id: otherSnapOrigin },
      });
      expect(returnedEventId).toBe(eventId);
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('reports a non-matching error from the Solana snap', () => {
      const unrelatedError = new Error('snap failed');

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(unrelatedError);

      expect(captureException).toHaveBeenCalledWith(unrelatedError, {
        tags: { feature: 'snaps', snap_id: solanaOrigin },
      });
      expect(returnedEventId).toBe(eventId);
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('reports an unknown error when the cause is not a stale background event', () => {
      const unknownError = new Error('Unknown error');
      unknownError.cause = new Error('network request failed');

      snapMethodMiddlewareBuilder(
        controllerMessenger,
        solanaOrigin,
        SubjectType.Snap,
      );

      const trackError = jest.mocked(createSnapsMethodMiddleware).mock
        .calls[0][1].trackError;
      const returnedEventId = trackError(unknownError);

      expect(captureException).toHaveBeenCalledWith(unknownError, {
        tags: { feature: 'snaps', snap_id: solanaOrigin },
      });
      expect(returnedEventId).toBe(eventId);
      expect(Logger.log).not.toHaveBeenCalled();
    });
  });
});
