/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useComponentSize, useStyles } from '../../hooks';
import Text from '../../components/Texts/Text';
import ListItem from '../../components/List/ListItem';

// Internal dependencies.
import styleSheet from './TagBase.styles';
import { TagBaseProps } from './TagBase.types';
import {
  DEFAULT_TAGBASE_SHAPE,
  DEFAULT_TAGBASE_GAP,
  TAGBASE_TESTID,
  TAGBASE_TEXT_TESTID,
} from './TagBase.constants';

const TagBase: React.FC<TagBaseProps> = ({
  style,
  startAccessory,
  children,
  textProps,
  endAccessory,
  shape = DEFAULT_TAGBASE_SHAPE,
  severity,
  includesBorder = false,
  gap = DEFAULT_TAGBASE_GAP,
  ...props
}) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, {
    style,
    shape,
    containerSize,
    severity,
    includesBorder,
  });

  return (
    <ListItem
      style={styles.base}
      gap={gap}
      onLayout={onLayoutContainerSize}
      testID={TAGBASE_TESTID}
      {...props}
    >
      {startAccessory}
      {typeof children === 'string' ? (
        <Text style={styles.text} testID={TAGBASE_TEXT_TESTID} {...textProps}>
          {children}
        </Text>
      ) : (
        children
      )}
      {endAccessory}
    </ListItem>
  );
};

export default TagBase;
