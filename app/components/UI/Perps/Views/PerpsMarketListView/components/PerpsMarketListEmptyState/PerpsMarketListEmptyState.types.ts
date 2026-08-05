/**
 * Props for PerpsMarketListEmptyState component
 */
export interface PerpsMarketListEmptyStateProps {
  /**
   * Test ID for the outer container, used to locate the empty state in tests.
   */
  containerTestID?: string;

  /**
   * Heading text shown below the icon.
   */
  title: string;

  /**
   * Supporting description text shown below the title.
   */
  description: string;

  /**
   * Label for the optional call-to-action button. When omitted (along with
   * `onCtaPress`), no CTA is rendered.
   */
  ctaLabel?: string;

  /**
   * Callback invoked when the CTA button is pressed.
   */
  onCtaPress?: () => void;

  /**
   * Test ID for the CTA button.
   */
  ctaTestID?: string;
}
