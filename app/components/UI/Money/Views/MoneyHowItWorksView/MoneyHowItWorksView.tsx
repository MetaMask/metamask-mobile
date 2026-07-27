import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIconSize,
  ButtonIcon,
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectMoneyNoFeeDepositTokens } from '../../selectors/featureFlags';
import { formatNoFeeTokenBullets } from '../../utils/depositFaqTokens';
import AppConstants from '../../../../../core/AppConstants';
import { MoneyHowItWorksViewTestIds } from './MoneyHowItWorksView.testIds';
import { openInAppBrowser } from '../../utils/openInAppBrowser';
import useMountEffect from '../../hooks/useMountEffect';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';

const localStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerSpacer: { width: 40 },
});

const SectionDivider = () => <Box twClassName="h-px bg-border-muted my-5" />;
const FaqDivider = () => <Box twClassName="h-px bg-border-muted" />;

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

const MoneyHowItWorksView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { apyPercent } = useMoneyAccountBalance();

  const noFeeTokens = useSelector(selectMoneyNoFeeDepositTokens);
  const tokenBullets = formatNoFeeTokenBullets(noFeeTokens);

  const { trackScreenViewed, trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOW_IT_WORKS,
  });

  useMountEffect(trackScreenViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCardFeesPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.CARD_FEES,
      component_name: COMPONENT_NAMES.FAQ_ITEM,
      label_key: 'money.how_it_works_page.faq_a4_link',
      redirect_target: MONEY_URLS.CARD_FEES,
    });
    openInAppBrowser(navigation, AppConstants.CARD.CARD_FEES_URL);
  }, [navigation, trackButtonClicked]);

  return (
    <Box
      style={[
        localStyles.safeArea,
        {
          paddingTop: insets.top,
          backgroundColor: themeColors.background.default,
        },
      ]}
      twClassName="flex-1"
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
          onPress={handleGoBack}
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        testID={MoneyHowItWorksViewTestIds.SCROLL_VIEW}
      >
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
            {strings('money.how_it_works_page.description_1', {
              percentage: apyPercent ?? '-',
            })}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_2}
          >
            {strings('money.how_it_works_page.description_2')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_3}
          >
            {strings('money.how_it_works_page.description_3')}
          </Text>
        </Box>

        <SectionDivider />

        <Box twClassName="py-5 px-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID={MoneyHowItWorksViewTestIds.FAQ_TITLE}
          >
            {strings('money.how_it_works_page.faq_title')}
          </Text>
        </Box>

        {FAQ_KEYS.map((key, index) => {
          const number = index + 1;
          return (
            <React.Fragment key={key}>
              {index > 0 && <FaqDivider />}
              <FaqItem
                question={strings(`money.how_it_works_page.${key}`, {
                  percentage: apyPercent,
                })}
                answer={strings(`money.how_it_works_page.faq_a${number}`, {
                  percentage: apyPercent,
                  tokenBullets,
                })}
                link={
                  number === 4
                    ? {
                        label: strings('money.how_it_works_page.faq_a4_link'),
                        testID: MoneyHowItWorksViewTestIds.FAQ_LINK,
                        onPress: handleCardFeesPress,
                      }
                    : undefined
                }
                testID={MoneyHowItWorksViewTestIds.FAQ_ITEM(number)}
              />
            </React.Fragment>
          );
        })}

        <SectionDivider />

        <Box twClassName="py-5 px-4 gap-3">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID={MoneyHowItWorksViewTestIds.DISCLOSURES_TITLE}
          >
            {strings('money.how_it_works_page.disclosures_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyHowItWorksViewTestIds.DISCLOSURES_BODY}
          >
            {strings('money.how_it_works_page.disclosures_body')}
          </Text>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default MoneyHowItWorksView;
