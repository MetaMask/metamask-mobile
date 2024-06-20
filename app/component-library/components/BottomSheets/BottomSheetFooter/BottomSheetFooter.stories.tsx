/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetFooterComponent } from './BottomSheetFooter';
import { SAMPLE_BOTTOMSHEETFOOTER_PROPS } from './BottomSheetFooter.constants';
import { ButtonsAlignment } from './BottomSheetFooter.types';

const BottomSheetFooterMeta = {
  title: 'Component Library / BottomSheets',
  component: BottomSheetFooterComponent,
  argTypes: {
    buttonsAlignment: {
      options: ButtonsAlignment,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BOTTOMSHEETFOOTER_PROPS.buttonsAlignment,
    },
  },
};
export default BottomSheetFooterMeta;

export const BottomSheetFooter = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <BottomSheetFooterComponent
      {...args}
      buttonPropsArray={SAMPLE_BOTTOMSHEETFOOTER_PROPS.buttonPropsArray}
    />
  ),
};
