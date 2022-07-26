/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import BaseText, { BaseTextVariant } from '../BaseText';
import Icon, { IconName, IconSize } from '../Icon';
import IconButton, { IconButtonVariant } from '../IconButton';
import Link from '../Link';
import styleSheet from './SheetHeader.styles';
import { SheetHeaderProps } from './SheetHeader.types';

const SheetHeader: React.FC<SheetHeaderProps> = ({
  style,
  children,
  ...props
}) => {
  const { styles, theme } = useStyles(styleSheet, { style });
  const { colors } = theme;

  return (
    <View style={styles.base} {...props}>
      <View style={styles.leftItemContainer}>
        <IconButton
          variant={IconButtonVariant.Secondary}
          onPress={() => {}}
          icon={IconName.ArrowLeftOutline}
        />
      </View>
      <BaseText variant={BaseTextVariant.sHeadingMD}>{'Title'}</BaseText>
      <View style={styles.rightItemContainer}>
        <Link onPress={() => {}} variant={BaseTextVariant.sBodyMD}>
          {'Approve'}
        </Link>
      </View>
    </View>
  );
};

export default SheetHeader;
