/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetHeaderComponent } from './BottomSheetHeader';

const BottomSheetHeaderMeta = {
  title: 'Component Library / BottomSheets',
  component: BottomSheetHeaderComponent,
};
export default BottomSheetHeaderMeta;

export const BottomSheetHeader = {
  args: {
    chidlren: 'Super Long BottomSheetHeader Title that may span 3 lines',
  },
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <BottomSheetHeaderComponent
      {...args}
      onBack={() => {
        console.log('Back button clicked');
      }}
      onClose={() => {
        console.log('Close button clicked');
      }}
    />
  ),
};
