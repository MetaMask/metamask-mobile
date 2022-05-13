import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { fontStyles } from '../../../styles/common';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    header: {
      width: '100%',
      position: 'relative',
      paddingBottom: 20,
    },
    title: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
    },
    back: {
      position: 'absolute',
      zIndex: 1,
      paddingVertical: 10,
      paddingRight: 10,
    },
  });

class ConnectHeader extends Component {
  static propTypes = {
    action: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  };

  render() {
    const { title, action } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={action}>
          <IonicIcon
            name={'ios-arrow-back'}
            size={24}
            color={colors.text.default}
          />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
    );
  }
}

ConnectHeader.contextType = ThemeContext;

export default ConnectHeader;
