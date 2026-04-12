import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as CLTextVariant,
  TextColor as CLTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import { useSelector } from 'react-redux';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
} from '../../../../UI/Earn/constants/musd';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import type { Hex } from '@metamask/utils';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { LINEA_MUSD_ASSET_FOR_MERKL } from './CashGetMusdEmptyState.constants';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';

const MusdAggregatedRow = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const privacyMode = useSelector(selectPrivacyMode);
  const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);
  const { tokenBalanceAggregated, fiatBalanceAggregatedFormatted } =
    useMusdBalance();
  const { claimableReward, hasPendingClaim, claimRewards, isClaiming } =
    useMerklBonusClaim(
      LINEA_MUSD_ASSET_FOR_MERKL,
      MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
    );
  const { trackEvent, createEventBuilder } = useAnalytics();
  const networkName = useNetworkName(LINEA_MUSD_ASSET_FOR_MERKL.chainId as Hex);

  const hasClaimableBonus = !!claimableReward && !hasPendingClaim;

  const handleClaimBonus = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          action_type: 'claim_bonus',
          button_text: strings('earn.claim_bonus'),
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
          network_chain_id: LINEA_MUSD_ASSET_FOR_MERKL.chainId,
          network_name: networkName ?? undefined,
          asset_symbol: LINEA_MUSD_ASSET_FOR_MERKL.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [trackEvent, createEventBuilder, networkName, claimRewards]);

  const handleTokenRowPress = useCallback(() => {
    if (isMoneyHomeEnabled) {
      navigation.navigate(Routes.MONEY.ROOT);
    } else {
      navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
    }
  }, [navigation, isMoneyHomeEnabled]);

  const tokenBalanceDisplay = `${getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(tokenBalanceAggregated))} ${MUSD_TOKEN.symbol}`;

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style('flex-row items-center py-1', pressed && 'opacity-80')
      }
      testID="cash-section-musd-row"
      onPress={handleTokenRowPress}
    >
      <AvatarToken
        name={MUSD_TOKEN.symbol}
        src={MUSD_TOKEN.imageSource as number}
        size={AvatarTokenSize.Lg}
      />
      <Box twClassName="flex-1 ml-5">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-2.5"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {MUSD_TOKEN.name}
          </Text>
          <SensitiveText
            variant={CLTextVariant.BodyMDMedium}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {fiatBalanceAggregatedFormatted}
          </SensitiveText>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-2.5"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            {isClaiming ? (
              <AnimatedSpinner size={SpinnerSize.SM} />
            ) : hasClaimableBonus ? (
              <Pressable
                onPress={handleClaimBonus}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.PrimaryDefault}
                >
                  {strings('earn.claim_bonus')}
                </Text>
              </Pressable>
            ) : (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('earn.musd_conversion.percentage_bonus', {
                  percentage: MUSD_CONVERSION_APY,
                })}
              </Text>
            )}
          </Box>
          <SensitiveText
            variant={CLTextVariant.BodySMMedium}
            color={CLTextColor.Alternative}
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            numberOfLines={1}
          >
            {tokenBalanceDisplay}
          </SensitiveText>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MusdAggregatedRow;
