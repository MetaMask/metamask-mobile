import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  IconName,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MOCK_EARNED_DATA } from './Earned.constants';
import { EarnedTestIds } from './Earned.testIds';
import { useDigitTicker } from '../../hooks';

interface BreakdownRowProps {
  title: string;
  subtitle: string;
  value: string;
  testID: string;
}

const BreakdownRow = ({
  title,
  subtitle,
  value,
  testID,
}: BreakdownRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-x-4"
    testID={testID}
  >
    <Box twClassName="flex-1 gap-y-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {subtitle}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextDefault}
    >
      {value}
    </Text>
  </Box>
);

const Earned = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const paidForItselfValue = useDigitTicker(MOCK_EARNED_DATA.paidForItself);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddMoney = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={EarnedTestIds.CONTAINER}
    >
      <HeaderBase
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={EarnedTestIds.BACK_BUTTON}
          />
        }
      />

      <ScrollView
        contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="gap-y-2">
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            testID={EarnedTestIds.TOTAL_VALUE}
          >
            {MOCK_EARNED_DATA.total}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={EarnedTestIds.TOTAL_LABEL}
          >
            {strings('pro_hub.earned.total_label')}
          </Text>
        </Box>

        <SectionDivider marginVertical={6} />

        <Box twClassName="gap-y-6">
          <BreakdownRow
            title={strings('pro_hub.earned.interest_title')}
            subtitle={strings('pro_hub.earned.interest_subtitle')}
            value={MOCK_EARNED_DATA.interest.amount}
            testID={EarnedTestIds.INTEREST_ROW}
          />
          <BreakdownRow
            title={strings('pro_hub.earned.card_cashback_title')}
            subtitle={strings('pro_hub.earned.card_cashback_subtitle', {
              amount: MOCK_EARNED_DATA.cardCashbackSpend,
            })}
            value={MOCK_EARNED_DATA.cardCashback.amount}
            testID={EarnedTestIds.CARD_CASHBACK_ROW}
          />
        </Box>

        <SectionDivider marginVertical={6} />

        <Box twClassName="gap-y-2">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            testID={EarnedTestIds.PAID_FOR_ITSELF_TITLE}
          >
            {strings('pro_hub.earned.paid_for_itself_title')}
          </Text>
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.SuccessDefault}
            testID={EarnedTestIds.PAID_FOR_ITSELF_VALUE}
            twClassName="tabular-nums"
          >
            {paidForItselfValue}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={EarnedTestIds.PAID_FOR_ITSELF_DESCRIPTION}
          >
            {strings('pro_hub.earned.paid_for_itself_description', {
              multiplier: MOCK_EARNED_DATA.membershipFeeMultiplier,
              fee: MOCK_EARNED_DATA.membershipFee,
            })}
          </Text>
        </Box>

        <SectionDivider marginVertical={6} />

        <Box twClassName="gap-y-4">
          <Box twClassName="gap-y-2">
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              testID={EarnedTestIds.GROW_TITLE}
            >
              {strings('pro_hub.earned.grow_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={EarnedTestIds.GROW_DESCRIPTION}
            >
              {strings('pro_hub.earned.grow_description')}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleAddMoney}
            testID={EarnedTestIds.ADD_MONEY_BUTTON}
            twClassName="w-max"
          >
            {strings('pro_hub.earned.add_money')}
          </Button>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Earned;
