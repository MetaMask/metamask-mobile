import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../core/Engine';
import { SOCIAL_TRACE_FEATURE } from '../../../util/social/socialPerformance';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';

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

type TranslatedComment = Extract<
  TranslateCommentResult,
  { state: 'translated' }
>;

interface TranslateCommentMessenger {
  call: (
    action: 'SocialController:translateComment',
    options: TranslateCommentOptions,
  ) => Promise<unknown>;
}

/**
 * Time from the tap until the row gives up and offers a retry, including any
 * wait behind another Call's translation. SocialService cannot abort the
 * request, so a late response is dropped rather than cancelled.
 */
export const TRANSLATE_COMMENT_TIMEOUT_MS = 15_000;

const MAX_CACHED_TRANSLATIONS = 200;

const TRANSLATION_FAILED: TranslateCommentResult = {
  state: 'translationFailed',
};

const TIMED_OUT = Symbol('translateCommentTimedOut');

const translatedComments = new Map<string, TranslatedComment>();
const pendingTranslations = new Map<string, Promise<TranslateCommentResult>>();
let translationQueue: Promise<unknown> = Promise.resolve();

const getMessenger = (): TranslateCommentMessenger =>
  Engine.controllerMessenger as unknown as TranslateCommentMessenger;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) &&
  Object.values(value).every((entry) => typeof entry === 'string');

const toCacheKey = ({ commentId, targetLanguage }: TranslateCommentOptions) =>
  JSON.stringify([commentId, targetLanguage]);

const cacheTranslation = (key: string, result: TranslatedComment) => {
  translatedComments.delete(key);
  translatedComments.set(key, result);
  if (translatedComments.size > MAX_CACHED_TRANSLATIONS) {
    const oldestKey = translatedComments.keys().next().value;
    if (oldestKey !== undefined) {
      translatedComments.delete(oldestKey);
    }
  }
};

/**
 * Runs one translation at a time so several taps on a slow network do not
 * open parallel requests on the feed.
 */
const runQueued = <Result>(task: () => Promise<Result>): Promise<Result> => {
  const run = translationQueue.then(task);
  translationQueue = run.catch(() => undefined);
  return run;
};

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
    return TRANSLATION_FAILED;
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
    return TRANSLATION_FAILED;
  }

  return {
    state: 'translated',
    sourceLanguage,
    translations,
  };
};

const requestTranslation = async (
  options: TranslateCommentOptions,
): Promise<TranslateCommentResult> => {
  const traceId = uuidv4();
  trace({
    name: TraceName.SocialCommentTranslate,
    op: TraceOperation.SocialDataFetch,
    id: traceId,
    tags: { feature: SOCIAL_TRACE_FEATURE },
  });
  const finishTrace = (success: boolean, timedOut: boolean) =>
    endTrace({
      name: TraceName.SocialCommentTranslate,
      id: traceId,
      status: success ? 'ok' : 'error',
      data: { success, timed_out: timedOut },
    });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let hasTimedOut = false;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      hasTimedOut = true;
      resolve(TIMED_OUT);
    }, TRANSLATE_COMMENT_TIMEOUT_MS);
  });

  try {
    const value = await Promise.race([
      runQueued(() =>
        hasTimedOut
          ? Promise.resolve(TIMED_OUT)
          : Promise.race([
              getMessenger().call('SocialController:translateComment', options),
              timeout,
            ]),
      ),
      timeout,
    ]);
    if (value === TIMED_OUT) {
      finishTrace(false, true);
      return TRANSLATION_FAILED;
    }
    const result = toTranslateCommentResult(value, options.targetLanguage);
    finishTrace(result.state === 'translated', false);
    return result;
  } catch {
    finishTrace(false, false);
    return TRANSLATION_FAILED;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Asks SocialController to translate a Call.
 *
 * A successful translation is kept for the session, and repeat taps on the
 * same Call share the request already in flight. A thrown error, a timeout,
 * and a reported failure all resolve to the failed state and are not cached.
 */
export const translateComment = (
  options: TranslateCommentOptions,
): Promise<TranslateCommentResult> => {
  const key = toCacheKey(options);
  const cached = translatedComments.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = pendingTranslations.get(key);
  if (pending) {
    return pending;
  }

  const request = requestTranslation(options)
    .then((result) => {
      if (result.state === 'translated') {
        cacheTranslation(key, result);
      }
      return result;
    })
    .finally(() => {
      pendingTranslations.delete(key);
    });
  pendingTranslations.set(key, request);
  return request;
};
