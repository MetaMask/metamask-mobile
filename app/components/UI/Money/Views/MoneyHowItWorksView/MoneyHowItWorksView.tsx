import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Accordion from '../../../../../component-library/components/Accordions/Accordion';
import { MoneyHowItWorksViewTestIds } from './MoneyHowItWorksView.testIds';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  graphicPlaceholder: { height: 140 },
  headerSpacer: { width: 40 },
});

const Divider = () => <Box twClassName="h-px bg-border-muted my-5" />;

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
        styles.safeArea,
        { paddingTop: insets.top, backgroundColor: colors.background.default },
      ]}
      twClassName="flex-1 bg-default"
      testID={MoneyHowItWorksViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        paddingVertical={2}
        twClassName="px-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel="Back"
          testID={MoneyHowItWorksViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.how_it_works_page.header_title')}
        </Text>
        <Box style={styles.headerSpacer} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View
          style={[
            styles.graphicPlaceholder,
            { backgroundColor: colors.background.alternative },
          ]}
          accessibilityRole="image"
          accessibilityLabel="How it works graphic"
        />

        <Box paddingHorizontal={4} paddingTop={6} paddingBottom={2}>
          <Text
            variant={TextVariant.HeadingLg}
            testID={MoneyHowItWorksViewTestIds.SECTION_TITLE}
          >
            {strings('money.how_it_works_page.section_title')}
          </Text>
        </Box>

        <Box paddingHorizontal={4} paddingTop={3}>
          <Text
            variant={TextVariant.BodyMd}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_1}
          >
            {strings('money.how_it_works_page.description_1')}
          </Text>
        </Box>

        <Box paddingHorizontal={4} paddingTop={3} paddingBottom={4}>
          <Text
            variant={TextVariant.BodyMd}
            testID={MoneyHowItWorksViewTestIds.DESCRIPTION_2}
          >
            {strings('money.how_it_works_page.description_2')}
          </Text>
        </Box>

        <Divider />

        <Box paddingHorizontal={4} paddingBottom={3}>
          <Text
            variant={TextVariant.HeadingLg}
            testID={MoneyHowItWorksViewTestIds.FAQ_TITLE}
          >
            {strings('money.how_it_works_page.faq_title')}
          </Text>
        </Box>

        <Box paddingHorizontal={4}>
          {FAQ_KEYS.map((key, index) => (
            <React.Fragment key={key}>
              <Accordion
                title={strings(`money.how_it_works_page.${key}`)}
                testID={MoneyHowItWorksViewTestIds.FAQ_ITEM(index + 1)}
              >
                <Box paddingHorizontal={4} paddingBottom={3}>
                  <Text variant={TextVariant.BodyMd}>
                    {strings('money.how_it_works_page.faq_placeholder_answer')}
                  </Text>
                </Box>
              </Accordion>
              {index < FAQ_KEYS.length - 1 && (
                <Box twClassName="h-px bg-border-muted" />
              )}
            </React.Fragment>
          ))}
        </Box>
      </ScrollView>

      <Box paddingHorizontal={4} style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
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
