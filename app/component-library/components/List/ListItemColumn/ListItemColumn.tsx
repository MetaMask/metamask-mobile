/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './ListItemColumn.styles';
import { ListItemColumnProps } from './ListItemColumn.types';
import {
  DEFAULT_LISTITEMCOLUMN_WIDTHTYPE,
  TESTID_LISTITEMCOLUMN,
} from './ListItemColumn.constants';

const ListItemColumn: React.FC<ListItemColumnProps> = ({
  style,
  children,
  widthType = DEFAULT_LISTITEMCOLUMN_WIDTHTYPE,
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    widthType,
  });

  return (
    <View style={styles.base} testID={TESTID_LISTITEMCOLUMN}>
      {children}
    </View>
  );
};

export default ListItemColumn;
