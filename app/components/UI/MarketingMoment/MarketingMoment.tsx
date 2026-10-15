import React from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import { MarketingMomentSelectorsIDs } from './MarketingMoment.testIds';
import type {
  MarketingMomentAction,
  MarketingMomentProps,
} from './MarketingMoment.types';

const enterDown = (step: number) =>
  FadeInDown.duration(AnimationDuration.Slowly).delay(
    step * AnimationDuration.Quickly,
  );

const enterFade = (step: number) =>
  FadeIn.duration(AnimationDuration.Slowly).delay(
    step * AnimationDuration.Quickly,
  );

const MarketingMomentContent = ({
  title,
  titleProps,
  description,
  descriptionProps,
  children,
  childrenWrapperAnimatedViewProps,
  artwork,
  primaryAction,
  secondaryAction,
  background,
  testID = MarketingMomentSelectorsIDs.CONTAINER,
}: Omit<MarketingMomentProps, 'theme'>) => {
  const tw = useTailwind();
  const { label: primaryLabel, ...primaryButtonProps } =
    primaryAction ?? ({} as Partial<MarketingMomentAction>);
  const { label: secondaryLabel, ...secondaryButtonProps } =
    secondaryAction ?? ({} as Partial<MarketingMomentAction>);

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Column}
      twClassName={`relative min-h-0 w-full flex-1 ${
        background ? 'bg-transparent' : 'bg-default'
      }`}
    >
      {background ? (
        <Box pointerEvents="none" twClassName="absolute inset-0">
          {background}
        </Box>
      ) : null}
      <SafeAreaView style={tw.style('min-h-0 flex-1')}>
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={4}
          paddingHorizontal={6}
          twClassName="mt-12 shrink-0"
        >
          {title ? (
            <Animated.View entering={enterDown(0)} style={tw.style('w-full')}>
              {typeof title === 'string' ? (
                <Text
                  variant={TextVariant.DisplayLg}
                  fontFamily={FontFamily.Hero}
                  fontWeight={FontWeight.Regular}
                  accessibilityRole="header"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  twClassName="w-full text-center"
                  testID={MarketingMomentSelectorsIDs.TITLE}
                  {...titleProps}
                >
                  {title}
                </Text>
              ) : (
                title
              )}
            </Animated.View>
          ) : null}
          {description ? (
            <Animated.View entering={enterDown(1)}>
              {typeof description === 'string' ? (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                  testID={MarketingMomentSelectorsIDs.DESCRIPTION}
                  {...descriptionProps}
                >
                  {description}
                </Text>
              ) : (
                description
              )}
            </Animated.View>
          ) : null}
          {children ? (
            <Animated.View
              entering={enterDown(2)}
              {...childrenWrapperAnimatedViewProps}
            >
              {children}
            </Animated.View>
          ) : null}
        </Box>

        {artwork ? (
          <Animated.View
            entering={enterFade(2)}
            style={tw.style('min-h-0 w-full flex-1')}
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              paddingHorizontal={6}
              twClassName="min-h-0 w-full flex-1 overflow-hidden"
              testID={MarketingMomentSelectorsIDs.ARTWORK}
            >
              {artwork}
            </Box>
          </Animated.View>
        ) : (
          <Box twClassName="flex-1" />
        )}

        {primaryAction || secondaryAction ? (
          <Animated.View entering={enterDown(3)}>
            <Box
              flexDirection={BoxFlexDirection.Column}
              gap={2}
              paddingHorizontal={4}
              twClassName="shrink-0"
            >
              {primaryAction ? (
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  {...primaryButtonProps}
                >
                  {primaryLabel}
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  {...secondaryButtonProps}
                >
                  {secondaryLabel}
                </Button>
              ) : null}
            </Box>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </Box>
  );
};

const MarketingMoment = ({ theme, ...props }: MarketingMomentProps) =>
  theme ? (
    <ThemeProvider theme={theme}>
      <MarketingMomentContent {...props} />
    </ThemeProvider>
  ) : (
    <MarketingMomentContent {...props} />
  );

export default MarketingMoment;
