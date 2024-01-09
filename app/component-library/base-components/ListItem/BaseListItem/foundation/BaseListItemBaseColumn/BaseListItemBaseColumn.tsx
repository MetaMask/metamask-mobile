/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import styleSheet from './BaseListItemBaseColumn.styles';
import { BaseListItemBaseColumnProps } from './BaseListItemBaseColumn.types';
import {
  DEFAULT_BASELISTITEMBASECOLUMN_WIDTHTYPE,
  TESTID_BASELISTITEMBASECOLUMN,
} from './BaseListItemBaseColumn.constants';

const BaseListItemBaseColumn: React.FC<BaseListItemBaseColumnProps> = ({
  style,
  children,
  widthType = DEFAULT_BASELISTITEMBASECOLUMN_WIDTHTYPE,
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    widthType,
  });

  return (
    <View style={styles.base} testID={TESTID_BASELISTITEMBASECOLUMN}>
      {children}
    </View>
  );
};

export default BaseListItemBaseColumn;
