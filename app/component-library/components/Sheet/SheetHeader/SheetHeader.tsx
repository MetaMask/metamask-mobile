/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';
import Button, { ButtonVariants } from '../../Buttons/Button';
import { ButtonIconVariants } from '../../Buttons/Button/variants/ButtonIcon';
import { IconName } from '../../Icon';
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
          <Button
            variant={ButtonVariants.Icon}
            testID={SHEET_HEADER_BACK_BUTTON_ID}
            buttonIconVariants={ButtonIconVariants.Secondary}
            onPress={onBack}
            iconName={IconName.ArrowLeftOutline}
          />
        )}
      </View>
      <Text variant={TextVariant.HeadingMD}>{title}</Text>
      <View style={styles.rightAccessory}>
        {actionButtonOptions && (
          // TODO - Replace ButtonLink with ButtonTertiary once new variant is ready/
          <Button
            variant={ButtonVariants.Link}
            testID={SHEET_HEADER_ACTION_BUTTON_ID}
            onPress={actionButtonOptions.onPress}
            TextVariant={TextVariant.BodyMD}
          >
            {actionButtonOptions.label}
          </Button>
        )}
      </View>
    </View>
  );
};

export default SheetHeader;
