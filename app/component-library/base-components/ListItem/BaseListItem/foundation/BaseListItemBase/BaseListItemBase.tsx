/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import styleSheet from './BaseListItemBase.styles';
import { BaseListItemBaseProps } from './BaseListItemBase.types';
import {
  DEFAULT_BASELISTITEMBASE_GAP,
  DEFAULT_BASELISTITEMBASE_VERTICALALIGNMENT,
  TESTID_BASELISTITEMBASE_GAP,
} from './BaseListItemBase.constants';

const BaseListItemBase: React.FC<BaseListItemBaseProps> = ({
  style,
  children,
  gap = DEFAULT_BASELISTITEMBASE_GAP,
  verticalAlignment = DEFAULT_BASELISTITEMBASE_VERTICALALIGNMENT,
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    verticalAlignment,
  });

  return (
    <View style={styles.base} accessible accessibilityRole="none">
      {React.Children.toArray(children)
        .filter((child) => !!child)
        .map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <View
                style={{ width: gap }}
                testID={TESTID_BASELISTITEMBASE_GAP}
                accessible={false}
              />
            )}
            {child}
          </React.Fragment>
        ))}
    </View>
  );
};

export default BaseListItemBase;
