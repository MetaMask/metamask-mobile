import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
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
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { TokenI } from '../../../../UI/Tokens/types';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

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

  const hasClaimableBonus = Boolean(claimableReward) && !hasPendingClaim;

  const handleClaimBonus = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          action_type: 'claim_bonus',
          button_text: strings('earn.claim_bonus'),
          location: 'home_cash_section',
          network_chain_id: LINEA_MUSD_ASSET.chainId,
          asset_symbol: LINEA_MUSD_ASSET.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [trackEvent, createEventBuilder, claimRewards]);

  const tokenBalanceDisplay = `${Number(tokenBalanceAggregated).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    },
  )} ${MUSD_TOKEN.symbol}`;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={tw.style('flex-row items-center py-3')}
      testID="cash-section-musd-row"
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
              variant={CLTextVariant.BodyMDMedium}
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
            <SensitiveText
              variant={CLTextVariant.BodySMMedium}
              color={CLTextColor.Alternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              numberOfLines={1}
            >
              {tokenBalanceDisplay}
            </SensitiveText>
            {isClaiming ? (
              <Spinner />
            ) : hasClaimableBonus ? (
              <TouchableOpacity
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
              </TouchableOpacity>
            ) : null}
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default MusdAggregatedRow;
