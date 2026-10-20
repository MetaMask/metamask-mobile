import type { ComponentProps, ReactNode } from 'react';
import type Animated from 'react-native-reanimated';
import type {
  BoxProps,
  ButtonProps,
  TextProps,
} from '@metamask/design-system-react-native';
import type { Theme } from '@metamask/design-system-twrnc-preset';

/**
 * A pinned action on a marketing moment. Everything except `label` is spread
 * onto the design-system `Button`.
 */
export type MarketingMomentAction = Omit<
  ButtonProps,
  'variant' | 'children'
> & {
  /**
   * Button label. Callers pass already-localized copy.
   */
  label: ReactNode;
};

/**
 * Full-screen marketing moment: title and description at the top, flexible
 * artwork, and a primary action with a tertiary "Not now" pinned to the bottom.
 */
export interface MarketingMomentProps {
  /**
   * Page heading. Strings render in the hero `Text`; any other node replaces
   * it.
   */
  title?: ReactNode;
  /**
   * Props spread onto `MarketingMomentTitle` when `title` is a string.
   * The template sets `w-full text-center`. `twClassName` and `style` are
   * applied after that.
   */
  titleProps?: Partial<TextProps>;
  /**
   * Supporting copy under the title. Strings render in the body `Text`; any
   * other node replaces it.
   */
  description?: ReactNode;
  /**
   * Props spread onto the body `Text` when `description` is a string.
   */
  descriptionProps?: Partial<TextProps>;
  /**
   * Optional content under the description, such as tags or attribution.
   */
  children?: ReactNode;
  /**
   * Props spread onto the animated view that wraps `children`.
   */
  childrenWrapperAnimatedViewProps?: Partial<
    ComponentProps<typeof Animated.View>
  >;
  /**
   * Product artwork. It is sized by the flexible box between the copy and the
   * actions.
   */
  artwork?: ReactNode;
  /**
   * Props spread onto the box that sizes `artwork`. Defaults to centered with
   * horizontal padding; callers override alignment and padding here.
   * `className` is merged onto the box layout classes.
   */
  artworkWrapperProps?: Omit<BoxProps, 'children' | 'twClassName'> & {
    className?: string;
  };
  /**
   * Props spread onto the animated view that wraps `artwork`. `entering`
   * replaces the default fade. `style` replaces the flexible layout style.
   */
  artworkWrapperAnimatedViewProps?: Partial<
    ComponentProps<typeof Animated.View>
  >;
  /**
   * Recommended action.
   */
  primaryAction?: MarketingMomentAction;
  /**
   * Dismiss action, rendered as a tertiary "Not now".
   */
  secondaryAction?: MarketingMomentAction;
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
}
