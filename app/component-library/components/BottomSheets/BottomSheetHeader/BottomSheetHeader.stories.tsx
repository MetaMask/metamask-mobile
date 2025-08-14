/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetHeader } from './BottomSheetHeader';
import { BottomSheetHeaderProps } from './BottomSheetHeader.types';

const BottomSheetHeaderMeta = {
  title: 'Component Library / BottomSheets / BottomSheetHeader',
  component: BottomSheetHeader,
};
export default BottomSheetHeaderMeta;

export const Default = {
  args: {
    children: 'Super Long BottomSheetHeader Title that may span 3 lines',
  },
  // TODO: Replace "any" with type
  render: function Render(args: BottomSheetHeaderProps) {
    return (
      <BottomSheetHeader
        {...args}
        onBack={() => {
          console.log('Back button clicked');
        }}
        onClose={() => {
          console.log('Close button clicked');
        }}
      >
        {args.children}
      </BottomSheetHeader>
    );
  },
};
