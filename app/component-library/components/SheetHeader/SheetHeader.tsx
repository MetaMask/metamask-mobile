/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import BaseText, { BaseTextVariant } from '../BaseText';
import { IconName } from '../Icon';
import IconButton, { IconButtonVariant } from '../IconButton';
import Link from '../Link';
import styleSheet from './SheetHeader.styles';
import { SheetHeaderProps } from './SheetHeader.types';
import {
  SHEET_HEADER_ACTION_BUTTON_ID,
  SHEET_HEADER_BACK_BUTTON_ID,
} from './SheetHeader.constants';

const SheetHeader = ({
  title,
  onBack,
  actionOptions,
  ...props
}: SheetHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.base} {...props}>
      <View style={styles.leftAccessory}>
        {onBack ? (
          <IconButton
            testID={SHEET_HEADER_BACK_BUTTON_ID}
            variant={IconButtonVariant.Secondary}
            onPress={onBack}
            icon={IconName.ArrowLeftOutline}
          />
        ) : null}
      </View>
      <BaseText variant={BaseTextVariant.sHeadingMD}>{title}</BaseText>
      <View style={styles.rightAccessory}>
        {actionOptions ? (
          <Link
            testID={SHEET_HEADER_ACTION_BUTTON_ID}
            onPress={actionOptions.onPress}
            variant={BaseTextVariant.sBodyMD}
          >
            {actionOptions.label}
          </Link>
        ) : null}
      </View>
    </View>
  );
};

export default SheetHeader;
