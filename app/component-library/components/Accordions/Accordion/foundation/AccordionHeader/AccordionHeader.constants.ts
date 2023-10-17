/* eslint-disable no-console */
// eslint-disable-next-line import/prefer-default-export
// Internal dependencies.
import {
  AccordionHeaderHorizontalAlignment,
  AccordionHeaderProps,
} from './AccordionHeader.types';

// Defaults
export const DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT =
  AccordionHeaderHorizontalAlignment.Center;

// Test IDs
export const TESTID_ACCORDIONHEADER = 'accordionheader';
export const TESTID_ACCORDIONHEADER_TITLE = 'accordionheader-title';
export const TESTID_ACCORDIONHEADER_ARROWICON = 'accordionheader-arrow-icon';
export const TESTID_ACCORDIONHEADER_ARROWICON_ANIMATION =
  'accordionheader-arrow-icon-animation';

// Sample consts
export const SAMPLE_ACCORDIONHEADER_TITLE = 'Sample Accordion Header Title';
export const SAMPLE_ACCORDIONHEADER_PROPS: AccordionHeaderProps = {
  title: SAMPLE_ACCORDIONHEADER_TITLE,
  onPress: () => {
    console.log('Accordion Header clicked');
  },
  isExpanded: false,
  horizontalAlignment: DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT,
};
