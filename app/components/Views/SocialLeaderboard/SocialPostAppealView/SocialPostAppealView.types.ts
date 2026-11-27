import type { SocialDecisionKind } from '../SocialPostDecisionView/SocialPostDecisionView.types';

/**
 * Route params of the appeal form. They describe the decision being
 * appealed, so support can tell which decision the message is about.
 */
export interface SocialPostAppealViewParams {
  /** Which outcome is being appealed. */
  kind: SocialDecisionKind;
  /** Handle of the post's author or the profile the decision is about. */
  handle: string;
  /** Why the decision was made. */
  reason: string;
}
