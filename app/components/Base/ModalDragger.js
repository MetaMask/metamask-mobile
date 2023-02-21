import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../util/theme';
import { colors as importedColors } from '../../styles/common';

const createStyles = (colors) =>
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

function ModalDragger({ borderless }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.draggerWrapper, borderless && styles.borderless]}>
      <View style={styles.dragger} />
    </View>
  );
}

ModalDragger.propTypes = {
  borderless: PropTypes.bool,
};

export default ModalDragger;
