// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { AccordionHeaderProps } from './AccordionHeader/AccordionHeader.types';

/**
 * Accordion component props.
 */
export interface AccordionProps extends ViewProps {
  /**
   * Props to create the accordion header
   */
  accordionHeaderProps: AccordionHeaderProps;
  /**
   * Content to be displayed/hidden below the accordion header.
   */
  children: React.ReactNode;
  /**
   * Optional prop to control the default expanded state of the accordion
   */
  isExpanded?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type AccordionStyleSheetVars = Pick<AccordionProps, 'style'>;
