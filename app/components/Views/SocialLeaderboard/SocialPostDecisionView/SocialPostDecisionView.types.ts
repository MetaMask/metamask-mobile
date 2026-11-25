/**
 * The moderation outcomes the decision screen can explain.
 *
 * - `post-removed`: the poster's own post was removed.
 * - `profile-hidden`: the poster's profile was hidden.
 * - `report-post-removed`: a post the viewer reported was removed.
 * - `report-post-left-up`: a post the viewer reported was reviewed and left up.
 * - `report-profile-hidden`: a profile the viewer reported was hidden.
 * - `report-profile-left-up`: a profile the viewer reported was left up.
 */
export type SocialDecisionKind =
  | 'post-removed'
  | 'profile-hidden'
  | 'report-post-removed'
  | 'report-post-left-up'
  | 'report-profile-hidden'
  | 'report-profile-left-up';

/** Outcomes the poster can appeal. Reporters never appeal; Done ends the flow. */
export const APPEALABLE_DECISION_KINDS: readonly SocialDecisionKind[] = [
  'post-removed',
  'profile-hidden',
];

/** Outcomes of a post or profile the viewer reported. */
export const REPORTER_DECISION_KINDS: readonly SocialDecisionKind[] = [
  'report-post-removed',
  'report-post-left-up',
  'report-profile-hidden',
  'report-profile-left-up',
];

/** Outcomes that show the post the decision is about. */
export const POST_DECISION_KINDS: readonly SocialDecisionKind[] = [
  'post-removed',
  'report-post-removed',
  'report-post-left-up',
];

/** Outcomes that show the profile the decision is about. */
export const PROFILE_DECISION_KINDS: readonly SocialDecisionKind[] = [
  'profile-hidden',
  'report-profile-hidden',
  'report-profile-left-up',
];

/**
 * Route params of the moderation decision screen.
 *
 * The moderation decision has no backend contract yet, so the notification
 * deeplink carries everything the screen shows. Once the social API exposes
 * the decision, the deeplink handler should resolve these from a decision id.
 */
export interface SocialPostDecisionViewParams {
  /** Which outcome the screen explains. */
  kind: SocialDecisionKind;
  /** Handle of the post's author or the profile, shown in the preview. */
  handle: string;
  /** Text of the post, shown in the post preview. A position-only post has none. */
  text?: string;
  /** Why the decision was made, shown as the decision reason. */
  reason: string;
  /** Epoch milliseconds the post was published. Hides the age when absent. */
  postedAt?: number;
  /** Epoch milliseconds the reporter filed the report. Reporter outcomes only. */
  reportedAt?: number;
  /** Epoch milliseconds the decision was made. Reporter outcomes only. */
  decidedAt?: number;
  /** Avatar of the post's author or the profile. Falls back to a Maskicon. */
  avatarUrl?: string;
  /** Profile id seeding the fallback avatar. */
  profileId?: string;
  /** Shows the verified badge next to the handle. */
  verified?: boolean;
}
