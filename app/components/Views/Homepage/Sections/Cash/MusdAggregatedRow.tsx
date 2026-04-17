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
import { useSelector } from 'react-redux';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
} from '../../../../UI/Earn/constants/musd';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from './CashGetMusdEmptyState.constants';

const MusdAggregatedRow = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const privacyMode = useSelector(selectPrivacyMode);
  const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);
  const { tokenBalanceAggregated, fiatBalanceAggregatedFormatted } =
    useMusdBalance();
  const { claimableReward, hasPendingClaim } = useMerklBonusClaim(
    MUSD_MAINNET_ASSET_FOR_DETAILS,
    MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
  );
  const hasClaimableBonus = !!claimableReward && !hasPendingClaim;

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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1"
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
            <SensitiveText
              variant={CLTextVariant.BodySMMedium}
              color={CLTextColor.Alternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              numberOfLines={1}
            >
              {tokenBalanceDisplay}
            </SensitiveText>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  hasClaimableBonus
                    ? TextColor.PrimaryDefault
                    : TextColor.SuccessDefault
                }
              >
                {hasClaimableBonus
                  ? strings('earn.musd_conversion.claim_percentage_bonus', {
                      percentage: MUSD_CONVERSION_APY,
                    })
                  : strings('earn.musd_conversion.percentage_bonus', {
                      percentage: MUSD_CONVERSION_APY,
                    })}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MusdAggregatedRow;
