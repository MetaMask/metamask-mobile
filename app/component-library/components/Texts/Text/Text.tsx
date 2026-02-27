/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `Text` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Text/README.md}
 */

// Third party dependencies.
import React from 'react';
import { Text as RNText } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { TextProps } from './Text.types';
import styleSheet from './Text.styles';
import { DEFAULT_TEXT_COLOR, DEFAULT_TEXT_VARIANT } from './Text.constants';

const Text: React.FC<TextProps> = ({
  variant = DEFAULT_TEXT_VARIANT,
  color = DEFAULT_TEXT_COLOR,
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    variant,
    style,
    color,
  });

  return (
    <RNText accessibilityRole="text" {...props} style={styles.base}>
      {children}
    </RNText>
  );
};

export default Text;
