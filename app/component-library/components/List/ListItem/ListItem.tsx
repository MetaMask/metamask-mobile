/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './ListItem.styles';
import { ListItemProps } from './ListItem.types';
import {
  DEFAULT_LISTITEM_PADDING,
  DEFAULT_LISTITEM_BORDERRADIUS,
  DEFAULT_LISTITEM_GAP,
  DEFAULT_LISTITEM_VERTICALALIGNMENT,
  TESTID_LISTITEM_GAP,
} from './ListItem.constants';

const ListItem: React.FC<ListItemProps> = ({
  style,
  children,
  padding = DEFAULT_LISTITEM_PADDING,
  borderRadius = DEFAULT_LISTITEM_BORDERRADIUS,
  gap = DEFAULT_LISTITEM_GAP,
  verticalAlignment = DEFAULT_LISTITEM_VERTICALALIGNMENT,
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    padding,
    borderRadius,
    verticalAlignment,
  });

  return (
    <View style={styles.base} accessible accessibilityRole="none">
      {React.Children.map(children, (child, index) => (
        <>
          {index > 0 && (
            <View
              style={{ width: gap }}
              testID={TESTID_LISTITEM_GAP}
              accessible={false}
            />
          )}
          {child}
        </>
      ))}
    </View>
  );
};

export default ListItem;
