import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import { useAppThemeFromContext } from '../../../util/theme';
import Device from '../../../util/device';

const LOGO_WIDTH = Device.isMediumDevice() ? 160 : 200;
// Wordmark PNG is ~2:1 (1799x891), so keep height at half the width.
const LOGO_HEIGHT = LOGO_WIDTH / 2;

const createStyles = () =>
  StyleSheet.create({
    image: {
      alignSelf: 'center',
      width: LOGO_WIDTH,
      height: LOGO_HEIGHT,
    },
    // Static resting position of the wordmark (previously the end state of the
    // build-up animation: the centered logo shifted up by 180px). Centered
    // horizontally with its vertical midpoint 180px above screen center.
    logoWrapper: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      height: LOGO_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -(LOGO_HEIGHT / 2) - 180,
    },
    // Buttons resting at the vertical midpoint (createWrapper's marginTop 180
    // minus the 180px upward shift).
    createWrapper: {
      flexDirection: 'column',
      rowGap: 16,
      marginBottom: 16,
      position: 'absolute',
      top: '50%',
      left: 16,
      right: 16,
      marginTop: 0,
      alignItems: 'stretch',
    },
  });

const OnboardingAnimation = ({
  children,
  startOnboardingAnimation,
  setStartFoxAnimation,
}: {
  children: React.ReactNode;
  startOnboardingAnimation: boolean;
  setStartFoxAnimation: (value: boolean) => void;
}) => {
  const { colors } = useAppThemeFromContext();
  const styles = createStyles();

  // The wordmark build-up animation has been removed; trigger the fox animation
  // as soon as onboarding is ready so downstream behavior is preserved.
  useEffect(() => {
    if (startOnboardingAnimation) {
      setStartFoxAnimation(true);
    }
  }, [startOnboardingAnimation, setStartFoxAnimation]);

  return (
    <>
      <View style={styles.logoWrapper} pointerEvents="none">
        <Image
          source={METAMASK_NAME}
          style={[styles.image, { tintColor: colors.icon.default }]}
          resizeMode="contain"
          testID="metamask-wordmark-logo"
        />
      </View>
      <View style={styles.createWrapper} pointerEvents="box-none">
        {children}
      </View>
    </>
  );
};

export default OnboardingAnimation;
