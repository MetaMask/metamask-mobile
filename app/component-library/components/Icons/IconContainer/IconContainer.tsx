// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import CoinPattern from '../../../patterns/Coins/Coin/Coin';
import Icon from '../../Icons/Icon';

// Internal dependencies.
import { IconContainerProps } from './IconContainer.types';
import {
  DEFAULT_ICON_CONTAINER_SIZE,
  ICON_SIZE_BY_ICON_CONTAINER_SIZE,
  ICON_CONTAINER_TEST_ID,
  ICON_CONTAINER_ICON_TEST_ID,
} from './IconContainer.constants';
import styleSheet from './IconContainer.styles';

const IconContainer = ({
  size = DEFAULT_ICON_CONTAINER_SIZE,
  style,
  backgroundColor,
  ...restIconProps
}: IconContainerProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    backgroundColor,
  });
  return (
    <CoinPattern
      style={styles.base}
      size={size}
      testID={ICON_CONTAINER_TEST_ID}
    >
      <Icon
        testID={ICON_CONTAINER_ICON_TEST_ID}
        size={ICON_SIZE_BY_ICON_CONTAINER_SIZE[size]}
        {...restIconProps}
      />
    </CoinPattern>
  );
};

export default IconContainer;
