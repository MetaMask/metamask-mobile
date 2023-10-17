// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * AccordionHeader Alignment options.
 */
export enum AccordionHeaderHorizontalAlignment {
  Start = 'Start',
  Center = 'Center',
  End = 'End',
}

/**
 * AccordionHeader component props.
 */
export interface AccordionHeaderProps extends TouchableOpacityProps {
  /**
   * Title of the accordion header.
   */
  title: string;
  /**
   * Optional function to trigger when pressing the button.
   */
  onPress?: () => void;
  /**
   * Optional prop to control the default expanded state of the accordion header
   * @default false
   */
  isExpanded?: boolean;
  /**
   * Optional prop to control the horizontal alignment of the AccordionHeader.
   * @default AccordionHeaderHorizontalAlignment.Center
   */
  horizontalAlignment?: AccordionHeaderHorizontalAlignment;
}

/**
 * Style sheet input parameters.
 */
export type AccordionHeaderStyleSheetVars = Pick<
  AccordionHeaderProps,
  'style'
> & {
  horizontalAlignment: AccordionHeaderHorizontalAlignment;
};
