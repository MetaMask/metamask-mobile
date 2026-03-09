import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonSize,
  ButtonVariant,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import {
  MUSD_CONVERSION_APY,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../../UI/Earn/constants/musd';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { RampIntent } from '../../../../UI/Ramp/types';
import { useMusdConversion } from '../../../../UI/Earn/hooks/useMusdConversion';
import { useMusdConversionFlowData } from '../../../../UI/Earn/hooks/useMusdConversionFlowData';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../../../UI/Earn/types/musd.types';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../../core/NavigationService';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from './CashGetMusdEmptyState.constants';
import CashAnnualizedCopy from './CashAnnualizedCopy';

/**
 * Empty state for the Cash (mUSD) full view when the user has no mUSD.
 * Shows a "Get mUSD" card: token row (navigates to Mainnet mUSD Asset Details) + Get mUSD button.
 * Button routes to Buy flow (empty wallet + mUSD buyable) or Convert flow (non-empty + has convertible tokens).
 */
const CashGetMusdEmptyState = () => {
  const tw = useTailwind();
  const { goToBuy } = useRampNavigation();
  const {
    hasConvertibleTokens,
    isMusdBuyableOnAnyChain,
    getPaymentTokenForSelectedNetwork,
  } = useMusdConversionFlowData();
  const { initiateCustomConversion } = useMusdConversion();

  const handleTokenRowPress = useCallback(() => {
    NavigationService.navigation.navigate(
      'Asset' as never,
      {
        ...MUSD_MAINNET_ASSET_FOR_DETAILS,
        source: TokenDetailsSource.MobileTokenListPage,
      } as never,
    );
  }, []);

  const handleGetMusdPress = useCallback(async () => {
    // Prefer Convert when user has convertible tokens
    if (hasConvertibleTokens) {
      const paymentToken = getPaymentTokenForSelectedNetwork();
      if (!paymentToken) {
        Logger.error(
          new Error('[Cash Get mUSD] payment token missing'),
          '[Cash Get mUSD] Failed to initiate conversion - no payment token',
        );
        return;
      }
      try {
        await initiateCustomConversion({
          preferredPaymentToken: paymentToken,
          navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.QUICK_CONVERT,
        });
        return;
      } catch (error) {
        Logger.error(
          error as Error,
          '[Cash Get mUSD] Failed to initiate conversion',
        );
        return;
      }
    }

    // Otherwise open Buy flow when mUSD is buyable (works from Home tab and full view via root nav)
    if (isMusdBuyableOnAnyChain) {
      const chainId = MUSD_CONVERSION_DEFAULT_CHAIN_ID;
      const rampIntent: RampIntent = {
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId],
      };
      goToBuy(rampIntent);
    }
  }, [
    isMusdBuyableOnAnyChain,
    hasConvertibleTokens,
    getPaymentTokenForSelectedNetwork,
    goToBuy,
    initiateCustomConversion,
  ]);

  return (
    <Box testID={CashGetMusdEmptyStateSelectors.CONTAINER} twClassName="gap-3">
      <CashAnnualizedCopy twClassName="px-0" />

      <View style={tw.style('flex-row items-center justify-between py-2')}>
        <Pressable
          testID={CashGetMusdEmptyStateSelectors.ROW}
          onPress={handleTokenRowPress}
          style={({ pressed }) =>
            tw.style(
              'flex-row items-center gap-5 flex-1',
              pressed && 'opacity-80',
            )
          }
        >
          <AvatarToken
            name={MUSD_TOKEN.symbol}
            src={MUSD_TOKEN.imageSource as number}
            size={AvatarTokenSize.Lg}
          />
          <Box twClassName="flex-1 gap-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {MUSD_TOKEN.name}
            </Text>
            <Box twClassName="flex-row gap-2">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                $1.00
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('earn.percentage_bonus', {
                  percentage: MUSD_CONVERSION_APY,
                })}
              </Text>
            </Box>
          </Box>
        </Pressable>
        <Button
          testID={CashGetMusdEmptyStateSelectors.BUTTON}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleGetMusdPress}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('earn.musd_conversion.get_musd')}
          </Text>
        </Button>
      </View>
    </Box>
  );
};

CashGetMusdEmptyState.displayName = 'CashGetMusdEmptyState';

export default CashGetMusdEmptyState;
export { CashGetMusdEmptyStateSelectors };
