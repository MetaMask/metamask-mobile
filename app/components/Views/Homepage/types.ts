/**
 * Handle for section components that support refresh functionality
 */
export interface SectionRefreshHandle {
  refresh: () => Promise<void>;
}
