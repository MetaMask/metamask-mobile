/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import Text from '../../../component-library/components/Texts/Text';

// Internal dependencies.
import styleSheet from './TagColored.styles';
import { TagColoredProps } from './TagColored.types';
import {
  DEFAULT_TAGCOLORED_COLOR,
  DEFAULT_TAGCOLORED_TEXTVARIANT,
  TAGCOLORED_TESTID,
  TAGCOLORED_TEXT_TESTID,
} from './TagColored.constants';

const TagColored: React.FC<TagColoredProps> = ({
  style,
  color = DEFAULT_TAGCOLORED_COLOR,
  children,
}) => {
  const { styles } = useStyles(styleSheet, { style, color });
  return (
    <View style={styles.base} testID={TAGCOLORED_TESTID}>
      {typeof children === 'string' ? (
        <Text
          variant={DEFAULT_TAGCOLORED_TEXTVARIANT}
          style={styles.text}
          testID={TAGCOLORED_TEXT_TESTID}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

export default TagColored;
