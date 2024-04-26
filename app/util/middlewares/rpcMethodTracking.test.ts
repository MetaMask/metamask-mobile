import { MetaMetricsEvents } from '../../core/Analytics';
import createRPCMethodTrackingMiddleware from './rpcMethodTracking';

const mockMetrics = {
  isEnabled: jest.fn(),
  trackEvent: jest.fn(),
};

const createHandler = (
  opts?: Partial<Parameters<typeof createRPCMethodTrackingMiddleware>[0]>,
) =>
  createRPCMethodTrackingMiddleware({
    metrics: mockMetrics,
    rateLimitTimeout: 500,
    rateLimitSamplePercent: 0.1,
    globalRateLimitTimeout: 0,
    globalRateLimitMaxAmount: 0,
    ...opts,
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
      const handler = createHandler();
      handler(req, res, next);
      await executeMiddlewareStack();
      expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
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
      const handler = createHandler();
      handler(req, res, next);
      expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
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
        const handler = createHandler();
        handler(req, res, next);
        await executeMiddlewareStack();
        if (callCount !== 3) {
          await waitForSeconds(0.3);
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

      expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(3);
      expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
        1,
        ...expectedArgs,
      );
      expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
        2,
        ...expectedArgs,
      );
      expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
        3,
        ...expectedArgs,
      );
    });

    describe('events rated limited by timeout', () => {
      it.each([['wallet_requestPermissions'], ['eth_requestAccounts']])(
        `should only track '%s' events while the timeout rate limit is not active`,
        async (method) => {
          const req = {
            method,
            origin: 'some.dapp',
          };

          const res = {
            error: null,
          };

          const handler = createHandler();

          let callCount = 0;
          while (callCount < 3) {
            callCount += 1;
            const { next, executeMiddlewareStack } = getNext();
            handler(req, res, next);
            await executeMiddlewareStack();
            if (callCount !== 3) {
              await waitForSeconds(0.3);
            }
          }

          const expectedArgs = [
            MetaMetricsEvents.PROVIDER_METHOD_CALLED,
            {
              referrer: {
                url: 'some.dapp',
              },
              properties: {
                method,
              },
            },
          ];

          expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(2);
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            1,
            ...expectedArgs,
          );
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            2,
            ...expectedArgs,
          );
        },
      );
    });

    describe('events rated limited by random', () => {
      beforeEach(() => {
        jest
          .spyOn(Math, 'random')
          .mockReturnValueOnce(0) // not rate limited
          .mockReturnValueOnce(0.09) // not rate limited
          .mockReturnValueOnce(0.1) // rate limited
          .mockReturnValueOnce(0.11) // rate limited
          .mockReturnValueOnce(1); // rate limited
      });
      afterEach(() => {
        jest.spyOn(Math, 'random').mockRestore();
      });
      it.each([['any_method_without_rate_limit_type_set'], ['eth_getBalance']])(
        `should only track a random percentage of '%s' events`,
        async (method) => {
          const req = {
            method,
            origin: 'some.dapp',
          };

          const res = {
            error: null,
          };

          const handler = createHandler();

          let callCount = 0;
          while (callCount < 5) {
            callCount += 1;
            const { next, executeMiddlewareStack } = getNext();
            handler(req, res, next);
            await executeMiddlewareStack();
          }

          const expectedArgs = [
            MetaMetricsEvents.PROVIDER_METHOD_CALLED,
            {
              referrer: {
                url: 'some.dapp',
              },
              properties: {
                method,
              },
            },
          ];

          expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(2);
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            1,
            ...expectedArgs,
          );
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            2,
            ...expectedArgs,
          );
        },
      );
    });

    describe('events rated globally rate limited', () => {
      it('should only track events if the global rate limit has not been hit', async () => {
        const req = {
          method: 'some_method_rate_limited_by_sample',
          origin: 'some.dapp',
        };

        const res = {
          error: null,
        };

        const handler = createHandler({
          rateLimitSamplePercent: 1, // track every event for this spec
          globalRateLimitTimeout: 1000,
          globalRateLimitMaxAmount: 3,
        });

        let callCount = 0;
        while (callCount < 4) {
          callCount += 1;
          const { next, executeMiddlewareStack } = getNext();
          handler(req, res, next);
          await executeMiddlewareStack();
          if (callCount !== 4) {
            await waitForSeconds(0.3);
          }
        }

        const expectedArgs = [
          MetaMetricsEvents.PROVIDER_METHOD_CALLED,
          {
            referrer: {
              url: 'some.dapp',
            },
            properties: {
              method: 'some_method_rate_limited_by_sample',
            },
          },
        ];

        expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(3);
        expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
          1,
          ...expectedArgs,
        );
        expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
          2,
          ...expectedArgs,
        );
        expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
          3,
          ...expectedArgs,
        );
      });
    });
  });
});
