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
      testID="input-stepper-description-row"
    >
      {description.icon && (
        <View>
          <Icon
            testID="input-stepper-description-icon"
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
          testID="input-text-description-message"
        >
          {description.message}
        </Text>
      </View>
    </View>
  );
};
