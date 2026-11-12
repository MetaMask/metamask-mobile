import { useCallback, useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { reportSocialServiceFailure } from '../../../../util/social/socialServiceTelemetry';
import { useSocialProfileId } from '../../../../util/social/useSocialProfileId';
import { useRequireSocialProfileOnboarding } from '../../../Views/SocialLeaderboard/hooks/useRequireSocialProfileOnboarding';
import {
  blockComment,
  blockProfile,
  invalidateBlockLists,
} from '../moderationApi';
import { SocialEntryReportReason } from '../reportReasons';
import { isViewerSocialAuthor } from '../utils/isViewerSocialAuthor';

/** The post an action is about. */
export interface SocialModerationTarget {
  postId: string;
  authorId: string;
  authorHandle: string;
  /** The post's comment, when it has one. Reporting needs it. */
  commentId?: string;
}

/** Hides the post at once, and shows it again if the request fails. */
export interface SocialModerationOptimisticUpdate {
  apply: () => void;
  revert: () => void;
}

export interface SocialModerationActions {
  /** Hides the post. Without a comment the hide lasts for the session only. */
  hidePost: (
    target: SocialModerationTarget,
    update: SocialModerationOptimisticUpdate,
  ) => void;
  /** Blocks the post's author. */
  blockUser: (
    target: SocialModerationTarget,
    update: SocialModerationOptimisticUpdate,
  ) => void;
  /** Reports the post's comment and hides it. A post without one can't be reported. */
  report: (
    target: SocialModerationTarget,
    reason: string,
    update: SocialModerationOptimisticUpdate,
  ) => void;
}

/**
 * The moderation actions behind the post options sheet. Each one asks for
 * social profile onboarding first, hides the post at once with a toast, and
 * sends `SocialService:block` in the background. Self-targeting block and
 * report actions are ignored before their optimistic updates. On failure the
 * post comes back with an error toast.
 */
export const useSocialModerationActions = (): SocialModerationActions => {
  const { toastRef } = useContext(ToastContext);
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const { profileId, isLoading: isViewerProfileLoading } = useSocialProfileId();

  const showToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label, isBold: true }],
        hasNoTimeout: false,
      });
    },
    [toastRef],
  );

  const run = useCallback(
    (
      update: SocialModerationOptimisticUpdate,
      confirmation: string,
      operation: string,
      request?: () => Promise<void>,
    ) => {
      if (!ensureSocialProfileOnboarding()) {
        return;
      }
      update.apply();
      showToast(confirmation);
      if (!request) {
        return;
      }
      // Through a resolved promise, so a synchronous throw (an unregistered
      // messenger action) also reverts the post.
      Promise.resolve()
        .then(request)
        .then(
          () => {
            invalidateBlockLists().catch(() => undefined);
          },
          (error: unknown) => {
            update.revert();
            showToast(
              strings('social_leaderboard.entry_options.action_failed'),
            );
            reportSocialServiceFailure(error, {
              surface: 'moderation',
              operation,
              extraMessage: 'Social moderation action failed',
              source: 'useSocialModerationActions',
              endpoint: 'moderation_block',
            });
          },
        );
    },
    [ensureSocialProfileOnboarding, showToast],
  );

  const hidePost = useCallback<SocialModerationActions['hidePost']>(
    (target, update) => {
      const { commentId } = target;
      run(
        update,
        strings('social_leaderboard.entry_options.post_hidden_confirmation'),
        'hide_post',
        commentId ? () => blockComment(commentId) : undefined,
      );
    },
    [run],
  );

  const blockUser = useCallback<SocialModerationActions['blockUser']>(
    (target, update) => {
      if (
        isViewerProfileLoading ||
        isViewerSocialAuthor(target.authorId, profileId)
      ) {
        return;
      }

      run(
        update,
        strings('social_leaderboard.entry_options.user_blocked_confirmation', {
          username: target.authorHandle,
        }),
        'block_user',
        () => blockProfile(target.authorId),
      );
    },
    [isViewerProfileLoading, profileId, run],
  );

  const report = useCallback<SocialModerationActions['report']>(
    (target, reason, update) => {
      const { commentId } = target;
      if (
        !commentId ||
        reason === SocialEntryReportReason.Impersonation ||
        isViewerProfileLoading ||
        isViewerSocialAuthor(target.authorId, profileId)
      ) {
        return;
      }
      run(
        update,
        strings('social_leaderboard.entry_options.report_confirmation'),
        'report',
        () => blockComment(commentId, reason),
      );
    },
    [isViewerProfileLoading, profileId, run],
  );

  return { hidePost, blockUser, report };
};
