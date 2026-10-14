import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import type { FontWeight } from '@metamask/design-system-react-native';

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
  /**
   * Optional Tailwind classes for the button surface.
   */
  twClassName?: string;
  /**
   * Optional Tailwind classes for the button label.
   */
  textClassName?: string;
  /**
   * Optional button style for product treatments that tokens do not cover.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional label style for product treatments that tokens do not cover.
   */
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Full-screen marketing moment: title and description, flexible artwork, and
 * one or two pinned actions.
 */
export interface MarketingMomentProps {
  /**
   * Page heading. Rendered at DisplayMd unless `renderTitle` replaces it.
   */
  title: string;
  /**
   * One sentence, or two paragraphs for a fact that does not belong in the first.
   */
  description: string | string[];
  /**
   * Product artwork. Placement inside the flexible region is up to the caller.
   */
  artwork?: ReactNode;
  /**
   * Recommended action.
   */
  primaryAction: MarketingMomentAction;
  /**
   * Optional dismiss action. Omitted on flow steps that have a single action.
   */
  secondaryAction?: MarketingMomentAction;
  /**
   * Optional header chrome, such as an onboarding back button.
   */
  header?: ReactNode;
  /**
   * Optional content between the description and the artwork, such as tags.
   */
  supportingContent?: ReactNode;
  /**
   * Optional full-bleed layer behind the copy and actions.
   */
  backdrop?: ReactNode;
  /**
   * Optional content above the actions, such as referral attribution.
   */
  footerContent?: ReactNode;
  /**
   * Replaces the default title, for treatments such as a gradient lockup.
   */
  renderTitle?: (title: string) => ReactNode;
  /**
   * Optional test ID for the root.
   */
  testID?: string;
  /**
   * Optional test ID for the default title.
   */
  titleTestID?: string;
  /**
   * Optional test IDs for each description paragraph, in order.
   */
  descriptionTestIDs?: string[];
  /**
   * Safe area edges. Defaults to top and bottom.
   */
  edges?: readonly Edge[];
  /**
   * Optional classes for the root. Defaults to the default background.
   */
  twClassName?: string;
  /**
   * Optional classes for the description paragraphs.
   */
  descriptionClassName?: string;
  /**
   * Optional description color or metric overrides.
   */
  descriptionStyle?: StyleProp<TextStyle>;
  /**
   * Optional description weight. Defaults to the body weight.
   */
  descriptionFontWeight?: FontWeight;
  /**
   * Optional title style. Used for the non-Latin system-font fallback.
   */
  titleStyle?: StyleProp<TextStyle>;
  /**
   * Optional frame style for the title, including entrance animation.
   */
  titleFrameStyle?: StyleProp<ViewStyle>;
  /**
   * Optional frame style for the description, including entrance animation.
   */
  descriptionFrameStyle?: StyleProp<ViewStyle>;
  /**
   * Optional frame style for the actions, including entrance animation.
   */
  actionsFrameStyle?: StyleProp<ViewStyle>;
}
