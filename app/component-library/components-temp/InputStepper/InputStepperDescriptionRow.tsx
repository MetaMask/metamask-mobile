import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  INPUTSTEPPER_DESCRIPTION_ICON_TESTID,
  INPUTSTEPPER_DESCRIPTION_MESSAGE_TESTID,
  INPUTSTEPPER_DESCRIPTION_ROW_TESTID,
} from './InputStepper.constants';
import { InputStepperDescription } from './InputStepper.types';

interface InputStepperDescriptionRowProps {
  description?: InputStepperDescription;
}

export const InputStepperDescriptionRow = ({
  description,
}: InputStepperDescriptionRowProps) => {
  if (!description) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full shrink"
      testID={INPUTSTEPPER_DESCRIPTION_ROW_TESTID}
    >
      {description.icon && (
        <Box twClassName="mr-2">
          <Icon
            testID={INPUTSTEPPER_DESCRIPTION_ICON_TESTID}
            name={description.icon.name}
            size={description.icon.size}
            color={description.icon.color}
          />
        </Box>
      )}
      <Box twClassName="shrink">
        <Text
          twClassName="text-center"
          color={description.color}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          testID={description.testID ?? INPUTSTEPPER_DESCRIPTION_MESSAGE_TESTID}
        >
          {description.message}
        </Text>
      </Box>
    </Box>
  );
};
