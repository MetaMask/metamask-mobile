/* eslint-disable no-console */
// Internal dependencies.
import { SheetHeaderProps } from './SheetHeader.types';

// Test IDs.
export const SHEET_HEADER_BACK_BUTTON_ID = 'sheet-header-back-button';
export const SHEET_HEADER_ACTION_BUTTON_ID = 'sheet-header-action-button';

// Sample consts
export const SAMPLE_SHEETHEADER_PROPS: SheetHeaderProps = {
  title: 'Sample sheet title',
  onBack: () => console.log('onBack clicked'),
  actionButtonOptions: {
    label: 'Button label',
    onPress: () => console.log('label clicked'),
  },
};
