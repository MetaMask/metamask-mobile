import Logger from '../Logger';
import {
  buildCopyTradeIntentOptions,
  createCopyTradeIntent,
  postCopyTradeIntents,
  type CreateCopyTradeIntentOptions,
} from './copyTradeIntent';

const mockCall = jest.fn();

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

jest.mock('../Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockLoggerError = jest.mocked(Logger.error);

const COMMENT_ID = '7f1a9c2e-5b8d-4e3f-9a6c-1d2e3f4a5b6c';
const CAIP10 = 'eip155:8453:0x1234567890abcdef1234567890abcdef12345678';
const CONTEXT = {
  surface: 'quick_buy',
  source: 'useQuickBuyController',
} as const;

const createIntent = (
  execution: CreateCopyTradeIntentOptions['execution'] = {
    product: 'swaps',
    quoteId: 'quote-request-1',
  },
): CreateCopyTradeIntentOptions =>
  buildCopyTradeIntentOptions({ commentId: COMMENT_ID }, CAIP10, execution);

const flushPromises = () => new Promise(process.nextTick);

describe('copyTradeIntent', () => {
  beforeEach(() => {
    mockCall.mockReset();
    mockLoggerError.mockReset();
  });

  describe('buildCopyTradeIntentOptions', () => {
    it('maps the origin comment, copier account, and execution to the API body', () => {
      const result = buildCopyTradeIntentOptions(
        { commentId: COMMENT_ID, asset: 'BTC' },
        CAIP10,
        { product: 'perps', oid: '123456789' },
      );

      expect(result).toStrictEqual({
        origin: { kind: 'comment', id: COMMENT_ID },
        copierAccount: { caip10: CAIP10 },
        execution: { product: 'perps', oid: '123456789' },
      });
    });
  });

  describe('createCopyTradeIntent', () => {
    it('calls SocialService:createCopyTradeIntent on the engine messenger', async () => {
      const intent = createIntent();
      mockCall.mockResolvedValue({ id: 'intent-1' });

      const result = await createCopyTradeIntent(intent);

      expect(mockCall).toHaveBeenCalledWith(
        'SocialService:createCopyTradeIntent',
        intent,
      );
      expect(result).toStrictEqual({ id: 'intent-1' });
    });
  });

  describe('postCopyTradeIntents', () => {
    it('sends every built intent', () => {
      const first = createIntent({ product: 'perps', oid: '1' });
      const second = createIntent({ product: 'perps', oid: '2' });
      mockCall.mockResolvedValue({});

      postCopyTradeIntents(() => [first, second], CONTEXT);

      expect(mockCall).toHaveBeenNthCalledWith(
        1,
        'SocialService:createCopyTradeIntent',
        first,
      );
      expect(mockCall).toHaveBeenNthCalledWith(
        2,
        'SocialService:createCopyTradeIntent',
        second,
      );
    });

    it('returns without waiting for the request', () => {
      mockCall.mockReturnValue(new Promise(() => undefined));

      const result = postCopyTradeIntents(() => [createIntent()], CONTEXT);

      expect(result).toBeUndefined();
    });

    it('sends nothing when no intent is built', () => {
      postCopyTradeIntents(() => [], CONTEXT);

      expect(mockCall).not.toHaveBeenCalled();
    });

    it('logs a rejected request without rethrowing', async () => {
      const error = new Error(
        'SocialService: Copy-trade intent request failed: 404',
      );
      mockCall.mockRejectedValue(error);

      expect(() =>
        postCopyTradeIntents(() => [createIntent()], CONTEXT),
      ).not.toThrow();
      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'quick_buy',
            operation: 'create_copy_trade_intent',
          }),
        }),
      );
    });

    it('logs a synchronous messenger throw without rethrowing', () => {
      const error = new Error(
        'A handler for SocialService:createCopyTradeIntent has not been registered',
      );
      mockCall.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        postCopyTradeIntents(() => [createIntent()], CONTEXT),
      ).not.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('still sends later intents after one throws synchronously', () => {
      const second = createIntent({ product: 'perps', oid: '2' });
      mockCall
        .mockImplementationOnce(() => {
          throw new Error('boom');
        })
        .mockResolvedValueOnce({});

      postCopyTradeIntents(
        () => [createIntent({ product: 'perps', oid: '1' }), second],
        CONTEXT,
      );

      expect(mockCall).toHaveBeenLastCalledWith(
        'SocialService:createCopyTradeIntent',
        second,
      );
    });

    it('logs a throw while building intents and sends nothing', () => {
      const error = new Error('Invalid chain id');

      expect(() =>
        postCopyTradeIntents(() => {
          throw error;
        }, CONTEXT),
      ).not.toThrow();

      expect(mockCall).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('wraps a non-Error rejection before logging it', async () => {
      mockCall.mockRejectedValue('offline');

      postCopyTradeIntents(() => [createIntent()], CONTEXT);
      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('offline'),
        expect.any(Object),
      );
    });

    it('does not rethrow when logging itself throws', () => {
      mockLoggerError.mockImplementation(() => {
        throw new Error('logger down');
      });

      expect(() =>
        postCopyTradeIntents(() => {
          throw new Error('Invalid chain id');
        }, CONTEXT),
      ).not.toThrow();
    });
  });
});
