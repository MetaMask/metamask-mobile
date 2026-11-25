import type {
  SocialDecisionKind,
  SocialPostDecisionViewParams,
} from '../../../../components/Views/SocialLeaderboard/SocialPostDecisionView/SocialPostDecisionView.types';

/**
 * Caps on what a link may put on screen. The link is not authenticated, so
 * the screen only renders short plain text from it.
 */
export const SOCIAL_POST_DECISION_MAX_HANDLE_LENGTH = 64;
export const SOCIAL_POST_DECISION_MAX_TEXT_LENGTH = 1000;
export const SOCIAL_POST_DECISION_MAX_REASON_LENGTH = 200;

const FOXICON_AVATAR_PREFIX = 'foxicon://';
const HTTPS_AVATAR_PREFIX = 'https://';

const DECISION_KINDS: readonly SocialDecisionKind[] = [
  'post-removed',
  'profile-hidden',
  'report-post-removed',
  'report-post-left-up',
  'report-profile-hidden',
  'report-profile-left-up',
];

/** Links without a `kind` predate the other outcomes and mean a removed post. */
const DEFAULT_DECISION_KIND: SocialDecisionKind = 'post-removed';

const readKind = (
  urlParams: URLSearchParams,
): SocialDecisionKind | undefined => {
  const value = urlParams.get('kind')?.trim();
  if (!value) {
    return DEFAULT_DECISION_KIND;
  }
  return DECISION_KINDS.find((kind) => kind === value);
};

const readText = (
  urlParams: URLSearchParams,
  name: string,
  maxLength: number,
): string | undefined => {
  const value = urlParams.get(name)?.trim();
  return value ? value.slice(0, maxLength) : undefined;
};

const readTimestamp = (
  urlParams: URLSearchParams,
  name: string,
): number | undefined => {
  const value = Number(urlParams.get(name));
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
};

const readAvatarUrl = (urlParams: URLSearchParams): string | undefined => {
  const value = urlParams.get('avatarUrl')?.trim();
  return value &&
    (value.startsWith(HTTPS_AVATAR_PREFIX) ||
      value.startsWith(FOXICON_AVATAR_PREFIX))
    ? value
    : undefined;
};

/**
 * Reads the moderation decision a notification link carries.
 * Returns `undefined` when the kind is unknown or the link lacks the handle
 * or the reason, so a malformed link never opens a half-empty decision.
 * The post text is optional: a position-only post has none.
 */
export const parseSocialPostDecisionParams = (
  actionPath: string,
): SocialPostDecisionViewParams | undefined => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  const kind = readKind(urlParams);
  const handle = readText(
    urlParams,
    'handle',
    SOCIAL_POST_DECISION_MAX_HANDLE_LENGTH,
  );
  const text = readText(
    urlParams,
    'text',
    SOCIAL_POST_DECISION_MAX_TEXT_LENGTH,
  );
  const reason = readText(
    urlParams,
    'reason',
    SOCIAL_POST_DECISION_MAX_REASON_LENGTH,
  );

  if (!kind || !handle || !reason) {
    return undefined;
  }

  return {
    kind,
    handle,
    text,
    reason,
    postedAt: readTimestamp(urlParams, 'postedAt'),
    reportedAt: readTimestamp(urlParams, 'reportedAt'),
    decidedAt: readTimestamp(urlParams, 'decidedAt'),
    avatarUrl: readAvatarUrl(urlParams),
    profileId: readText(
      urlParams,
      'profileId',
      SOCIAL_POST_DECISION_MAX_HANDLE_LENGTH,
    ),
    verified: urlParams.get('verified') === 'true',
  };
};
