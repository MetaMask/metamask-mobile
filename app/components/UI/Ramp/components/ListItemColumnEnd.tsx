import React from 'react';
import { StyleSheet } from 'react-native';
import ListItemColumn from '../../../../component-library/components/List/ListItemColumn';
import { ListItemColumnProps } from '../../../../component-library/components/List/ListItemColumn/ListItemColumn.types';

const styles = StyleSheet.create({
  alignEnd: {
    alignItems: 'flex-end',
  },
});

const ListItemColumnEnd: React.FC<ListItemColumnProps> = ({
  style,
  ...props
}) => (
  <ListItemColumn
    style={{
      ...(typeof style === 'object' ? style : {}),
      ...styles.alignEnd,
    }}
    {...props}
  />
);

export default ListItemColumnEnd;
