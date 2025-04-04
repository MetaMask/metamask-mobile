// External dependencies.
import { AccordionHeaderProps } from './foundation/AccordionHeader/AccordionHeader.types';

/**
 * Accordion component props.
 */
export interface AccordionProps extends AccordionHeaderProps {
  /**
   * Content to be displayed/hidden below the accordion header.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type AccordionStyleSheetVars = Pick<AccordionProps, 'style'>;
