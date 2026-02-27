/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `BadgeCount`, `BadgeIcon`, `BadgeNetwork` or `BadgeStatus` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components}
 */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies
import { BADGE_BASE_TEST_ID } from './BadgeBase.constants';
import { BadgeBaseProps } from './BadgeBase.types';
import styleSheet from './BadgeBase.styles';

const BadgeBase: React.FC<BadgeBaseProps> = ({ children, style, ...props }) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  return (
    <View style={styles.base} testID={BADGE_BASE_TEST_ID} {...props}>
      {children}
    </View>
  );
};

export default BadgeBase;
