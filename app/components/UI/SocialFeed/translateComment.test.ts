import { translateComment } from './translateComment';

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

describe('translateComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls SocialController:translateComment and returns the translation', async () => {
    mockCall.mockResolvedValue({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });

    const result = await translateComment({
      commentId: 'comment-1',
      targetLanguage: 'en',
    });

    expect(mockCall).toHaveBeenCalledWith('SocialController:translateComment', {
      commentId: 'comment-1',
      targetLanguage: 'en',
    });
    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
  });

  it('maps the controller translation payload to the translated state', async () => {
    mockCall.mockResolvedValue({
      uid: 'comment-1',
      sourceLanguage: 'fr',
      translations: { en: 'Hello world' },
      text: 'Hello world',
    });

    const result = await translateComment({
      commentId: 'comment-1',
      targetLanguage: 'en',
    });

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
      commentId: 'comment-1',
      targetLanguage: 'en',
    });

    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Hello' },
    });
  });

  it('returns the translated state when the comment is already in the target language', async () => {
    mockCall.mockResolvedValue({
      uid: 'comment-1',
      sourceLanguage: 'en',
      translations: {},
      text: null,
    });

    const result = await translateComment({
      commentId: 'comment-1',
      targetLanguage: 'en',
    });

    expect(result).toStrictEqual({
      state: 'translated',
      sourceLanguage: 'en',
      translations: {},
    });
  });

  it('returns the failed state when the controller reports failure', async () => {
    mockCall.mockResolvedValue({ state: 'translationFailed' });

    await expect(
      translateComment({ commentId: 'comment-1', targetLanguage: 'en' }),
    ).resolves.toStrictEqual({ state: 'translationFailed' });
  });

  it('returns the failed state when the controller throws', async () => {
    mockCall.mockRejectedValue(new Error('endpoint does not exist yet'));

    await expect(
      translateComment({ commentId: 'comment-1', targetLanguage: 'en' }),
    ).resolves.toStrictEqual({ state: 'translationFailed' });
  });
});
