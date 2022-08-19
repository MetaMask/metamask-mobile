import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    caretDown: {
      textAlign: 'right',
      color: colors.text.alternative,
      marginLeft: 10,
      marginRight: 5,
    },
  });

function SelectorButton({ onPress, disabled, children, ...props }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} {...props}>
      <View style={styles.container}>
        <>{children}</>
        <Icon name="caret-down" size={18} style={styles.caretDown} />
      </View>
    </TouchableOpacity>
  );
}

SelectorButton.propTypes = {
  children: PropTypes.node,
  onPress: PropTypes.func,
  disabled: PropTypes.bool,
};

export default SelectorButton;
