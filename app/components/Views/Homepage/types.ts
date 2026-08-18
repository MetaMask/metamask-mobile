/**
 * Handle for section components that support refresh functionality
 */
export interface SectionRefreshHandle {
  refresh: () => Promise<void>;
}

/**
 * Rendering mode for homepage prediction sections.
 *
 * - 'default': shows positions and falls back to discovery content when empty
 * - 'sports': shows sports prediction markets with sport-type chips
 */
export type HomeSectionMode = 'default' | 'sports';
