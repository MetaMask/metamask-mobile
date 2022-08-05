/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './CellContainerMultiselectItem.styles';
import { CellContainerMultiselectItemProps } from './CellContainerMultiselectItem.types';
import { MULTISELECT_ITEM_UNDERLAY_ID } from './CellContainerMultiselectItem.constants';

const CellContainerMultiselectItem: React.FC<CellContainerMultiselectItemProps> =
  ({ style, isSelected, children, ...props }) => {
    const { styles } = useStyles(styleSheet, { style, isSelected });

    const renderUnderlay = useCallback(
      () =>
        isSelected && (
          <View testID={MULTISELECT_ITEM_UNDERLAY_ID} style={styles.underlay} />
        ),
      [isSelected, styles],
    );

    return (
      <TouchableOpacity style={styles.base} {...props}>
        {renderUnderlay()}
        <Checkbox style={styles.checkbox} isSelected={isSelected} />
        {children}
      </TouchableOpacity>
    );
  };

export default CellContainerMultiselectItem;
