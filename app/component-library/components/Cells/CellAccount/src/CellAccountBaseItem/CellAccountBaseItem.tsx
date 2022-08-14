/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import CellAccountContent from '../CellAccountContent';

// Internal dependencies.
import styleSheet from './CellAccountBaseItem.styles';
import { CellAccountBaseItemProps } from './CellAccountBaseItem.types';

const CellAccountBaseItem = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  children,
  ...props
}: CellAccountBaseItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      <CellAccountContent
        avatarAccountAddress={avatarAccountAddress}
        avatarAccountType={avatarAccountType}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
      >
        {children}
      </CellAccountContent>
    </View>
  );
};

export default CellAccountBaseItem;
