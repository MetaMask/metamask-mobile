import type { PendingSocialPreviewTarget } from '../../TraderPreviewSheet/pendingSocialPreviewTarget';

interface PendingActionState {
  /** The link the user opened before joining Social, if any. */
  previewTarget: PendingSocialPreviewTarget | null;
  /** Whether a gated action is waiting to run once onboarding ends. */
  hasPendingEntry: boolean;
  /** Path the user took through onboarding. */
  path: 'x' | 'manual';
}

/**
 * Whether finishing onboarding will resume the action that sent the user
 * here: opening the trader link they came from, or running the gated action.
 * Mirrors the order of the exits in the onboarding ready step. The X path
 * replaces the screen with My Profile and drops a pending gated action, so it
 * only resumes a trader link.
 *
 * @param state - What is waiting to resume, and the onboarding path taken.
 * @returns `true` when finishing will resume the user's action.
 */
export const isPendingActionResumable = ({
  previewTarget,
  hasPendingEntry,
  path,
}: PendingActionState): boolean =>
  previewTarget?.stage === 'onboarding' || (path !== 'x' && hasPendingEntry);
