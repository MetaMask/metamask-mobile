/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import Icon, { IconName, IconSize } from '../Icon';
import styleSheet from './Checkbox.styles';
import { CheckboxProps } from './Checkbox.types';
import { CHECKBOX_ICON_ID } from '../../../constants/test-ids';

const Checkbox = ({ style, isSelected, ...props }: CheckboxProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, { style, isSelected });
  const iconName = useMemo(
    () =>
      isSelected ? IconName.CheckBoxOnFilled : IconName.CheckBoxOffOutline,
    [isSelected],
  );
  const iconColor = useMemo(
    () => (isSelected ? colors.primary.default : colors.icon.muted),
    [isSelected, colors],
  );

  return (
    <TouchableOpacity style={styles.base} {...props}>
      <Icon
        testID={CHECKBOX_ICON_ID}
        name={iconName}
        size={IconSize.Lg}
        color={iconColor}
      />
    </TouchableOpacity>
  );
};

export default Checkbox;
