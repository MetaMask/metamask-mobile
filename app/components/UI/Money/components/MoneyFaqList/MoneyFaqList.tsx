import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';

const FAQ_KEYS = [
  'faq_q1',
  'faq_q2',
  'faq_q3',
  'faq_q4',
  'faq_q5',
  'faq_q6',
  'faq_q7',
  'faq_q8',
  'faq_q9',
  'faq_q10',
] as const;

const ANIMATION_DURATION = 200;

const FaqDivider = () => <Box twClassName="h-px bg-border-muted" />;

const FaqItem = ({
  question,
  answer,
  link,
  testID,
}: {
  question: string;
  answer: string;
  link?: { label: string; testID: string; onPress: () => void };
  testID: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    setExpanded((prev) => {
      rotation.value = withTiming(prev ? 0 : 180, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      return !prev;
    });
  }, [rotation]);

  return (
    <Pressable onPress={handlePress} testID={testID}>
      <Box twClassName="py-5 px-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-2"
        >
          <Box twClassName="flex-1">
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {question}
            </Text>
          </Box>
          <Animated.View style={animatedArrowStyle}>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </Animated.View>
        </Box>
        {expanded && (
          <Box twClassName="mt-3">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {answer}
              {link && (
                <TextButton onPress={link.onPress} testID={link.testID}>
                  {link.label}
                </TextButton>
              )}
            </Text>
          </Box>
        )}
      </Box>
    </Pressable>
  );
};

interface MoneyFaqListProps {
  apyPercent?: number;
  tokenBullets: string;
  onCardFeesPress: () => void;
  itemTestId: (itemNumber: number) => string;
  linkTestId: string;
}

export const MoneyFaqList = ({
  apyPercent,
  tokenBullets,
  onCardFeesPress,
  itemTestId,
  linkTestId,
}: MoneyFaqListProps) => (
  <>
    {FAQ_KEYS.map((key, index) => {
      const itemNumber = index + 1;
      return (
        <React.Fragment key={key}>
          {index > 0 && <FaqDivider />}
          <FaqItem
            question={strings(`money.how_it_works_page.${key}`, {
              percentage: apyPercent,
            })}
            answer={strings(`money.how_it_works_page.faq_a${itemNumber}`, {
              percentage: apyPercent,
              tokenBullets,
            })}
            link={
              itemNumber === 4
                ? {
                    label: strings('money.how_it_works_page.faq_a4_link'),
                    testID: linkTestId,
                    onPress: onCardFeesPress,
                  }
                : undefined
            }
            testID={itemTestId(itemNumber)}
          />
        </React.Fragment>
      );
    })}
  </>
);
