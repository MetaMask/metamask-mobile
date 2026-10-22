import React from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import {
  MARKETING_MOMENT_ACTION_ENTER_STEP,
  marketingMomentActionsEnteredAt,
  marketingMomentEntrance,
  marketingMomentSlotEntering,
} from './MarketingMoment.animations';
import type {
  MarketingMomentAction,
  MarketingMomentProps,
} from './MarketingMoment.types';
import { useMarketingMomentReduceMotion } from './useMarketingMomentReduceMotion';

export { marketingMomentActionsEnteredAt };

const omitEntering = <T extends object>(
  props: T | undefined,
): Omit<T, 'entering'> => {
  if (!props) {
    return {} as Omit<T, 'entering'>;
  }

  const { entering: _entering, ...rest } = props as T & {
    entering?: unknown;
  };
  return rest;
};

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
  const reduceMotion = useMarketingMomentReduceMotion();
  const motionTestId = (slot: string) =>
    testID ? `${testID}-${slot}` : undefined;
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
      <SafeAreaView style={tw.style('min-h-0 flex-1')}>
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={4}
          paddingHorizontal={6}
          twClassName="mt-12 shrink-0"
        >
          {title ? (
            <Animated.View
              entering={marketingMomentEntrance(FadeInDown, 0, reduceMotion)}
              style={tw.style('w-full')}
              testID={motionTestId('title-motion')}
            >
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
            <Animated.View
              entering={marketingMomentEntrance(FadeInDown, 1, reduceMotion)}
              testID={motionTestId('description-motion')}
            >
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
              {...omitEntering(childrenWrapperAnimatedViewProps)}
              entering={marketingMomentSlotEntering(
                reduceMotion,
                childrenWrapperAnimatedViewProps,
                marketingMomentEntrance(FadeInDown, 2, reduceMotion),
              )}
              testID={
                childrenWrapperAnimatedViewProps?.testID ??
                motionTestId('children-motion')
              }
            >
              {children}
            </Animated.View>
          ) : null}
        </Box>

        {artwork ? (
          <Animated.View
            {...omitEntering(artworkWrapperAnimatedViewProps)}
            entering={marketingMomentSlotEntering(
              reduceMotion,
              artworkWrapperAnimatedViewProps,
              marketingMomentEntrance(FadeIn, 2, reduceMotion),
            )}
            style={
              artworkWrapperAnimatedViewProps?.style ??
              tw.style('min-h-0 w-full flex-1')
            }
            testID={
              artworkWrapperAnimatedViewProps?.testID ??
              motionTestId('artwork-motion')
            }
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
          <Animated.View
            entering={marketingMomentEntrance(
              FadeInDown,
              MARKETING_MOMENT_ACTION_ENTER_STEP,
              reduceMotion,
            )}
            testID={motionTestId('actions-motion')}
          >
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
