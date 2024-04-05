/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import { ButtonVariants } from '../../Buttons/Button';

// Internal dependencies.
import {
  ButtonsAlignment,
  BottomSheetFooterProps,
} from './BottomSheetFooter.types';

// Test IDs
export const TESTID_BOTTOMSHEETFOOTER = 'bottomsheetfooter';
export const TESTID_BOTTOMSHEETFOOTER_BUTTON = 'bottomsheetfooter-button';
export const TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT =
  'bottomsheetfooter-button-subsequent';

// Defaults
export const DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT =
  ButtonsAlignment.Horizontal;

// Sample consts
export const SAMPLE_BOTTOMSHEETFOOTER_PROPS: BottomSheetFooterProps = {
  buttonsAlignment: DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  buttonPropsArray: [
    {
      variant: ButtonVariants.Secondary,
      label: 'Cancel',
      onPress: () => {
        console.log('Cancel button clicked');
      },
    },
    {
      variant: ButtonVariants.Primary,
      label: 'Submit',
      onPress: () => {
        console.log('Submit button clicked');
      },
    },
  ],
};
