/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import Icon, { IconName, IconSize } from '../Icons/Icon';
import { useStyles } from '../../hooks';

// Internal dependencies.
import { CheckboxProps } from './Checkbox.types';
import styleSheet from './Checkbox.styles';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { CHECKBOX_ICON_ID } from '../../../../wdio/screen-objects/testIDs/Common.testIds';
import { Platform } from 'react-native';

const Checkbox = ({ style, isSelected, ...props }: CheckboxProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, { style, isSelected });
  const iconName = useMemo(
    () => (isSelected ? IconName.CheckBoxOn : IconName.CheckBoxOff),
    [isSelected],
  );
  const iconColor = useMemo(
    () => (isSelected ? colors.primary.default : colors.icon.muted),
    [isSelected, colors],
  );

  return (
    <Icon
      {...generateTestId(Platform, CHECKBOX_ICON_ID)}
      testID={CHECKBOX_ICON_ID}
      name={iconName}
      size={IconSize.Lg}
      color={iconColor}
      style={styles.base}
      {...props}
    />
  );
};

export default Checkbox;
