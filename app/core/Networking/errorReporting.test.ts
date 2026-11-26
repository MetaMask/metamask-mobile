import { CancelledError, onlineManager } from '@tanstack/react-query';
import Logger from '../../util/Logger';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { HttpError, OfflineError } from './errors';
import { reportNetworkFailure } from './errorReporting';

jest.mock('../../util/Logger', () => ({ error: jest.fn() }));
jest.mock('../../util/deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(),
}));

const intent = {
  feature: 'prices',
  operation: 'spot',
  expectedStatuses: [404],
};

describe('reportNetworkFailure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getNetworkConditions).mockReturnValue({
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    });
  });

  afterEach(() => onlineManager.setOnline(true));

  it.each([
    new CancelledError(),
    Object.assign(new Error(), { name: 'AbortError' }),
    new OfflineError(),
    new HttpError(404, 'example.com'),
  ])('does not report expected failures: %p', (error) => {
    reportNetworkFailure(error, intent, 1);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('does not report a failure while offline', () => {
    onlineManager.setOnline(false);
    reportNetworkFailure(new HttpError(503, 'example.com'), intent, 1);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('reports only allowlisted context and discards the raw error', () => {
    const raw = Object.assign(
      new Error('https://example.com/private?secret=x'),
      { status: 503, body: 'private' },
    );
    reportNetworkFailure(raw, intent, 3);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(new Error('HTTP 503'), {
      tags: {
        feature: 'prices',
        operation: 'spot',
        'http.status': 503,
        'network.tier': 'SLOW_CELLULAR',
        'hardware.tier': 'LOW',
        'latency.bucket': 'SLOW',
      },
      context: { name: 'networking', data: { host: undefined, attempt: 3 } },
    });
  });
});
