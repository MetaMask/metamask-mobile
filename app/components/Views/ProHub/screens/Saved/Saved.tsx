import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
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
import { MOCK_SAVED_DATA } from './Saved.constants';
import { SavedTestIds } from './Saved.testIds';
import { useDigitTicker } from '../../hooks';
import BreakdownRow from '../../components/BreakdownRow';

const Saved = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const paidForItselfValue = useDigitTicker(MOCK_SAVED_DATA.paidForItself);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSwap = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
    });
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={SavedTestIds.CONTAINER}
    >
      <HeaderBase
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={SavedTestIds.BACK_BUTTON}
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
            testID={SavedTestIds.TOTAL_VALUE}
          >
            {MOCK_SAVED_DATA.total}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={SavedTestIds.TOTAL_LABEL}
          >
            {strings('pro_hub.saved.total_label')}
          </Text>
        </Box>

        <SectionDivider marginVertical={6} />

        <Box twClassName="gap-y-6">
          <BreakdownRow
            title={strings('pro_hub.saved.trading_fees_title')}
            subtitle={strings('pro_hub.saved.trading_fees_subtitle')}
            value={MOCK_SAVED_DATA.tradingFees.amount}
            testID={SavedTestIds.TRADING_FEES_ROW}
          />
          <BreakdownRow
            title={strings('pro_hub.saved.card_atm_fees_title')}
            subtitle={strings('pro_hub.saved.card_atm_fees_subtitle')}
            value={MOCK_SAVED_DATA.cardAndAtmFees.amount}
            testID={SavedTestIds.CARD_ATM_FEES_ROW}
          />
          <BreakdownRow
            title={strings('pro_hub.saved.coverage_title')}
            subtitle={strings('pro_hub.saved.coverage_subtitle')}
            value={strings('pro_hub.saved.coverage_active')}
            valueColor={TextColor.SuccessDefault}
            testID={SavedTestIds.COVERAGE_ROW}
          />
        </Box>

        <SectionDivider marginVertical={6} />

        <Box twClassName="gap-y-2">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            testID={SavedTestIds.PAID_FOR_ITSELF_TITLE}
          >
            {strings('pro_hub.saved.paid_for_itself_title')}
          </Text>
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.SuccessDefault}
            testID={SavedTestIds.PAID_FOR_ITSELF_VALUE}
            twClassName="tabular-nums"
          >
            {paidForItselfValue}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={SavedTestIds.PAID_FOR_ITSELF_DESCRIPTION}
          >
            {strings('pro_hub.saved.paid_for_itself_description', {
              multiplier: MOCK_SAVED_DATA.membershipFeeMultiplier,
              fee: MOCK_SAVED_DATA.membershipFee,
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
              testID={SavedTestIds.SWAPS_PROMO_TITLE}
            >
              {strings('pro_hub.saved.swaps_promo_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={SavedTestIds.SWAPS_PROMO_DESCRIPTION}
            >
              {strings('pro_hub.saved.swaps_promo_description')}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSwap}
            testID={SavedTestIds.SWAP_BUTTON}
            twClassName="w-max"
          >
            {strings('pro_hub.saved.swap')}
          </Button>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Saved;
