/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Link from '../Link';
import BaseText, { BaseTextVariant } from '../BaseText';
import IconButton, { IconButtonVariant } from '../IconButton';
import { IconName } from '../Icon';
import { useStyles } from '../../hooks';

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
          <IconButton
            testID={SHEET_HEADER_BACK_BUTTON_ID}
            variant={IconButtonVariant.Secondary}
            onPress={onBack}
            icon={IconName.ArrowLeftOutline}
          />
        )}
      </View>
      <BaseText variant={BaseTextVariant.sHeadingMD}>{title}</BaseText>
      <View style={styles.rightAccessory}>
        {actionButtonOptions && (
          // TODO - Replace Link with ButtonTertiary once new variant is ready/
          <Link
            testID={SHEET_HEADER_ACTION_BUTTON_ID}
            onPress={actionButtonOptions.onPress}
            variant={BaseTextVariant.sBodyMD}
          >
            {actionButtonOptions.label}
          </Link>
        )}
      </View>
    </View>
  );
};

export default SheetHeader;
