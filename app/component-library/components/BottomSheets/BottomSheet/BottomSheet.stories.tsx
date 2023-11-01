/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { default as BottomSheetComponent } from './BottomSheet';
import { BottomSheetProps, BottomSheetRef } from './BottomSheet.types';

const BottomSheetMeta = {
  title: 'Component Library / BottomSheets',
  component: BottomSheetComponent,
  argTypes: {
    isInteractable: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
  },
};
export default BottomSheetMeta;

export const BottomSheet = {
  render: (
    args: JSX.IntrinsicAttributes &
      BottomSheetProps &
      React.RefAttributes<BottomSheetRef>,
  ) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const bottomSheetRef = useRef<BottomSheetRef | null>(null);
    return (
      <BottomSheetComponent ref={bottomSheetRef} {...args}>
        <View
          style={{
            height: 300,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
        </View>
      </BottomSheetComponent>
    );
  },
};
