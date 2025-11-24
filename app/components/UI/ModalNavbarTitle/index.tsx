import React, { PureComponent } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    ...fontStyles.normal,
  },
});

interface ModalNavbarTitleProps {
  /**
   * Name of the current view
   */
  title: string;
}

/**
 * UI PureComponent that renders inside the modal navbar
 */
export default class ModalNavbarTitle extends PureComponent<ModalNavbarTitleProps> {
  render = () => {
    const { title } = this.props;
    return (
      <View style={styles.wrapper}>
        <Text style={styles.title}>{title}</Text>
      </View>
    );
  };
}
