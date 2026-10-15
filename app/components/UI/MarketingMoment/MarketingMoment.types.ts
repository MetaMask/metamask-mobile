import type { ReactNode } from 'react';
import type { Theme } from '@metamask/design-system-twrnc-preset';

/**
 * A pinned action on a marketing moment.
 */
export interface MarketingMomentAction {
  /**
   * Button label. Callers pass already-localized copy.
   */
  label: string;
  /**
   * Called when the user presses the button.
   */
  onPress: () => void | Promise<void>;
  /**
   * Optional test ID for the button.
   */
  testID?: string;
  /**
   * Shows the button loading state.
   */
  isLoading?: boolean;
  /**
   * Disables the button.
   */
  isDisabled?: boolean;
}

/**
 * Full-screen marketing moment: title and description at the top, flexible
 * artwork, and a primary action with a tertiary "Not now" pinned to the bottom.
 */
export interface MarketingMomentProps {
  /**
   * Page heading.
   */
  title: string;
  /**
   * One sentence, or two paragraphs for a fact that does not belong in the first.
   */
  description: string | string[];
  /**
   * Optional content under the description, such as tags or attribution.
   */
  supportingContent?: ReactNode;
  /**
   * Product artwork, centered in the flexible region.
   */
  artwork?: ReactNode;
  /**
   * Recommended action.
   */
  primaryAction: MarketingMomentAction;
  /**
   * Dismiss action, rendered as a tertiary "Not now".
   */
  secondaryAction: MarketingMomentAction;
  /**
   * Optional full-bleed page background, such as a brand gradient. The root
   * is transparent when provided.
   */
  background?: ReactNode;
  /**
   * Forces a color theme for the copy and actions. Use `Theme.Dark` on a dark
   * brand background.
   */
  theme?: Theme;
  /**
   * Optional test ID for the root.
   */
  testID?: string;
  /**
   * Optional test ID for the title.
   */
  titleTestID?: string;
  /**
   * Optional test IDs for each description paragraph, in order.
   */
  descriptionTestIDs?: string[];
}
