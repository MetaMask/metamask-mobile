/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Icon from '../../Icons/Icon';
import Text from '../Text/Text';

// Internal dependencies.
import { TextWithPrefixIconProps } from './TextWithPrefixIcon.types';
import styleSheet from './TextWithPrefixIcon.styles';
import {
  DEFAULT_TEXTWITHPREFIXICON_COLOR,
  TEXT_WITH_PREFIX_ICON_TEST_ID,
  TEXT_WITH_PREFIX_ICON_ICON_TEST_ID,
  TEXT_WITH_PREFIX_ICON_TEXT_TEST_ID,
} from './TextWithPrefixIcon.constants';

const TextWithPrefixIcon: React.FC<TextWithPrefixIconProps> = ({
  iconProps,
  style,
  children,
  color = DEFAULT_TEXTWITHPREFIXICON_COLOR,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, color });
  return (
    <View style={styles.base} testID={TEXT_WITH_PREFIX_ICON_TEST_ID}>
      <Icon
        color={styles.icon.color as string}
        testID={TEXT_WITH_PREFIX_ICON_ICON_TEST_ID}
        {...iconProps}
      />
      <Text
        testID={TEXT_WITH_PREFIX_ICON_TEXT_TEST_ID}
        color={color}
        {...props}
      >
        {children}
      </Text>
    </View>
  );
};

export default TextWithPrefixIcon;
