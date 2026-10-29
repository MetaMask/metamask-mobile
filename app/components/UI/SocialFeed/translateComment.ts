import Engine from '../../../core/Engine';

export interface TranslateCommentOptions {
  commentId: string;
}

export type TranslateCommentResult =
  | {
      state: 'translated';
      sourceLanguage: string | null;
      translations: Record<string, string>;
    }
  | { state: 'translationFailed' };

interface ControllerCommentTranslation {
  sourceLanguage: string | null;
  translations: Record<string, string>;
}

interface TranslateCommentMessenger {
  call: (
    action: 'SocialController:translateComment',
    options: TranslateCommentOptions,
  ) => Promise<unknown>;
}

const getMessenger = (): TranslateCommentMessenger =>
  Engine.controllerMessenger as unknown as TranslateCommentMessenger;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTranslateCommentResult = (
  value: unknown,
): value is TranslateCommentResult =>
  isRecord(value) &&
  (value.state === 'translated' || value.state === 'translationFailed');

const isControllerCommentTranslation = (
  value: unknown,
): value is ControllerCommentTranslation => {
  if (!isRecord(value)) {
    return false;
  }
  const { sourceLanguage, translations } = value;
  if (sourceLanguage !== null && typeof sourceLanguage !== 'string') {
    return false;
  }
  if (!isRecord(translations)) {
    return false;
  }
  return Object.values(translations).every((text) => typeof text === 'string');
};

/**
 * Asks SocialController to translate a Call.
 *
 * v1 always translates into English. The controller sends the comment id and
 * no target language. A thrown error is the failed state.
 */
export const translateComment = async (
  options: TranslateCommentOptions,
): Promise<TranslateCommentResult> => {
  try {
    const result = await getMessenger().call(
      'SocialController:translateComment',
      options,
    );
    if (isTranslateCommentResult(result)) {
      return result;
    }
    if (isControllerCommentTranslation(result)) {
      return {
        state: 'translated',
        sourceLanguage: result.sourceLanguage,
        translations: result.translations,
      };
    }
    return { state: 'translationFailed' };
  } catch {
    return { state: 'translationFailed' };
  }
};
