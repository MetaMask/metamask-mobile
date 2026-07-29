import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyAssetOverviewBalanceCtaTestIds } from './MoneyAssetOverviewBalanceCta.testIds';

export interface MoneyAssetOverviewBalanceCtaProps {
  apy: number;
  onStartEarning: () => void;
  privacyMode: boolean;
  projectedEarnings: string;
  tokenSymbol: string;
}

export const MoneyAssetOverviewBalanceCta = ({
  apy,
  onStartEarning,
  privacyMode,
  projectedEarnings,
  tokenSymbol,
}: MoneyAssetOverviewBalanceCtaProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackTooltipClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ASSET_DETAIL,
  });

  const handleProjectedEarningsPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
      params: { showMoneyHomeCta: true },
    });
  }, [navigation, trackTooltipClicked]);

  return (
    <Box
      testID={MoneyAssetOverviewBalanceCtaTestIds.CONTAINER}
      twClassName="mt-3 gap-3"
    >
      <Box twClassName="flex-row flex-wrap items-center">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.asset_overview.balance_cta.description_prefix', {
            symbol: tokenSymbol,
          })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings(
            'money.asset_overview.balance_cta.earnings_tooltip_accessibility_label',
          )}
          onPress={handleProjectedEarningsPress}
          testID={MoneyAssetOverviewBalanceCtaTestIds.EARNINGS_TOOLTIP_BUTTON}
        >
          <SensitiveText
            color={TextColor.SuccessDefault}
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            testID={MoneyAssetOverviewBalanceCtaTestIds.EARNINGS_AMOUNT}
            twClassName="underline"
            variant={TextVariant.BodyMd}
          >
            {projectedEarnings}
          </SensitiveText>
        </Pressable>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.asset_overview.balance_cta.description_suffix')}
        </Text>
      </Box>
      <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
        {strings('money.asset_overview.balance_cta.earn_apy', { apy })}
      </Text>
      <Button
        isFullWidth
        onPress={onStartEarning}
        size={ButtonSize.Lg}
        testID={MoneyAssetOverviewBalanceCtaTestIds.START_EARNING_BUTTON}
        variant={ButtonVariant.Primary}
      >
        {strings('money.asset_overview.cta.start_earning')}
      </Button>
    </Box>
  );
};

export const MoneyAssetOverviewBalanceCtaSkeleton = () => (
  <Box
    testID="money-asset-overview-balance-cta-skeleton"
    twClassName="mt-3 gap-3"
  >
    <Skeleton height={20} width={260} />
    <Skeleton height={20} width={110} />
    <Skeleton height={48} width={327} />
  </Box>
);
