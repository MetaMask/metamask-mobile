import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, ImageBackground, View } from 'react-native';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      position: 'absolute',
      borderTopWidth: 0,
      flex: 1,
      width: null,
      height: null,
    },
  });

const images = {
  a: require('../../../images/welcome-bg1.png'), // eslint-disable-line
  b: require('../../../images/welcome-bg2.png'), // eslint-disable-line
  c: require('../../../images/welcome-bg3.png'), // eslint-disable-line
  d: require('../../../images/welcome-bg4.png'), // eslint-disable-line
  carousel: null,
};

const OnboardingScreenWithBg = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.flex}>
      <ImageBackground
        source={images[props.screen]}
        style={styles.wrapper}
        resizeMode={'stretch'}
      >
        {props.children}
      </ImageBackground>
    </View>
  );
};

OnboardingScreenWithBg.propTypes = {
  /**
   * String specifying the image
   * to be used
   */
  screen: PropTypes.string,
  /**
   * Children components of the GenericButton
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children: PropTypes.any,
};

export default OnboardingScreenWithBg;
