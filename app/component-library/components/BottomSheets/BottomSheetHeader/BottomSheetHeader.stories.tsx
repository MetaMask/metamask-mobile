/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetHeader } from './BottomSheetHeader';
import { BottomSheetHeaderVariant } from './BottomSheetHeader.types';

const BottomSheetHeaderMeta = {
  title: 'Component Library / BottomSheets / BottomSheetHeader',
  component: BottomSheetHeader,
};
export default BottomSheetHeaderMeta;

export const Default = {
  args: {
    children: 'Super Long BottomSheetHeader Title that may span 3 lines',
    onBack: () => {
      console.log('Back button clicked');
    },
    onClose: () => {
      console.log('Close button clicked');
    },
  },
};

export const Variant = {
  render: function Render() {
    return (
      <>
        <BottomSheetHeader variant={BottomSheetHeaderVariant.Compact}>
          BottomSheetHeader Variant: Compact with a long title
        </BottomSheetHeader>
        <BottomSheetHeader
          variant={BottomSheetHeaderVariant.Compact}
          onBack={() => {
            console.log('Back button clicked');
          }}
          onClose={() => {
            console.log('Close button clicked');
          }}
        >
          BottomSheetHeader Variant: Compact with accessories
        </BottomSheetHeader>
        <BottomSheetHeader variant={BottomSheetHeaderVariant.Display}>
          BottomSheetHeader Variant: Display with a long title
        </BottomSheetHeader>
        <BottomSheetHeader
          variant={BottomSheetHeaderVariant.Display}
          onBack={() => {
            console.log('Back button clicked');
          }}
          onClose={() => {
            console.log('Close button clicked');
          }}
        >
          BottomSheetHeader Variant: Display with accessories
        </BottomSheetHeader>
      </>
    );
  },
};
