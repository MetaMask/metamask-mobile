import type { CandleAvatarMarkerEntry } from './mapFollowingPositionsToCandleAvatarMarkers';

/** Route params for `Routes.SOCIAL.CHART_MARKERS_SHEET`. */
export interface SocialMarkersBottomSheetParams {
  /**
   * Trades behind the tapped avatar marker (one) or cluster (many). Plain,
   * serializable data, in any order — the sheet sorts newest first.
   */
  entries: CandleAvatarMarkerEntry[];
}
