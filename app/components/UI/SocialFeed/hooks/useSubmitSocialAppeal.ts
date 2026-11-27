import { useCallback, useEffect, useRef, useState } from 'react';
import { reportSocialServiceFailure } from '../../../../util/social/socialServiceTelemetry';
import type { SocialDecisionKind } from '../../../Views/SocialLeaderboard/SocialPostDecisionView/SocialPostDecisionView.types';
import {
  SOCIAL_APPEAL_DESCRIPTION_MAX_LENGTH,
  submitSocialAppeal,
} from '../socialAppealApi';

export interface SocialAppeal {
  /** Where the appeal outcome is emailed. */
  email: string;
  /** Why the user disagrees with the decision. */
  message: string;
  /** Which outcome is being appealed. */
  decision: SocialDecisionKind;
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
 * The ticket text: the user's message, then the decision it is about so
 * support does not have to look it up. Kept inside the API's length limit.
 */
const buildDescription = ({
  message,
  decision,
  handle,
  reason,
}: SocialAppeal): string => {
  const context = `\n\n---\nDecision: ${decision}\nHandle: ${handle}\nReason: ${reason}`;
  const room = SOCIAL_APPEAL_DESCRIPTION_MAX_LENGTH - context.length;
  return `${message.slice(0, Math.max(room, 0))}${context}`.slice(
    0,
    SOCIAL_APPEAL_DESCRIPTION_MAX_LENGTH,
  );
};

interface UseSubmitSocialAppealResult {
  /** Sends the appeal. Ignored while another one is in flight. */
  submitAppeal: (appeal: SocialAppeal) => void;
  /** Whether an appeal is waiting for the social API's answer. */
  isSubmitting: boolean;
}

/**
 * Submits a social moderation appeal to the social API, which opens a support
 * ticket for the signed-in user. Calls `onSent` when the ticket is opened and
 * `onFailed` when it is not. A second submit while one is in flight is
 * ignored, and leaving the screen drops the result.
 */
export const useSubmitSocialAppeal = ({
  onSent,
  onFailed,
}: UseSubmitSocialAppealOptions): UseSubmitSocialAppealResult => {
  const inFlight = useRef<AbortController | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(
    () => () => {
      inFlight.current?.abort();
    },
    [],
  );

  const submitAppeal = useCallback(
    (appeal: SocialAppeal) => {
      if (inFlight.current) {
        return;
      }
      const controller = new AbortController();
      inFlight.current = controller;
      setIsSubmitting(true);

      submitSocialAppeal(
        {
          email: appeal.email,
          description: buildDescription(appeal),
        },
        controller.signal,
      )
        .then(() => {
          if (!controller.signal.aborted) {
            onSent();
          }
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          reportSocialServiceFailure(error, {
            surface: 'moderation',
            operation: 'submit_appeal',
            extraMessage: 'Social appeal submission failed',
            source: 'useSubmitSocialAppeal',
            endpoint: 'appeal',
          });
          onFailed();
        })
        .finally(() => {
          if (inFlight.current === controller) {
            inFlight.current = null;
          }
          if (!controller.signal.aborted) {
            setIsSubmitting(false);
          }
        });
    },
    [onSent, onFailed],
  );

  return { submitAppeal, isSubmitting };
};
