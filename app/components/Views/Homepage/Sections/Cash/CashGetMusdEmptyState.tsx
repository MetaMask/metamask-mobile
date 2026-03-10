import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
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
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import { selectMusdQuickConvertEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import I18n, { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../../core/NavigationService';
import { RootState } from '../../../../../reducers';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from './CashGetMusdEmptyState.constants';
import { useHomepageScrollContext } from '../../context/HomepageScrollContext';
import CashAnnualizedCopy from './CashAnnualizedCopy';

/**
 * Empty state for the Cash (mUSD) full view when the user has no mUSD.
 * Shows a "Get mUSD" card: token row (navigates to Mainnet mUSD Asset Details) + Get mUSD button.
 * Button routes to Buy flow (empty wallet + mUSD buyable) or Convert flow (non-empty + has convertible tokens).
 */
const CashGetMusdEmptyState = () => {
  const tw = useTailwind();
  const { skipNextSessionSummary } = useHomepageScrollContext();
  const { goToBuy } = useRampNavigation();
  const {
    hasConvertibleTokens,
    isMusdBuyableOnAnyChain,
    getPaymentTokenForSelectedNetwork,
  } = useMusdConversionFlowData();
  const { initiateCustomConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const networkName = useNetworkName(MUSD_CONVERSION_DEFAULT_CHAIN_ID);

  const currentCurrency = useSelector(selectCurrentCurrency);
  const mainnetConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, MUSD_CONVERSION_DEFAULT_CHAIN_ID),
  );
  const mainnetUsdConversionRate = useSelector((state: RootState) =>
    selectUSDConversionRateByChainId(state, MUSD_CONVERSION_DEFAULT_CHAIN_ID),
  );

  const musdPriceFormatted = useMemo(() => {
    const currency = currentCurrency ?? 'usd';
    const oneUsdInUserCurrency =
      mainnetConversionRate != null &&
      mainnetUsdConversionRate != null &&
      mainnetUsdConversionRate > 0
        ? mainnetConversionRate / mainnetUsdConversionRate
        : 1;
    const value = Number(Number(oneUsdInUserCurrency).toFixed(2));
    const result = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return result.replace('US$', '$');
  }, [currentCurrency, mainnetConversionRate, mainnetUsdConversionRate]);

  const handleTokenRowPress = useCallback(() => {
    skipNextSessionSummary();
    NavigationService.navigation.navigate(
      'Asset' as never,
      {
        ...MUSD_MAINNET_ASSET_FOR_DETAILS,
        source: TokenDetailsSource.MobileTokenListPage,
      } as never,
    );
  }, [skipNextSessionSummary]);

  const handleGetMusdPress = useCallback(async () => {
    skipNextSessionSummary();
    const { EVENT_LOCATIONS, MUSD_CTA_TYPES } = MUSD_EVENTS_CONSTANTS;
    const getRedirectLocation = () => {
      if (hasConvertibleTokens) {
        if (!hasSeenConversionEducationScreen) {
          return EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;
        }
        return isQuickConvertEnabled
          ? EVENT_LOCATIONS.QUICK_CONVERT_HOME_SCREEN
          : EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;
      }
      return EVENT_LOCATIONS.BUY_SCREEN;
    };
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_CASH_SECTION,
          redirects_to: getRedirectLocation(),
          cta_type: MUSD_CTA_TYPES.PRIMARY,
          cta_text: strings('earn.musd_conversion.get_musd'),
          network_chain_id: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
          network_name: networkName ?? undefined,
        })
        .build(),
    );

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
    skipNextSessionSummary,
    isMusdBuyableOnAnyChain,
    hasConvertibleTokens,
    hasSeenConversionEducationScreen,
    isQuickConvertEnabled,
    getPaymentTokenForSelectedNetwork,
    goToBuy,
    initiateCustomConversion,
    trackEvent,
    createEventBuilder,
    networkName,
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
                {musdPriceFormatted}
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
