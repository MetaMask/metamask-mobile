import React from 'react';
import { useStyles } from '../../../hooks';
import { View } from 'react-native';
import {
  KeyValueRowSectionAlignments,
  KeyValueSectionProps,
} from '../KeyValueRow.types';
import stylesSheet from './KeyValueSection.styles';

/**
 * A container representing either the left or right side of the KeyValueRow.
 * For desired results, use only two <KeyValueSection> components within the <KeyValueRowRoot>.
 *
 * @component
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - The child components.
 * @param {KeyValueRowSectionAlignments} [props.align] - The alignment of the KeyValueSection. Defaults to KeyValueRowSectionAlignments.RIGHT
 *
 * @returns {JSX.Element} The rendered KeyValueSection component.
 */
const KeyValueSection = ({
  children,
  align = KeyValueRowSectionAlignments.LEFT,
}: KeyValueSectionProps) => {
  const { styles } = useStyles(stylesSheet, {});

  return (
    <View style={{ ...styles.keyValueSectionContainer, alignItems: align }}>
      {children}
    </View>
  );
};

export default KeyValueSection;
