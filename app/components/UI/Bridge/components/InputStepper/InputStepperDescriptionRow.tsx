import React from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { inputStepperDescriptionRow } from './styles';
import { InputStepperDescriptionType } from './constants';
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
    <View style={inputStepperDescriptionRow.descriptionRow}>
      <View>
        <Icon
          name={IconName.Danger}
          size={IconSize.Lg}
          color={
            description.type === InputStepperDescriptionType.WARNING
              ? IconColor.WarningDefault
              : IconColor.ErrorDefault
          }
        />
      </View>
      <View style={inputStepperDescriptionRow.descriptionTextWrapper}>
        <Text
          style={inputStepperDescriptionRow.descriptionText}
          color={
            description.type === InputStepperDescriptionType.WARNING
              ? TextColor.WarningDefault
              : TextColor.ErrorDefault
          }
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
        >
          {description.message}
        </Text>
      </View>
    </View>
  );
};
