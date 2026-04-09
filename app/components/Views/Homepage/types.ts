/**
 * Handle for section components that support refresh functionality
 */
export interface SectionRefreshHandle {
  refresh: () => Promise<void>;
}

/**
 * Rendering mode for homepage sections that have both positions and trending content.
 *
 * - 'default': current behavior — shows positions, falls back to trending/popular when empty
 * - 'positions-only': shows only positions, returns null when empty
 * - 'trending-only': always shows trending/popular content, ignores positions
 */
export type HomeSectionMode = 'default' | 'positions-only' | 'trending-only';
