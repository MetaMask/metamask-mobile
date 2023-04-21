/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './ListItem.styles';
import { ListItemProps, VerticalAlignment } from './ListItem.types';

const ListItem: React.FC<ListItemProps> = ({
  style,
  children,
  gap,
  verticalAlignment = VerticalAlignment.Top,
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, verticalAlignment });
  return (
    <View style={styles.base}>
      {React.Children.map(children, (child, index) => {
        // if (index > 0 && React.isValidElement(child)) {
        //   return React.cloneElement(child, {
        //     ...child.props,
        //     style: { ...child.props.style },
        //   });
        // }
        return child;
      })}
    </View>
  );
};

export default ListItem;
