import React, { useRef, useState } from 'react';
import { ScrollView, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import CollectiblesOnboardingVideo from './CollectiblesOnboardingVideo';
import { CINEMA_INK } from './CollectiblesOnboarding.constants';
import { CollectiblesOnboardingSelectorsIDs } from './CollectiblesOnboarding.testIds';
import type { CollectiblesOnboardingProps } from './CollectiblesOnboarding.types';

const ONBOARDING_THEME = {
  ...darkTheme,
  brandColors: brandColor,
  themeAppearance: AppThemeKey.dark,
};
const STEPS = ['pull', 'choices'] as const;

/** Two cinematic introductions; completion remains an explicit user action. */
const CollectiblesOnboardingContent = ({
  onComplete,
  onClose,
  isActive = true,
}: CollectiblesOnboardingProps) => {
  const tw = useTailwind();
  const windowSize = useWindowDimensions();
  const [canvas, setCanvas] = useState({
    width: windowSize.width,
    height: windowSize.height,
    measured: false,
  });
  const { width, height } = canvas;
  const [step, setStep] = useState<0 | 1>(0);
  const completed = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const isLastStep = step === 1;
  const goToStep = (nextStep: 0 | 1) => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setStep(nextStep);
  };
  const complete = () => {
    if (!completed.current) {
      completed.current = true;
      onComplete();
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={tw.style('flex-1', { backgroundColor: CINEMA_INK })}
      testID={CollectiblesOnboardingSelectorsIDs.CONTAINER}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0) {
          setCanvas((current) =>
            current.measured &&
            current.width === layout.width &&
            current.height === layout.height
              ? current
              : { width: layout.width, height: layout.height, measured: true },
          );
        }
      }}
    >
      <CollectiblesOnboardingVideo
        key={step}
        step={step}
        isActive={isActive && canvas.measured}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-[58px] shrink-0"
      >
        {isLastStep && (
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => goToStep(0)}
            accessibilityLabel={strings('navigation.back')}
            twClassName="absolute left-2"
            testID={CollectiblesOnboardingSelectorsIDs.BACK}
          />
        )}
        <Box
          flexDirection={BoxFlexDirection.Row}
          testID={CollectiblesOnboardingSelectorsIDs.PROGRESS}
          accessibilityLabel={strings('collectibles.onboarding.step', {
            step: step + 1,
            total: STEPS.length,
          })}
        >
          {STEPS.map((name, index) => (
            <ButtonBase
              key={name}
              size={ButtonBaseSize.Md}
              onPress={() => goToStep(index === 0 ? 0 : 1)}
              accessibilityLabel={strings('collectibles.onboarding.step', {
                step: index + 1,
                total: STEPS.length,
              })}
              accessibilityState={{ selected: step === index }}
              twClassName="w-11 px-0 bg-transparent"
              testID={
                index === 0
                  ? CollectiblesOnboardingSelectorsIDs.FIRST_STEP
                  : CollectiblesOnboardingSelectorsIDs.SECOND_STEP
              }
            >
              <Box
                twClassName={`h-2 rounded-full ${step === index ? 'w-[30px] bg-text-default' : 'w-2 bg-text-muted'}`}
              />
            </ButtonBase>
          ))}
        </Box>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Lg}
          onPress={onClose}
          accessibilityLabel={strings('navigation.close')}
          twClassName="absolute right-4 rounded-full bg-muted/50"
          testID={CollectiblesOnboardingSelectorsIDs.CLOSE}
        />
      </Box>
      <ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('grow justify-end')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        onTouchStart={({ nativeEvent }) => {
          touchStart.current = {
            x: nativeEvent.pageX,
            y: nativeEvent.pageY,
          };
        }}
        onTouchEnd={({ nativeEvent }) => {
          const dx = nativeEvent.pageX - touchStart.current.x;
          const dy = nativeEvent.pageY - touchStart.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            goToStep(dx < 0 ? 1 : 0);
          }
        }}
      >
        <Box
          style={tw.style({
            flexGrow: 1,
            flexShrink: 0,
            minHeight:
              height <= 700
                ? 220
                : Math.min(
                    Math.max(height * (step === 0 ? 0.44 : 0.37), 190),
                    step === 0 ? 390 : 330,
                  ),
          })}
        />
        <Box
          twClassName="px-[26px] pb-[18px] gap-[15px] shrink-0"
          style={tw.style({ paddingTop: height <= 700 ? 18 : 25 })}
        >
          <LinearGradient
            colors={[`${CINEMA_INK}00`, `${CINEMA_INK}ed`, CINEMA_INK]}
            locations={[0, 0.28, 1]}
            style={tw.style('absolute inset-0')}
          />
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            twClassName="text-center tracking-[-1.1px] w-full max-w-[355px] self-center shrink-0"
            style={tw.style({
              fontSize:
                height <= 700 ? 29 : Math.min(Math.max(width * 0.082, 28), 34),
              lineHeight:
                (height <= 700
                  ? 29
                  : Math.min(Math.max(width * 0.082, 28), 34)) * 1.12,
            })}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            testID={CollectiblesOnboardingSelectorsIDs.TITLE}
          >
            {strings(`collectibles.onboarding.${STEPS[step]}_title`)}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center w-full max-w-[350px] self-center shrink-0"
          >
            {strings(`collectibles.onboarding.${STEPS[step]}_description`)}
          </Text>
        </Box>
      </ScrollView>
      <SafeAreaView
        edges={{ bottom: 'maximum' }}
        style={tw.style('px-6 pt-2 pb-6 shrink-0')}
      >
        <Button
          isFullWidth
          size={ButtonSize.Lg}
          onPress={isLastStep ? complete : () => goToStep(1)}
          twClassName="h-14"
          testID={
            isLastStep
              ? CollectiblesOnboardingSelectorsIDs.COMPLETE
              : CollectiblesOnboardingSelectorsIDs.NEXT
          }
        >
          {strings(
            isLastStep
              ? 'collectibles.onboarding.get_started'
              : 'collectibles.onboarding.next',
          )}
        </Button>
      </SafeAreaView>
    </SafeAreaView>
  );
};

/** The cinematic artwork uses its own dark presentation in either app theme. */
const CollectiblesOnboarding = (props: CollectiblesOnboardingProps) => (
  <ThemeContext.Provider value={ONBOARDING_THEME}>
    <ThemeProvider theme={Theme.Dark}>
      <StatusBar barStyle="light-content" />
      <CollectiblesOnboardingContent {...props} />
    </ThemeProvider>
  </ThemeContext.Provider>
);

export default CollectiblesOnboarding;
