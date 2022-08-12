/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies
import BadgeNetwork from '../BadgeNetwork';
import { BadgeWrapperProps } from './BadgeWrapper.types';
import styleSheet from './BadgeWrapper.styles';
import { BADGE_NETWORK_TEST_ID } from './BadgeWrapper.constants';

const BadgeWrapper = ({
  children,
  style,
  ...otherProps
}: BadgeWrapperProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  let badge: React.ReactNode;
  let propsToSpread: any;

  switch (otherProps.type) {
    case 'network': {
      const { name, imageSource, position, type, ...remainingProps } =
        otherProps;
      propsToSpread = remainingProps;
      badge = (
        <BadgeNetwork
          type={type}
          testID={BADGE_NETWORK_TEST_ID}
          name={name}
          imageSource={imageSource}
          position={position}
        />
      );
      break;
    }
  }

  return (
    <View style={styles.base} {...propsToSpread}>
      <View>{children}</View>
      {badge}
    </View>
  );
};

export default BadgeWrapper;
