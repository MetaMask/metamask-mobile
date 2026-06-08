/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Text, { TextVariant, TextColor } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Tag.styles';
import { TagProps } from './Tag.types';

/**
 * @deprecated Please update your code to use `Tag` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Tag/README.md}
 */
const Tag = ({ label, style, ...props }: TagProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      <Text variant={TextVariant.BodyXSMedium} color={TextColor.Alternative}>
        {label}
      </Text>
    </View>
  );
};

export default Tag;
