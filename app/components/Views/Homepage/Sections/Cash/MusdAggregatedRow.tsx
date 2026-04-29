import React, { useCallback } from 'react';
import { Pressable, TouchableOpacity } from 'react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
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
  IconColor,
} from '@metamask/design-system-react-native';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as CLTextVariant,
  TextColor as CLTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
} from '../../../../UI/Earn/constants/musd';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useCashNavigation } from './useCashNavigation';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { useTrackClaimBonusClicked } from '../../../../UI/Earn/components/MerklRewards/hooks/useTrackClaimBonusClicked';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { LINEA_MUSD_ASSET_FOR_MERKL } from './CashGetMusdEmptyState.constants';

const MusdAggregatedRow = () => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const { tokenBalanceAggregated, fiatBalanceAggregatedFormatted } =
    useMusdBalance();
  const { claimableReward, hasPendingClaim, isClaiming, claimRewards } =
    useMerklBonusClaim(
      LINEA_MUSD_ASSET_FOR_MERKL,
      MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
    );
  const hasClaimableBonus = !!claimableReward && !hasPendingClaim;
  const trackClaimBonusClicked = useTrackClaimBonusClicked();
  const navigation = useNavigation();
  const isMoneyHomeScreenEnabled = useSelector(
    selectMoneyHomeScreenEnabledFlag,
  );

  const handleClaimBonus = useCallback(() => {
    trackClaimBonusClicked(
      MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
    );
    // Money modal stack only mounts when the Money Home flag is on; fall
    // back to dispatching the claim directly otherwise.
    if (isMoneyHomeScreenEnabled) {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.CLAIM_BONUS_SHEET,
        params: {
          claimableReward,
          // Run via parent's hook so the post-claim session lock survives sheet unmount.
          onConfirm: () => {
            claimRewards().catch(() => undefined);
          },
        },
      });
      return;
    }
    claimRewards();
  }, [
    trackClaimBonusClicked,
    navigation,
    isMoneyHomeScreenEnabled,
    claimRewards,
    claimableReward,
  ]);

  const { navigateToCash: handleTokenRowPress } = useCashNavigation();

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
            {isClaiming ? (
              <Spinner color={IconColor.PrimaryDefault} />
            ) : (
              <TouchableOpacity
                disabled={!hasClaimableBonus}
                onPress={handleClaimBonus}
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
              </TouchableOpacity>
            )}
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MusdAggregatedRow;
