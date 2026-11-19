import Engine from '../../../core/Engine';

export interface TranslateCommentOptions {
  commentId: string;
  targetLanguage: string;
}

export type TranslateCommentResult =
  | {
      state: 'translated';
      sourceLanguage: string | null;
      translations: Record<string, string>;
    }
  | { state: 'translationFailed' };

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

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) &&
  Object.values(value).every((entry) => typeof entry === 'string');

/**
 * SocialController returns `{ sourceLanguage, translations }` from
 * `POST /swap-comment/:commentId/translate`. The screen uses a local
 * `state` so a thrown error and a reported failure share one result.
 */
const toTranslateCommentResult = (
  value: unknown,
  targetLanguage: string,
): TranslateCommentResult => {
  if (!isRecord(value) || value.state === 'translationFailed') {
    return { state: 'translationFailed' };
  }

  const translations = isStringRecord(value.translations)
    ? { ...value.translations }
    : {};
  if (
    typeof value.text === 'string' &&
    value.text.length > 0 &&
    translations[targetLanguage] == null
  ) {
    translations[targetLanguage] = value.text;
  }
  const sourceLanguage =
    typeof value.sourceLanguage === 'string' ? value.sourceLanguage : null;
  const alreadyInTargetLanguage =
    value.text == null &&
    sourceLanguage?.toLowerCase() === targetLanguage.toLowerCase();
  if (Object.keys(translations).length === 0 && !alreadyInTargetLanguage) {
    return { state: 'translationFailed' };
  }

  return {
    state: 'translated',
    sourceLanguage,
    translations,
  };
};

/**
 * Asks SocialController to translate a Call.
 *
 * A thrown error, including the published controller's missing-route throw,
 * is the same failed state the controller returns once that change ships.
 */
export const translateComment = async (
  options: TranslateCommentOptions,
): Promise<TranslateCommentResult> => {
  try {
    const result = await getMessenger().call(
      'SocialController:translateComment',
      options,
    );
    return toTranslateCommentResult(result, options.targetLanguage);
  } catch {
    return { state: 'translationFailed' };
  }
};
