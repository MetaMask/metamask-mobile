/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';

// Internal dependencies.
import styleSheet from './ListSearchableBase.styles';
import { ListSearchableBaseProps } from './ListSearchableBase.types';

const ListSearchableBase: React.FC<ListSearchableBaseProps> = ({
  style,
  searchInputEl,
  filteredListEl,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base}>
      {searchInputEl && searchInputEl}
      {filteredListEl && (
        <View style={styles.filteredList}>{filteredListEl}</View>
      )}
    </View>
  );
};

export default ListSearchableBase;
