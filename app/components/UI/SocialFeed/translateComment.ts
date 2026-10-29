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
  ) => Promise<TranslateCommentResult>;
}

const getMessenger = (): TranslateCommentMessenger =>
  Engine.controllerMessenger as unknown as TranslateCommentMessenger;

const isTranslateCommentResult = (
  value: TranslateCommentResult | undefined,
): value is TranslateCommentResult =>
  value?.state === 'translated' || value?.state === 'translationFailed';

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
    return isTranslateCommentResult(result)
      ? result
      : { state: 'translationFailed' };
  } catch {
    return { state: 'translationFailed' };
  }
};
