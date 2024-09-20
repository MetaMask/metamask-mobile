import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../util/theme';
import { Theme } from '@metamask/design-tokens';
import { colors as importedColors } from '../../styles/common';

interface ModalDraggerProps {
  borderless?: boolean;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    draggerWrapper: {
      width: '100%',
      height: 33,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
    borderless: {
      borderColor: importedColors.transparent,
    },
    dragger: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
    },
  });

function ModalDragger({ borderless }: ModalDraggerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.draggerWrapper, borderless && styles.borderless]}>
      <View style={styles.dragger} />
    </View>
  );
}

export default ModalDragger;
