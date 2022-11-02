// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

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
}

/**
 * Style sheet input parameters.
 */
export type AccordionHeaderStyleSheetVars = Pick<AccordionHeaderProps, 'style'>;
