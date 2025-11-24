import { useStyles } from '../../../hooks';
import React from 'react';
import { View } from 'react-native';
import { KeyValueRowRootProps } from '../KeyValueRow.types';
import styleSheet from './KeyValueRoot.styles';

/**
 * The main container for the KeyValueRow component.
 * When creating custom KeyValueRow components, this must be the outermost component wrapping the two <KeyValueSection/> components.
 *
 * e.g.
 * ```
 * <KeyValueRowRoot>
 *  <KeyValueSection></KeyValueSection>
 *  <KeyValueSection></KeyValueSection>
 * </KeyValueRowRoot>
 * ```
 *
 * @component
 * @param {Object} props - Component props.
 * @param {Array<ReactNode>} props.children - The two <KeyValueSection> children.
 * @param {ViewProps} [props.style] - Optional styling
 *
 * @returns {JSX.Element} The rendered Root component.
 */
const KeyValueRowRoot = ({
  children,
  style: customStyles,
}: KeyValueRowRootProps) => {
  const { styles: defaultStyles } = useStyles(styleSheet, {});

  const styles = [defaultStyles.rootContainer, customStyles];

  return <View style={styles}>{children}</View>;
};

export default KeyValueRowRoot;
