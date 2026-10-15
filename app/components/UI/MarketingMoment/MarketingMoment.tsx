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

const ENTRANCE_DURATION_MS = 400;
const ENTRANCE_STAGGER_MS = 120;

const enterDown = (step: number) =>
  FadeInDown.duration(ENTRANCE_DURATION_MS).delay(step * ENTRANCE_STAGGER_MS);

const enterFade = (step: number) =>
  FadeIn.duration(ENTRANCE_DURATION_MS).delay(step * ENTRANCE_STAGGER_MS);

const renderAction = (
  action: MarketingMomentAction,
  variant: (typeof ButtonVariant)[keyof typeof ButtonVariant],
) => (
  <Button
    variant={variant}
    size={ButtonSize.Lg}
    isFullWidth
    onPress={action.onPress}
    isLoading={action.isLoading}
    isDisabled={action.isDisabled}
    testID={action.testID}
  >
    {action.label}
  </Button>
);

const MarketingMomentContent = ({
  title,
  description,
  supportingContent,
  artwork,
  primaryAction,
  secondaryAction,
  background,
  testID = MarketingMomentSelectorsIDs.CONTAINER,
  titleTestID = MarketingMomentSelectorsIDs.TITLE,
  descriptionTestIDs,
}: Omit<MarketingMomentProps, 'theme'>) => {
  const tw = useTailwind();
  const paragraphs = Array.isArray(description) ? description : [description];

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
          <Animated.View entering={enterDown(0)}>
            <Text
              variant={TextVariant.DisplayLg}
              fontWeight={FontWeight.Bold}
              accessibilityRole="header"
              twClassName="text-center"
              testID={titleTestID}
            >
              {title}
            </Text>
          </Animated.View>
          <Animated.View entering={enterDown(1)}>
            <Box flexDirection={BoxFlexDirection.Column} gap={4}>
              {paragraphs.map((paragraph, index) => (
                <Text
                  key={`${paragraph}-${index}`}
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                  testID={
                    descriptionTestIDs?.[index] ??
                    (paragraphs.length === 1
                      ? MarketingMomentSelectorsIDs.DESCRIPTION
                      : `${MarketingMomentSelectorsIDs.DESCRIPTION}-${index}`)
                  }
                >
                  {paragraph}
                </Text>
              ))}
            </Box>
          </Animated.View>
          {supportingContent ? (
            <Animated.View entering={enterDown(2)}>
              {supportingContent}
            </Animated.View>
          ) : null}
        </Box>

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

        <Animated.View entering={enterDown(3)}>
          <Box
            flexDirection={BoxFlexDirection.Column}
            gap={2}
            paddingHorizontal={4}
            paddingBottom={8}
            twClassName="shrink-0"
          >
            {renderAction(primaryAction, ButtonVariant.Primary)}
            {renderAction(secondaryAction, ButtonVariant.Tertiary)}
          </Box>
        </Animated.View>
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
