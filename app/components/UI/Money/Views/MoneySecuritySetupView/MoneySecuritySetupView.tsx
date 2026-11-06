import React, { useCallback, useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  type TextLayoutEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { useFonts } from 'expo-font';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBase,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MoneySecuritySetupViewTestIds } from './MoneySecuritySetupView.testIds';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import moneyTwoFactorAnimation from '../../../../../animations/money_2fa_v2.riv';
import GrotzecCondBold from '../../../../../fonts/GrotzecCond-Bold.otf';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    minHeight: 0,
  },
  splashNotNowButton: {
    width: '100%',
    height: 40,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  splashTextContainer: {
    alignItems: 'center',
  },
  splashDescription: {
    maxWidth: 336,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  splashArtworkContainer: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  splashArtwork: {
    width: 260,
    height: 260,
    transform: [{ translateX: -8 }],
  },
  splashFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  splashButton: {
    borderRadius: 28,
  },
  splashButtonContainer: {
    width: '100%',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  hero: {
    alignItems: 'flex-start',
    paddingTop: 22,
    paddingHorizontal: 16,
  },
  centeredText: {
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  methodRow: {
    minHeight: 76,
    paddingVertical: 18,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconTopAligned: {
    alignSelf: 'flex-start',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});

interface SecurityMethodRowProps {
  iconName: IconName;
  title: string;
  description: string;
  isComplete?: boolean;
  keepIconTopAligned?: boolean;
}

const SecurityMethodRow = ({
  iconName,
  title,
  description,
  isComplete = false,
  keepIconTopAligned = false,
}: SecurityMethodRowProps) => {
  const { colors } = useTheme();
  const [titleLineCount, setTitleLineCount] = useState(1);
  const [descriptionLineCount, setDescriptionLineCount] = useState(1);
  const hasThreeOrMoreLines = titleLineCount + descriptionLineCount >= 3;

  const handleTitleLayout = useCallback(({ nativeEvent }: TextLayoutEvent) => {
    setTitleLineCount(nativeEvent.lines.length);
  }, []);
  const handleDescriptionLayout = useCallback(
    ({ nativeEvent }: TextLayoutEvent) => {
      setDescriptionLineCount(nativeEvent.lines.length);
    },
    [],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={
        hasThreeOrMoreLines ? BoxAlignItems.Start : BoxAlignItems.Center
      }
      gap={3}
      style={styles.methodRow}
    >
      <Box
        style={[
          styles.methodIcon,
          { backgroundColor: colors.background.muted },
          (hasThreeOrMoreLines || keepIconTopAligned) &&
            styles.methodIconTopAligned,
        ]}
      >
        <Icon
          name={iconName}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Box>
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          onTextLayout={handleTitleLayout}
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
          onTextLayout={handleDescriptionLayout}
        >
          {description}
        </Text>
      </Box>
      {isComplete ? (
        <Icon
          name={IconName.Check}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      ) : null}
    </Box>
  );
};

const MoneySecuritySetupView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { colors, brandColors, themeAppearance } = useTheme();
  const [fontsLoaded] = useFonts({
    'GrotzecCond-Bold': GrotzecCondBold,
  });
  const { passkeyCount } = useMoneyFinishSetup();
  const { isAuthenticatorAdded } = useMoneySecurityMethods(passkeyCount);
  const splashTitleSize = screenHeight < 750 ? 40 : 45;
  const startsAtMethods = passkeyCount > 0;
  const [step, setStep] = useState<'benefits' | 'methods'>(
    startsAtMethods ? 'methods' : 'benefits',
  );
  const [showSplashArtwork, setShowSplashArtwork] = useState(false);
  const splashTitleEntrance = useSharedValue(0);
  const splashDescriptionEntrance = useSharedValue(0);
  const splashButtonsEntrance = useSharedValue(0);
  const splashArtworkEntrance = useSharedValue(0);

  useEffect(() => {
    let artworkTimer: ReturnType<typeof setTimeout> | undefined;
    splashTitleEntrance.value = 0;
    splashDescriptionEntrance.value = 0;
    splashButtonsEntrance.value = 0;
    splashArtworkEntrance.value = 0;
    setShowSplashArtwork(false);
    if (step === 'benefits') {
      splashTitleEntrance.value = withDelay(
        80,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        }),
      );
      splashDescriptionEntrance.value = withDelay(
        280,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        }),
      );
      splashButtonsEntrance.value = withDelay(
        480,
        withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        }),
      );
      splashArtworkEntrance.value = withDelay(
        680,
        withTiming(1, {
          duration: 750,
          easing: Easing.out(Easing.cubic),
        }),
      );
      artworkTimer = setTimeout(() => {
        setShowSplashArtwork(true);
      }, 680);
    }

    return () => {
      if (artworkTimer) {
        clearTimeout(artworkTimer);
      }
      cancelAnimation(splashTitleEntrance);
      cancelAnimation(splashDescriptionEntrance);
      cancelAnimation(splashButtonsEntrance);
      cancelAnimation(splashArtworkEntrance);
    };
  }, [
    splashArtworkEntrance,
    splashButtonsEntrance,
    splashDescriptionEntrance,
    splashTitleEntrance,
    step,
  ]);

  const splashTitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashTitleEntrance.value,
    transform: [
      {
        translateY: interpolate(splashTitleEntrance.value, [0, 1], [20, 0]),
      },
      {
        scale: interpolate(splashTitleEntrance.value, [0, 1], [0.98, 1]),
      },
    ],
  }));
  const splashDescriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashDescriptionEntrance.value,
    transform: [
      {
        translateY: interpolate(
          splashDescriptionEntrance.value,
          [0, 1],
          [18, 0],
        ),
      },
    ],
  }));
  const splashButtonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashButtonsEntrance.value,
    transform: [
      {
        translateY: interpolate(splashButtonsEntrance.value, [0, 1], [18, 0]),
      },
    ],
  }));
  const splashArtworkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashArtworkEntrance.value,
    transform: [
      {
        translateY: interpolate(splashArtworkEntrance.value, [0, 1], [24, 0]),
      },
    ],
  }));

  const handleBack = useCallback(() => {
    if (step === 'methods' && !startsAtMethods) {
      setStep('benefits');
      return;
    }
    navigation.goBack();
  }, [navigation, startsAtMethods, step]);

  const handlePrimaryAction = useCallback(() => {
    if (step === 'benefits') {
      setStep('methods');
      return;
    }
    if (passkeyCount > 0) {
      navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
        entryPoint: 'protect_money',
      });
      return;
    }
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { continueToAuthenticatorSetup: true },
    });
  }, [navigation, passkeyCount, step]);

  if (step === 'benefits') {
    return (
      <LinearGradient
        colors={[colors.accent03.dark, brandColors.lime800]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.safeArea}
        testID={MoneySecuritySetupViewTestIds.CONTAINER}
      >
        <StatusBar barStyle="light-content" />
        <Box style={[styles.splashContent, { paddingTop: insets.top + 56 }]}>
          <Animated.View
            style={[styles.splashTextContainer, splashTitleAnimatedStyle]}
          >
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              style={[
                styles.splashTitle,
                {
                  color: colors.accent03.normal,
                  fontSize: splashTitleSize,
                  lineHeight: splashTitleSize,
                  ...(fontsLoaded && { fontFamily: 'GrotzecCond-Bold' }),
                },
              ]}
            >
              {strings('money.security_setup.benefits_title')}
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.splashTextContainer, splashDescriptionAnimatedStyle]}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              style={[
                styles.splashDescription,
                { color: colors.accent03.light },
              ]}
            >
              {strings('money.security_setup.benefits_description')}
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.splashArtworkContainer, splashArtworkAnimatedStyle]}
          >
            {showSplashArtwork ? (
              <Rive
                source={moneyTwoFactorAnimation}
                stateMachineName="State Machine 1"
                autoplay
                fit={Fit.Contain}
                alignment={Alignment.Center}
                style={styles.splashArtwork}
              />
            ) : null}
          </Animated.View>
        </Box>
        <Box
          style={[
            styles.splashFooter,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <Animated.View
            style={[styles.splashButtonContainer, splashButtonsAnimatedStyle]}
          >
            <ButtonBase
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handlePrimaryAction}
              style={[
                styles.splashButton,
                { backgroundColor: colors.accent03.light },
              ]}
              testID={MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                style={{ color: colors.accent03.dark }}
              >
                {strings('money.security_setup.continue')}
              </Text>
            </ButtonBase>
          </Animated.View>
          <Animated.View
            style={[styles.splashButtonContainer, splashButtonsAnimatedStyle]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleBack}
              style={styles.splashNotNowButton}
              testID={MoneySecuritySetupViewTestIds.NOT_NOW_BUTTON}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                style={{ color: colors.accent03.light }}
              >
                {strings('money.security_setup.not_now')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Box>
      </LinearGradient>
    );
  }

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySecuritySetupViewTestIds.CONTAINER}
    >
      <StatusBar
        barStyle={
          themeAppearance === AppThemeKey.dark
            ? 'light-content'
            : 'dark-content'
        }
      />
      <Box style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          accessibilityLabel={strings('money.security_setup.back')}
          testID={MoneySecuritySetupViewTestIds.BACK_BUTTON}
        />
      </Box>

      <Box style={styles.content}>
        <Box style={styles.hero}>
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            style={styles.centeredText}
          >
            {strings('money.security_setup.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            style={styles.centeredText}
            twClassName="mt-2"
          >
            {strings('money.security_setup.description')}
          </Text>
        </Box>

        <Box twClassName="mt-4 px-4">
          <SecurityMethodRow
            iconName={IconName.Key}
            title={strings('money.security_setup.passkey_title')}
            description={strings(
              passkeyCount > 0
                ? 'money.security_setup.passkey_saved_description'
                : 'money.security_setup.passkey_description',
            )}
            isComplete={passkeyCount > 0}
            keepIconTopAligned
          />
          <SecurityMethodRow
            iconName={IconName.QrCode}
            title={strings('money.security_setup.authenticator_title')}
            description={strings(
              isAuthenticatorAdded
                ? 'money.security_setup.authenticator_added_description'
                : 'money.security_setup.authenticator_description',
            )}
            isComplete={isAuthenticatorAdded}
            keepIconTopAligned={!isAuthenticatorAdded}
          />
        </Box>
      </Box>

      <Box
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handlePrimaryAction}
          testID={MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON}
        >
          {strings(
            passkeyCount > 0
              ? 'money.security_setup.continue'
              : 'money.security_setup.get_started',
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneySecuritySetupView;
