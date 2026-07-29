import React, { useCallback } from 'react';
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
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyAssetOverviewBalanceCtaTestIds } from './MoneyAssetOverviewBalanceCta.testIds';

export interface MoneyAssetOverviewBalanceDescriptionProps {
  privacyMode: boolean;
  projectedEarnings: string;
  tokenSymbol: string;
}

export const MoneyAssetOverviewBalanceDescription = ({
  privacyMode,
  projectedEarnings,
  tokenSymbol,
}: MoneyAssetOverviewBalanceDescriptionProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackTooltipClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ASSET_DETAIL,
    component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_BALANCE_CTA,
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
      twClassName="mb-3 mt-2"
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('money.asset_overview.balance_cta.description_prefix', {
          symbol: tokenSymbol,
        })}
        <Text
          accessibilityRole="button"
          accessibilityLabel={strings(
            'money.asset_overview.balance_cta.earnings_tooltip_accessibility_label',
          )}
          onPress={handleProjectedEarningsPress}
          testID={MoneyAssetOverviewBalanceCtaTestIds.EARNINGS_TOOLTIP_BUTTON}
          variant={TextVariant.BodyMd}
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
        </Text>
        {strings('money.asset_overview.balance_cta.description_suffix')}
      </Text>
    </Box>
  );
};

export interface MoneyAssetOverviewBalanceCtaProps {
  onStartEarning: () => void;
}

export const MoneyAssetOverviewBalanceCta = ({
  onStartEarning,
}: MoneyAssetOverviewBalanceCtaProps) => (
  <Box twClassName="mt-3">
    <Button
      isFullWidth
      onPress={onStartEarning}
      size={ButtonSize.Lg}
      testID={MoneyAssetOverviewBalanceCtaTestIds.START_EARNING_BUTTON}
      variant={ButtonVariant.Secondary}
    >
      {strings('money.asset_overview.cta.start_earning')}
    </Button>
  </Box>
);

export const MoneyAssetOverviewBalanceDescriptionSkeleton = () => (
  <Box twClassName="mb-3 mt-2">
    <Skeleton height={30} width="100%" twClassName="rounded-lg" />
  </Box>
);

export const MoneyAssetOverviewBalanceCtaSkeleton = () => (
  <Box testID="money-asset-overview-balance-cta-skeleton" twClassName="mt-3">
    <Skeleton height={48} width="100%" twClassName="rounded-lg" />
  </Box>
);
