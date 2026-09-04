import React from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  Icon,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { inputStepperDescriptionRow } from './styles';
import { InputStepperProps } from './types';
import { InputStepperTestIds } from './InputStepper.testIds';

interface InputStepperDescriptionRowProps {
  description: InputStepperProps['description'];
}

export const InputStepperDescriptionRow = ({
  description,
}: InputStepperDescriptionRowProps) => {
  if (!description) {
    return null;
  }

  return (
    <View
      style={inputStepperDescriptionRow.descriptionRow}
      testID={InputStepperTestIds.DESCRIPTION_ROW}
    >
      {description.icon && (
        <View style={inputStepperDescriptionRow.iconWrapper}>
          <Icon
            testID={InputStepperTestIds.DESCRIPTION_ICON}
            name={description.icon.name}
            size={description.icon.size}
            color={description.icon.color}
          />
        </View>
      )}
      <View style={inputStepperDescriptionRow.descriptionTextWrapper}>
        <Text
          style={inputStepperDescriptionRow.descriptionText}
          color={description.color}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          testID={InputStepperTestIds.DESCRIPTION_MESSAGE}
        >
          {description.message}
        </Text>
      </View>
    </View>
  );
};
