import { MetaMetricsEvents } from '../../core/Analytics';
import createRPCMethodTrackingMiddleware from './rpcMethodTracking';

const mockMetrics = {
  isEnabled: jest.fn(),
  trackAfterInteractions: jest.fn(),
};

const handler = createRPCMethodTrackingMiddleware({
  metrics: mockMetrics,
  rateLimitSeconds: 1,
});

function getNext(timeout = 500) {
  let deferred: { resolve: (value: unknown) => void };
  const promise = new Promise((resolve) => {
    deferred = {
      resolve,
    };
  });
  const cb = () => deferred.resolve(undefined);
  let triggerNext: (value: unknown) => void;
  setTimeout(() => {
    deferred.resolve(undefined);
  }, timeout);
  return {
    executeMiddlewareStack: async () => {
      if (triggerNext) {
        triggerNext(() => cb());
      }
      return await deferred.resolve(undefined);
    },
    promise,
    next: (postReqHandler: (value: unknown) => void) => {
      triggerNext = postReqHandler;
    },
  };
}

const waitForSeconds = async (seconds: number) =>
  await new Promise((resolve) => setTimeout(resolve, 1000 * seconds));

describe('createRPCMethodTrackingMiddleware', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockMetrics.isEnabled.mockReturnValue(false);
  });

  describe('MetaMetrics is disabled', () => {
    beforeEach(() => {
      mockMetrics.isEnabled.mockReturnValue(false);
    });

    it('should not track any events', async () => {
      const req = {
        method: 'eth_sign',
        origin: 'some.dapp',
      };

      const res = {
        error: null,
      };
      const { executeMiddlewareStack, next } = getNext();
      handler(req, res, next);
      await executeMiddlewareStack();
      expect(mockMetrics.trackAfterInteractions).not.toHaveBeenCalled();
    });
  });

  describe('MetaMetrics is enabled', () => {
    beforeEach(() => {
      mockMetrics.isEnabled.mockReturnValue(true);
    });

    it(`should never track blocked methods such as 'metamask_getProviderState'`, () => {
      const req = {
        method: 'metamask_getProviderState',
        origin: 'some.dapp',
      };

      const res = {
        error: null,
      };
      const { next, executeMiddlewareStack } = getNext();
      handler(req, res, next);
      expect(mockMetrics.trackAfterInteractions).not.toHaveBeenCalled();
      executeMiddlewareStack();
    });

    it(`should always track non rate limited events such as 'eth_sign'`, async () => {
      const req = {
        method: 'eth_sign',
        origin: 'some.dapp',
      };

      const res = {
        error: null,
      };

      let callCount = 0;

      while (callCount < 3) {
        callCount += 1;
        const { next, executeMiddlewareStack } = getNext();
        handler(req, res, next);
        await executeMiddlewareStack();
        if (callCount !== 3) {
          await waitForSeconds(0.6);
        }
      }

      const expectedArgs = [
        MetaMetricsEvents.PROVIDER_METHOD_CALLED,
        {
          referrer: {
            url: 'some.dapp',
          },
          properties: {
            method: 'eth_sign',
          },
        },
      ];

      expect(mockMetrics.trackAfterInteractions).toHaveBeenCalledTimes(3);
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        1,
        ...expectedArgs,
      );
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        2,
        ...expectedArgs,
      );
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        3,
        ...expectedArgs,
      );
    });

    it(`should only track rate limited events when under threshold such as 'eth_requestAccounts'`, async () => {
      const req = {
        method: 'eth_requestAccounts',
        origin: 'some.dapp',
      };

      const res = {
        error: null,
      };

      let callCount = 0;

      while (callCount < 3) {
        callCount += 1;
        const { next, executeMiddlewareStack } = getNext();
        handler(req, res, next);
        await executeMiddlewareStack();
        if (callCount !== 3) {
          await waitForSeconds(0.6);
        }
      }

      const expectedArgs = [
        MetaMetricsEvents.PROVIDER_METHOD_CALLED,
        {
          referrer: {
            url: 'some.dapp',
          },
          properties: {
            method: 'eth_requestAccounts',
          },
        },
      ];

      expect(mockMetrics.trackAfterInteractions).toHaveBeenCalledTimes(2);
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        1,
        ...expectedArgs,
      );
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        2,
        ...expectedArgs,
      );
    });

    it(`should treat tracking methods as rate limited by default`, async () => {
      const req = {
        method: 'some_unknown_event',
        origin: 'some.dapp',
      };

      const res = {
        error: null,
      };

      let callCount = 0;

      while (callCount < 3) {
        callCount += 1;
        const { next, executeMiddlewareStack } = getNext();
        handler(req, res, next);
        await executeMiddlewareStack();
        if (callCount !== 3) {
          await waitForSeconds(0.6);
        }
      }

      const expectedArgs = [
        MetaMetricsEvents.PROVIDER_METHOD_CALLED,
        {
          referrer: {
            url: 'some.dapp',
          },
          properties: {
            method: 'some_unknown_event',
          },
        },
      ];

      expect(mockMetrics.trackAfterInteractions).toHaveBeenCalledTimes(2);
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        1,
        ...expectedArgs,
      );
      expect(mockMetrics.trackAfterInteractions).toHaveBeenNthCalledWith(
        2,
        ...expectedArgs,
      );
    });
  });
});
