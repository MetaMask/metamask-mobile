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
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import type { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { TokenI } from '../../../../UI/Tokens/types';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from './CashGetMusdEmptyState.constants';
import NavigationService from '../../../../../core/NavigationService';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';

/**
 * Minimal mUSD asset for useMerklBonusClaim (claim runs on Linea).
 * Only chainId and address are required for the claim flow.
 */
const LINEA_MUSD_ASSET: TokenI = {
  chainId: CHAIN_IDS.LINEA_MAINNET as string,
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  image: '',
  balance: '0',
  isETH: false,
  logo: undefined,
};

const MusdAggregatedRow = () => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const { tokenBalanceAggregated, fiatBalanceAggregatedFormatted } =
    useMusdBalance();
  const { claimableReward, hasPendingClaim, claimRewards, isClaiming } =
    useMerklBonusClaim(LINEA_MUSD_ASSET);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const networkName = useNetworkName(LINEA_MUSD_ASSET.chainId as Hex);

  const hasClaimableBonus = Boolean(claimableReward) && !hasPendingClaim;

  const handleClaimBonus = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          action_type: 'claim_bonus',
          button_text: strings('earn.claim_bonus'),
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
          network_chain_id: LINEA_MUSD_ASSET.chainId,
          network_name: networkName ?? undefined,
          asset_symbol: LINEA_MUSD_ASSET.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [trackEvent, createEventBuilder, networkName, claimRewards]);

  const handleTokenRowPress = useCallback(() => {
    NavigationService.navigation.navigate('Asset', {
      ...MUSD_MAINNET_ASSET_FOR_DETAILS,
      source: TokenDetailsSource.MobileTokenListPage,
    });
  }, []);

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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 gap-5"
      >
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={MUSD_TOKEN.imageSource as number}
          size={AvatarTokenSize.Lg}
        />
        <Box twClassName="flex-1 gap-0.5">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {MUSD_TOKEN.name}
            </Text>
            <SensitiveText
              variant={CLTextVariant.BodyMDBold}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
            >
              {fiatBalanceAggregatedFormatted}
            </SensitiveText>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
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
      </Box>
    </Pressable>
  );
};

export default MusdAggregatedRow;
