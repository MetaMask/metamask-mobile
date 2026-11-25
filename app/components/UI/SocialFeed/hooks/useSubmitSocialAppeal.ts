import { useCallback } from 'react';

export interface SocialAppeal {
  /** Where the appeal outcome is emailed. */
  email: string;
  /** Why the user disagrees with the decision. */
  message: string;
  /** Which outcome is being appealed. */
  decision: string;
  /** Handle of the post's author or the profile the decision is about. */
  handle: string;
  /** Why the decision was made. */
  reason: string;
}

interface UseSubmitSocialAppealOptions {
  /** Called once the appeal has been accepted. */
  onSent: () => void;
  /** Called when the appeal could not be submitted. */
  onFailed: () => void;
}

/**
 * Submits a social moderation appeal.
 *
 * TODO(TSA-1668): placeholder. Hand the appeal to Intercom here (separate PR).
 * Until then this only confirms receipt to the form: nothing is sent to the
 * backend or to support, and no webview opens.
 */
export const useSubmitSocialAppeal = ({
  onSent,
}: UseSubmitSocialAppealOptions): ((appeal: SocialAppeal) => void) =>
  useCallback(
    (_appeal: SocialAppeal) => {
      onSent();
    },
    [onSent],
  );
