/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `Checkbox` from `@metamask/design-system-react-native`
 */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../components/Base/TouchableOpacity';
import Icon from '../Icons/Icon';
import { useStyles } from '../../hooks';
import Text from '../Texts/Text/Text';

// Internal dependencies.
import { CheckboxProps } from './Checkbox.types';
import styleSheet from './Checkbox.styles';
import {
  CHECKBOX_ICON_TESTID,
  DEFAULT_CHECKBOX_LABEL_TEXTVARIANT,
  DEFAULT_CHECKBOX_LABEL_TEXTCOLOR,
  DEFAULT_CHECKBOX_ICONSIZE,
  DEFAULT_CHECKBOX_ISCHECKED_ICONNAME,
  DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME,
} from './Checkbox.constants';

const Checkbox = ({
  style,
  label,
  isChecked = false,
  isIndeterminate = false,
  isDisabled = false,
  isReadOnly = false,
  isDanger = false,
  checkboxStyle,
  ...props
}: CheckboxProps) => {
  const { hitSlop, ...iconProps } = props;
  const { styles } = useStyles(styleSheet, {
    style,
    checkboxStyle,
    isChecked,
    isIndeterminate,
    isDisabled,
    isReadOnly,
    isDanger,
  });

  let iconName;
  if (isIndeterminate) {
    iconName = DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME;
  } else if (isChecked) {
    iconName = DEFAULT_CHECKBOX_ISCHECKED_ICONNAME;
  }

  return (
    <TouchableOpacity
      style={styles.base}
      {...props}
      disabled={isDisabled || isReadOnly}
    >
      <View style={styles.checkbox} accessibilityRole="checkbox">
        {iconName && (
          <Icon
            testID={CHECKBOX_ICON_TESTID}
            name={iconName}
            size={DEFAULT_CHECKBOX_ICONSIZE}
            color={styles.icon.color}
            {...iconProps}
          />
        )}
      </View>
      {label && (
        <View style={styles.label}>
          {typeof label === 'string' ? (
            <Text
              variant={DEFAULT_CHECKBOX_LABEL_TEXTVARIANT}
              color={DEFAULT_CHECKBOX_LABEL_TEXTCOLOR}
            >
              {label}
            </Text>
          ) : (
            label
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Checkbox;
