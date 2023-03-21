/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import React from 'react';
import { Animated, Dimensions, View, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native';
import { useTheme, useAssetFromTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { SPLASH_SCREEN_METAMASK_ANIMATION_ID } from '../../../../wdio/screen-objects/testIDs/Components/MetaMaskAnimation.testIds';

const LOGO_SIZE = 175;
const LOGO_PADDING = 25;

const wordmarkLight = require('../../../animations/wordmark-light.json');
const wordmarkDark = require('../../../animations/wordmark-dark.json');

const createStyles = (colors: any) =>
  StyleSheet.create({
    main: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
    },
    metamaskName: {
      marginTop: 10,
      height: 25,
      width: 170,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoWrapper: {
      paddingTop: 50,
      marginTop:
        Dimensions.get('window').height / 2 - LOGO_SIZE / 2 - LOGO_PADDING,
      height: LOGO_SIZE + LOGO_PADDING * 2,
    },
    foxAndName: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    animation: {
      width: 110,
      height: 110,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fox: {
      width: 110,
      height: 110,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const MetaMaskAnimation = ({
  opacity,
  animationRef,
  animationName,
  onAnimationFinish,
}: {
  opacity: number;
  animationRef: any;
  animationName: any;
  onAnimationFinish: () => void;
}): JSX.Element => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const wordmark = useAssetFromTheme(wordmarkLight, wordmarkDark);

  return (
    <View style={styles.main}>
      <Animated.View style={[styles.logoWrapper, { opacity }]}>
        <View style={styles.fox}>
          <View
            style={styles.foxAndName}
            {...generateTestId(Platform, SPLASH_SCREEN_METAMASK_ANIMATION_ID)}
          >
            <LottieView
              autoPlay={false}
              ref={animationRef}
              style={styles.animation}
              loop={false}
              // eslint-disable-next-line
              source={require('../../../animations/fox-in.json')}
              onAnimationFinish={onAnimationFinish}
            />
            <LottieView
              autoPlay={false}
              ref={animationName}
              style={styles.metamaskName}
              loop={false}
              // eslint-disable-next-line
              source={wordmark}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

MetaMaskAnimation.propTypes = {
  opacity: PropTypes.object,
  animation: PropTypes.object,
  animationName: PropTypes.object,
  onAnimationFinish: PropTypes.func,
};

export default MetaMaskAnimation;
