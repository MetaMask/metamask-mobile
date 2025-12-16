/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as BottomSheetHeader } from './BottomSheetHeader';
import { BottomSheetHeaderVariant } from './BottomSheetHeader.types';
import Text, { TextVariant } from '../../Texts/Text';
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
        <BottomSheetHeader
          onClose={() => {
            console.log('Close button clicked');
          }}
        >
          <Text variant={TextVariant.HeadingMD}>Modify</Text>
        </BottomSheetHeader>
      </>
    );
  },
};
