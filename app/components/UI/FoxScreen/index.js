import React, { PureComponent } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    image: {
      width: 100,
      height: 100,
    },
  });

const foxImage = require('../../../images/branding/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * View component that displays the MetaMask fox
 * in the middle of the screen
 */
export default class FoxScreen extends PureComponent {
  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.wrapper} testID={CommonSelectorsIDs.FOX_SCREEN}>
        <Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
      </View>
    );
  };
}

FoxScreen.contextType = ThemeContext;
