import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIconSize,
  ButtonIcon,
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MoneyHowItWorksViewTestIds } from './MoneyHowItWorksView.testIds';

const localStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  graphicPlaceholder: { height: 140 },
  headerSpacer: { width: 40 },
});

const Divider = () => <Box twClassName="h-px bg-border-muted" />;

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

const FaqItem = ({
  question,
  answer,
  testID,
}: {
  question: string;
  answer: string;
  testID: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    setExpanded((prev) => !prev);
    rotation.value = withTiming(expanded ? 0 : 180, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [expanded, rotation]);

  return (
    <Pressable onPress={handlePress} testID={testID}>
      <Box twClassName="py-3 px-4">
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
            </Text>
          </Box>
        )}
      </Box>
    </Pressable>
  );
};

const MoneyHowItWorksView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSoundsGoodPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Box
      style={[
        localStyles.safeArea,
        { paddingTop: insets.top, backgroundColor: colors.background.default },
      ]}
      twClassName="flex-1 bg-default"
      testID={MoneyHowItWorksViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel="Back"
          testID={MoneyHowItWorksViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.how_it_works_page.header_title')}
        </Text>
        <Box style={localStyles.headerSpacer} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View
          style={[
            localStyles.graphicPlaceholder,
            { backgroundColor: colors.background.alternative },
          ]}
          accessibilityRole="image"
          accessibilityLabel="How it works graphic"
        />

        <Box twClassName="px-4 pt-6 pb-3 gap-3">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID={MoneyHowItWorksViewTestIds.SECTION_TITLE}
          >
            {strings('money.how_it_works_page.section_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_1}
          >
            {strings('money.how_it_works_page.description_1')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_2}
          >
            {strings('money.how_it_works_page.description_2')}
          </Text>
        </Box>

        <Box twClassName="my-5">
          <Divider />
        </Box>

        <Box twClassName="pb-3 px-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID={MoneyHowItWorksViewTestIds.FAQ_TITLE}
          >
            {strings('money.how_it_works_page.faq_title')}
          </Text>
        </Box>

        {FAQ_KEYS.map((key, index) => (
          <React.Fragment key={key}>
            <Divider />
            <FaqItem
              question={strings(`money.how_it_works_page.${key}`)}
              answer={strings('money.how_it_works_page.faq_placeholder_answer')}
              testID={MoneyHowItWorksViewTestIds.FAQ_ITEM(index + 1)}
            />
          </React.Fragment>
        ))}
        <Divider />
      </ScrollView>

      <Box twClassName="px-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleSoundsGoodPress}
          testID={MoneyHowItWorksViewTestIds.SOUNDS_GOOD_BUTTON}
        >
          {strings('money.how_it_works_page.sounds_good')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyHowItWorksView;
