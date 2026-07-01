import { addBreadcrumb } from '@sentry/react-native';
import Logger from '../Logger';
import {
  PERSIST_PAYLOAD_WARN_BYTES,
  trackPersistPayloadSize,
} from './persistPayloadTelemetry';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../Logger');

describe('persistPayloadTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing for payloads below the warning threshold', () => {
    trackPersistPayloadSize('persist:root', 'small');

    expect(Logger.log).not.toHaveBeenCalled();
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it('logs and breadcrumbs large persist payloads', () => {
    const largePayload = 'x'.repeat(PERSIST_PAYLOAD_WARN_BYTES);

    trackPersistPayloadSize(
      'persist:MultichainBalancesController',
      largePayload,
    );

    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('persist:MultichainBalancesController'),
    );
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'persist_storage',
        data: expect.objectContaining({
          key: 'persist:MultichainBalancesController',
          sizeBytes: PERSIST_PAYLOAD_WARN_BYTES,
        }),
      }),
    );
  });
});
