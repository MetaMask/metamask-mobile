import { endTrace, trace } from '../../../util/trace';
import {
  translateComment,
  TRANSLATE_COMMENT_TIMEOUT_MS,
} from './translateComment';

const mockCall = jest.fn();

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    SocialCommentTranslate: 'Social Comment Translate',
  },
  TraceOperation: {
    SocialDataFetch: 'social.data_fetch',
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'translate-trace-id',
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

let commentCount = 0;
const nextCommentId = () => {
  commentCount += 1;
  return `comment-${commentCount}`;
};

const flushQueue = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const deferred = <Value>() => {
  let resolve: (value: Value) => void = jest.fn();
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('translateComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls SocialController:translateComment and returns the translation', async () => {
    const commentId = nextCommentId();
    mockCall.mockResolvedValue({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });

    const result = await translateComment({ commentId, targetLanguage: 'en' });

    expect(mockCall).toHaveBeenCalledWith('SocialController:translateComment', {
      commentId,
      targetLanguage: 'en',
    });
    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
  });

  it('maps the controller translation payload to the translated state', async () => {
    const commentId = nextCommentId();
    mockCall.mockResolvedValue({
      uid: commentId,
      sourceLanguage: 'fr',
      translations: { en: 'Hello world' },
      text: 'Hello world',
    });

    const result = await translateComment({ commentId, targetLanguage: 'en' });

    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'fr',
      translations: { en: 'Hello world' },
    });
  });

  it('uses the requested language text when translations omit that key', async () => {
    mockCall.mockResolvedValue({
      sourceLanguage: 'ko',
      translations: {},
      text: 'Hello',
    });

    const result = await translateComment({
      commentId: nextCommentId(),
      targetLanguage: 'en',
    });

    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
  });

  it('returns the translated state when the comment is already in the target language', async () => {
    const commentId = nextCommentId();
    mockCall.mockResolvedValue({
      uid: commentId,
      sourceLanguage: 'en',
      translations: {},
      text: null,
    });

    const result = await translateComment({ commentId, targetLanguage: 'en' });

    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'en',
      translations: {},
    });
  });

  it('returns the failed state when the controller reports failure', async () => {
    mockCall.mockResolvedValue({ state: 'translationFailed' });

    await expect(
      translateComment({ commentId: nextCommentId(), targetLanguage: 'en' }),
    ).resolves.toStrictEqual({ state: 'translationFailed' });
  });

  it('returns the failed state when the controller throws', async () => {
    mockCall.mockRejectedValue(new Error('endpoint does not exist yet'));

    await expect(
      translateComment({ commentId: nextCommentId(), targetLanguage: 'en' }),
    ).resolves.toStrictEqual({ state: 'translationFailed' });
  });

  it('reuses a successful translation without calling the controller again', async () => {
    const commentId = nextCommentId();
    mockCall.mockResolvedValue({
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
    await translateComment({ commentId, targetLanguage: 'en' });

    const result = await translateComment({ commentId, targetLanguage: 'en' });

    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
  });

  it('calls the controller again after a failed translation', async () => {
    const commentId = nextCommentId();
    mockCall.mockResolvedValueOnce({ state: 'translationFailed' });
    mockCall.mockResolvedValueOnce({
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
    await translateComment({ commentId, targetLanguage: 'en' });

    const result = await translateComment({ commentId, targetLanguage: 'en' });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(result.state).toBe('translated');
  });

  it('shares one request between repeat taps on the same Call', async () => {
    const commentId = nextCommentId();
    const response = deferred<unknown>();
    mockCall.mockReturnValue(response.promise);

    const first = translateComment({ commentId, targetLanguage: 'en' });
    const second = translateComment({ commentId, targetLanguage: 'en' });
    response.resolve({ sourceLanguage: 'ko', translations: { en: 'Hello' } });

    await expect(second).resolves.toStrictEqual(await first);
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('waits for the translation in flight before translating another Call', async () => {
    const firstResponse = deferred<unknown>();
    mockCall.mockReturnValueOnce(firstResponse.promise);
    mockCall.mockResolvedValueOnce({
      sourceLanguage: 'ko',
      translations: { en: 'Second' },
    });

    const first = translateComment({
      commentId: nextCommentId(),
      targetLanguage: 'en',
    });
    const second = translateComment({
      commentId: nextCommentId(),
      targetLanguage: 'en',
    });
    await flushQueue();

    expect(mockCall).toHaveBeenCalledTimes(1);

    firstResponse.resolve({
      sourceLanguage: 'ko',
      translations: { en: 'First' },
    });
    await first;
    await second;

    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('returns the failed state when the controller does not answer in time', async () => {
    jest.useFakeTimers();
    const commentId = nextCommentId();
    const response = deferred<unknown>();
    mockCall.mockReturnValue(response.promise);

    const result = translateComment({ commentId, targetLanguage: 'en' });
    await flushQueue();
    jest.advanceTimersByTime(TRANSLATE_COMMENT_TIMEOUT_MS);

    await expect(result).resolves.toStrictEqual({
      state: 'translationFailed',
    });
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Social Comment Translate',
      id: 'translate-trace-id',
      status: 'error',
      data: { success: false, timed_out: true },
    });
  });

  it('does not cache a translation that arrives after the timeout', async () => {
    jest.useFakeTimers();
    const commentId = nextCommentId();
    const lateResponse = deferred<unknown>();
    mockCall.mockReturnValueOnce(lateResponse.promise);
    mockCall.mockResolvedValueOnce({
      sourceLanguage: 'ko',
      translations: { en: 'Fresh' },
    });

    const timedOut = translateComment({ commentId, targetLanguage: 'en' });
    await flushQueue();
    jest.advanceTimersByTime(TRANSLATE_COMMENT_TIMEOUT_MS);
    await timedOut;
    lateResponse.resolve({
      sourceLanguage: 'ko',
      translations: { en: 'Late' },
    });

    const retry = await translateComment({ commentId, targetLanguage: 'en' });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(retry).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Fresh' },
    });
  });

  it('traces the request without the comment text', async () => {
    mockCall.mockResolvedValue({
      sourceLanguage: 'ko',
      translations: { en: 'Private words' },
    });

    await translateComment({
      commentId: nextCommentId(),
      targetLanguage: 'en',
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: 'Social Comment Translate',
      op: 'social.data_fetch',
      id: 'translate-trace-id',
      tags: { feature: 'social_v1' },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Social Comment Translate',
      id: 'translate-trace-id',
      status: 'ok',
      data: { success: true, timed_out: false },
    });
    expect(JSON.stringify(mockEndTrace.mock.calls)).not.toContain(
      'Private words',
    );
  });
});
