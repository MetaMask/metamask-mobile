/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';
import Button, { ButtonVariants } from '../../Buttons/Button';
import ButtonIcon, { ButtonIconVariants } from '../../Buttons/ButtonIcon';
import { IconName } from '../../Icons/Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './SheetHeader.styles';
import { SheetHeaderProps } from './SheetHeader.types';
import {
  SHEET_HEADER_ACTION_BUTTON_ID,
  SHEET_HEADER_BACK_BUTTON_ID,
} from './SheetHeader.constants';

const SheetHeader = ({
  title,
  onBack,
  actionButtonOptions,
  ...props
}: SheetHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.base} {...props}>
      <View style={styles.leftAccessory}>
        {onBack && (
          <ButtonIcon
            testID={SHEET_HEADER_BACK_BUTTON_ID}
            variant={ButtonIconVariants.Secondary}
            onPress={onBack}
            iconName={IconName.ArrowLeft}
          />
        )}
      </View>
      <Text variant={TextVariant.HeadingMD}>{title}</Text>
      <View style={styles.rightAccessory}>
        {actionButtonOptions && (
          <Button
            variant={ButtonVariants.Link}
            testID={SHEET_HEADER_ACTION_BUTTON_ID}
            onPress={actionButtonOptions.onPress}
            textVariant={TextVariant.BodyMD}
            label={actionButtonOptions.label}
          />
        )}
      </View>
    </View>
  );
};

export default SheetHeader;
