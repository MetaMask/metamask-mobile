import React from 'react';
import {
  StyleSheet,
  ImageBackground,
  View,
  ImageSourcePropType,
} from 'react-native';
import { useTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors']) =>
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

type ImageKeys = 'a' | 'b' | 'c' | 'd' | 'carousel';

type ImagesType = {
  [key in ImageKeys]: ImageSourcePropType | null;
};

const images: ImagesType = {
  a: require('../../../images/welcome-bg1.png'), // eslint-disable-line
  b: require('../../../images/welcome-bg2.png'), // eslint-disable-line
  c: require('../../../images/welcome-bg3.png'), // eslint-disable-line
  d: require('../../../images/welcome-bg4.png'), // eslint-disable-line
  carousel: null,
};

interface OnboardingScreenWithBgProps {
  /**
   * String specifying the image to be used
   */
  screen: ImageKeys;

  /**
   * Children components of the OnboardingScreenWithBg
   * It can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children: React.ReactNode;

  /**
   * Background color of the screen
   */
  backgroundColor?: string;
}

const OnboardingScreenWithBg: React.FC<OnboardingScreenWithBgProps> = ({
  screen,
  children,
  backgroundColor,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const backgroundImage = images[screen];

  return (
    <View style={[styles.flex, { backgroundColor }]}>
      {backgroundImage && (
        <ImageBackground
          source={backgroundImage}
          style={styles.wrapper}
          resizeMode={'stretch'}
        >
          {children}
        </ImageBackground>
      )}
      {!backgroundImage && children}
    </View>
  );
};

export default OnboardingScreenWithBg;
