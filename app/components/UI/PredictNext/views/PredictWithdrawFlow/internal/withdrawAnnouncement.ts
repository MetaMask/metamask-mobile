import { strings } from '../../../../../../../locales/i18n';

/**
 * The sentence a screen reader hears when a Preview, Commit, or observation
 * changes the surface. A failure replaces the visible content with copy; a
 * stalled observation replaces the actions with a notice. iOS announces
 * neither on its own — `accessibilityLiveRegion` is Android-only — so both are
 * passed explicitly. An error wins: its copy is what the screen shows.
 */
export const withdrawAnnouncement = (
  errorMessage: string | null,
  isStalled: boolean,
): string | null => {
  if (errorMessage !== null) {
    return errorMessage;
  }
  return isStalled ? strings('predict_next.withdraw.status.stalled') : null;
};
