// Third party dependencies.
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

// External dependencies.
import type {
  BoxRowProps,
  TextProps,
} from '@metamask/design-system-react-native';

/**
 * TitleStandardMarketing component props.
 */
export type TitleStandardMarketingProps = {
  /**
   * Required primary title. Strings get the default title typography. Other nodes render as provided.
   */
  title: ReactNode;
  /**
   * Optional accessory shown inline to the right of the title.
   */
  titleEndAccessory?: ReactNode;
  /**
   * Optional row shown above the title.
   */
  topAccessory?: ReactNode;
  /**
   * Optional custom bottom row. Only shown when `bottomLabel` is not renderable.
   */
  bottomAccessory?: ReactNode;
  /**
   * Optional secondary label below the title. Strings get the default label typography. Takes priority over `bottomAccessory`.
   */
  bottomLabel?: ReactNode;
  /**
   * Optional accessory shown inline to the right of the bottom label. Only used when `bottomLabel` is renderable.
   */
  bottomLabelEndAccessory?: ReactNode;
  /**
   * Merged over the title's default text props when `title` is a string.
   */
  titleProps?: Omit<Partial<TextProps>, 'children'>;
  /**
   * Passed to the title row `BoxRow`.
   */
  titleWrapperProps?: Omit<
    Partial<BoxRowProps>,
    'children' | 'textProps' | 'endAccessory'
  >;
  /**
   * Merged over the bottom label's default text props when `bottomLabel` is a string.
   */
  bottomLabelProps?: Omit<Partial<TextProps>, 'children'>;
  /**
   * Passed to the bottom label row `BoxRow`.
   */
  bottomLabelWrapperProps?: Omit<
    Partial<BoxRowProps>,
    'children' | 'textProps' | 'endAccessory'
  >;
  /**
   * Tailwind classes added to the root container.
   */
  twClassName?: string;
} & Omit<ViewProps, 'children'>;
