// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import CirclePattern from '../../../patterns/Circles/Circle/Circle';
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
  iconProps,
  ...props
}: IconContainerProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    backgroundColor,
  });
  iconProps.size = ICON_SIZE_BY_ICON_CONTAINER_SIZE[size];
  return (
    <CirclePattern
      style={styles.base}
      size={size}
      testID={ICON_CONTAINER_TEST_ID}
      {...props}
    >
      <Icon testID={ICON_CONTAINER_ICON_TEST_ID} {...iconProps} />
    </CirclePattern>
  );
};

export default IconContainer;
