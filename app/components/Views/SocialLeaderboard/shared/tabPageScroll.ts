/**
 * Imperative contract a tab page exposes to `SocialV0View`.
 *
 * The container's collapsing title is driven by whichever page is visible, so
 * switching tabs between a scrolled page and an unscrolled one would otherwise
 * make the header jump between its collapsed and expanded states. The container
 * uses this handle to bring the incoming page in line with the outgoing one
 * before it becomes visible.
 */
import type { SocialFeedPageHandle } from '../../../UI/SocialFeed/types';

export type SocialTabPageHandle = SocialFeedPageHandle;
