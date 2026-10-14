import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MarketingMomentSelectorsIDs } from './MarketingMoment.testIds';
import type {
  MarketingMomentAction,
  MarketingMomentProps,
} from './MarketingMoment.types';

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
    twClassName={action.twClassName}
    style={action.style}
    textProps={{
      twClassName: action.textClassName,
      style: action.textStyle,
    }}
  >
    {action.label}
  </Button>
);

const Frame = ({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) => {
  if (!style) {
    return <>{children}</>;
  }

  return <Animated.View style={style}>{children}</Animated.View>;
};

const MarketingMoment = ({
  title,
  description,
  artwork,
  primaryAction,
  secondaryAction,
  header,
  supportingContent,
  backdrop,
  footerContent,
  renderTitle,
  testID = MarketingMomentSelectorsIDs.CONTAINER,
  titleTestID = MarketingMomentSelectorsIDs.TITLE,
  descriptionTestIDs,
  edges = ['top', 'bottom'],
  twClassName = 'bg-default',
  descriptionClassName,
  descriptionStyle,
  descriptionFontWeight,
  titleStyle,
  titleFrameStyle,
  descriptionFrameStyle,
  actionsFrameStyle,
}: MarketingMomentProps) => {
  const tw = useTailwind();
  const paragraphs = Array.isArray(description) ? description : [description];

  const titleNode = renderTitle ? (
    renderTitle(title)
  ) : (
    <Text
      variant={TextVariant.DisplayMd}
      fontWeight={FontWeight.Bold}
      accessibilityRole="header"
      style={titleStyle}
      twClassName="text-center"
      testID={titleTestID}
    >
      {title}
    </Text>
  );

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Column}
      twClassName={`relative min-h-0 w-full flex-1 ${twClassName}`}
    >
      {backdrop ? (
        <Box pointerEvents="none" twClassName="absolute inset-0">
          {backdrop}
        </Box>
      ) : null}
      <SafeAreaView style={tw.style('min-h-0 flex-1')} edges={edges}>
        {header}
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="min-h-0 w-full flex-1"
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            gap={4}
            paddingHorizontal={6}
            twClassName={header ? 'shrink-0' : 'mt-12 shrink-0'}
          >
            <Frame style={titleFrameStyle}>{titleNode}</Frame>
            <Frame style={descriptionFrameStyle}>
              <Box flexDirection={BoxFlexDirection.Column} gap={4}>
                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${paragraph}-${index}`}
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    fontWeight={descriptionFontWeight}
                    style={descriptionStyle}
                    twClassName={
                      descriptionClassName
                        ? `text-center ${descriptionClassName}`
                        : 'text-center'
                    }
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
            </Frame>
            {supportingContent}
          </Box>

          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            paddingHorizontal={6}
            twClassName="min-h-0 w-full flex-1 overflow-hidden"
            testID={MarketingMomentSelectorsIDs.ARTWORK}
          >
            {artwork}
          </Box>

          <Frame style={actionsFrameStyle}>
            <Box
              flexDirection={BoxFlexDirection.Column}
              gap={2}
              paddingHorizontal={4}
              paddingBottom={8}
              twClassName="shrink-0"
            >
              {footerContent}
              {renderAction(primaryAction, ButtonVariant.Primary)}
              {secondaryAction
                ? renderAction(secondaryAction, ButtonVariant.Tertiary)
                : null}
            </Box>
          </Frame>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default MarketingMoment;
