/**
 * Interface for section components that support refresh functionality.
 * Used with forwardRef + useImperativeHandle pattern.
 */
export interface SectionRefreshHandle {
  refresh: () => Promise<void>;
}
