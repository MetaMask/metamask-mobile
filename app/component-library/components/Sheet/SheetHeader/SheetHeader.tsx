/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import ButtonLink from '../../Buttons/ButtonLink';
import Text, { TextVariant } from '../../Text';
import ButtonIcon, { ButtonIconVariant } from '../../Buttons/ButtonIcon';
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
          <ButtonIcon
            testID={SHEET_HEADER_BACK_BUTTON_ID}
            variant={ButtonIconVariant.Secondary}
            onPress={onBack}
            icon={IconName.ArrowLeftOutline}
          />
        )}
      </View>
      <Text variant={TextVariant.sHeadingMD}>{title}</Text>
      <View style={styles.rightAccessory}>
        {actionButtonOptions && (
          // TODO - Replace ButtonLink with ButtonTertiary once new variant is ready/
          <ButtonLink
            testID={SHEET_HEADER_ACTION_BUTTON_ID}
            onPress={actionButtonOptions.onPress}
            variant={TextVariant.sBodyMD}
          >
            {actionButtonOptions.label}
          </ButtonLink>
        )}
      </View>
    </View>
  );
};

export default SheetHeader;
