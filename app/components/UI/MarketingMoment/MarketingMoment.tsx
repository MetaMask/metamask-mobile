import React from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import MarketingMomentTitle from '../MarketingMomentTitle';
import type {
  MarketingMomentAction,
  MarketingMomentProps,
} from './MarketingMoment.types';

const ACTION_ENTER_STEP = 3;

const enterDown = (step: number) =>
  FadeInDown.duration(AnimationDuration.Slowly).delay(
    step * AnimationDuration.Quickly,
  );

const enterFade = (step: number) =>
  FadeIn.duration(AnimationDuration.Slowly).delay(
    step * AnimationDuration.Quickly,
  );

/** Milliseconds until the footer actions have finished entering. */
export const marketingMomentActionsEnteredAt =
  ACTION_ENTER_STEP * AnimationDuration.Quickly + AnimationDuration.Slowly;

const MarketingMomentContent = ({
  title,
  titleProps,
  description,
  descriptionProps,
  children,
  childrenWrapperAnimatedViewProps,
  artwork,
  artworkWrapperProps,
  artworkWrapperAnimatedViewProps,
  primaryAction,
  secondaryAction,
  background,
  testID,
}: Omit<MarketingMomentProps, 'theme'>) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  // Native safe area adds the window inset for every enabled edge. Drop an
  // edge the context already zeroed, so a screen that applied it is not padded twice.
  const edges = (['top', 'right', 'bottom', 'left'] as const).filter(
    (edge): edge is Edge => insets[edge] > 0,
  );
  const { label: primaryLabel, ...primaryButtonProps } =
    primaryAction ?? ({} as Partial<MarketingMomentAction>);
  const { label: secondaryLabel, ...secondaryButtonProps } =
    secondaryAction ?? ({} as Partial<MarketingMomentAction>);
  const artworkBoxProps = artworkWrapperProps ?? {};
  const { className: _artworkClassName, ...artworkBoxSpreadProps } =
    artworkBoxProps;
  const {
    twClassName: titleClassName,
    style: titleStyle,
    ...titleTextProps
  } = titleProps ?? {};

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
      <SafeAreaView
        edges={edges}
        style={tw.style('min-h-0 flex-1')}
        testID={testID ? `${testID}-body` : undefined}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={4}
          paddingHorizontal={6}
          twClassName="mt-12 shrink-0"
        >
          {title ? (
            <Animated.View entering={enterDown(0)} style={tw.style('w-full')}>
              {typeof title === 'string' ? (
                <MarketingMomentTitle
                  {...titleTextProps}
                  twClassName="w-full text-center"
                  style={[
                    titleClassName ? tw.style(titleClassName) : undefined,
                    titleStyle,
                  ]}
                >
                  {title}
                </MarketingMomentTitle>
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
            {...artworkWrapperAnimatedViewProps}
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              paddingHorizontal={6}
              {...artworkBoxSpreadProps}
              twClassName={`min-h-0 w-full flex-1 overflow-hidden${
                artworkBoxProps.className ? ` ${artworkBoxProps.className}` : ''
              }`}
            >
              {artwork}
            </Box>
          </Animated.View>
        ) : (
          <Box twClassName="flex-1" />
        )}

        {primaryAction || secondaryAction ? (
          <Animated.View entering={enterDown(ACTION_ENTER_STEP)}>
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
