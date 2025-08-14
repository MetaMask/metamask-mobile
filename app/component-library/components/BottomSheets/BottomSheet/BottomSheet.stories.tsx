/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React, { useState } from 'react';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Text,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { default as BottomSheet } from './BottomSheet';
import { BottomSheetProps, BottomSheetRef } from './BottomSheet.types';
import BottomSheetHeader from '../BottomSheetHeader';
import BottomSheetFooter from '../BottomSheetFooter';
import { ButtonVariants } from '../../Buttons/Button';

const BottomSheetMeta = {
  title: 'Component Library / BottomSheets / BottomSheet',
  component: BottomSheet,
  argTypes: {
    isInteractable: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
  },
};
export default BottomSheetMeta;

export const Default = {
  render: function Render(
    args: JSX.IntrinsicAttributes &
      BottomSheetProps &
      React.RefAttributes<BottomSheetRef>,
  ) {
    const [isVisible, setIsVisible] = useState(false);

    const openBottomSheet = () => setIsVisible(true);
    const closeBottomSheet = () => setIsVisible(false);
    return (
      <>
        <Button
          variant={ButtonVariant.Primary}
          onPress={openBottomSheet}
          twClassName="mb-4"
        >
          Open BottomSheet
        </Button>
        {isVisible && (
          <BottomSheet
            {...args}
            onClose={closeBottomSheet}
            shouldNavigateBack={false}
          >
            <BottomSheetHeader
              onClose={closeBottomSheet}
              onBack={closeBottomSheet}
            >
              BottomSheetHeader
            </BottomSheetHeader>
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="h-20"
            >
              <Text>
                BottomSheetContent: Lorem ipsum dolor sit amet, consectetur
                adipiscing elit.
              </Text>
            </Box>
            <BottomSheetFooter
              buttonPropsArray={[
                {
                  label: 'Cancel',
                  variant: ButtonVariants.Secondary,
                  onPress: closeBottomSheet,
                },
                {
                  label: 'Confirm',
                  variant: ButtonVariants.Primary,
                  onPress: closeBottomSheet,
                },
              ]}
            />
            {/* TODO: This is a hack to make the bottom sheet visible */}
            <Box twClassName="h-35" />
          </BottomSheet>
        )}
      </>
    );
  },
};
