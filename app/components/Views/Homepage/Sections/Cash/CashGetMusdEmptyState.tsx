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
import { RAMPS_BUY_CUF_SURFACE } from '../../../../UI/Ramp/constants/rampsBuyCufTags';
import { RampIntent } from '../../../../UI/Ramp/types';
import { useMusdConversion } from '../../../../UI/Earn/hooks/useMusdConversion';
import { useMusdConversionFlowData } from '../../../../UI/Earn/hooks/useMusdConversionFlowData';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import I18n, { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import {
  makeSelectConversionRateByChainId,
  makeSelectUSDConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import { useCashNavigation } from './useCashNavigation';

interface CashGetMusdEmptyStateProps {
  isFullView?: boolean;
}

const selectMainnetConversionRate = makeSelectConversionRateByChainId(
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
);
const selectMainnetUsdConversionRate = makeSelectUSDConversionRateByChainId(
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
);

/**
 * Empty state for the Cash (mUSD) full view when the user has no mUSD.
 * Shows a "Get mUSD" card: token row (navigates to Mainnet mUSD Asset Details) + Get mUSD button.
 * Button routes to Buy flow (empty wallet + mUSD buyable) or Convert flow (non-empty + has convertible tokens).
 */
const CashGetMusdEmptyState = ({
  isFullView = false,
}: CashGetMusdEmptyStateProps) => {
  const tw = useTailwind();
  const { goToBuy } = useRampNavigation();
  const {
    hasConvertibleTokens,
    isMusdBuyableOnAnyChain,
    getPaymentTokenForSelectedNetwork,
  } = useMusdConversionFlowData();
  const { initiateCustomConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const networkName = useNetworkName(MUSD_CONVERSION_DEFAULT_CHAIN_ID);

  const currentCurrency = useSelector(selectCurrentCurrency);
  const mainnetConversionRate = useSelector(selectMainnetConversionRate);
  const mainnetUsdConversionRate = useSelector(selectMainnetUsdConversionRate);
  const { navigateToCash } = useCashNavigation();

  /** USD → selected fiat (same basis as aggregated mUSD balance / price row). */
  const oneUsdInUserFiat = useMemo(() => {
    if (
      mainnetConversionRate != null &&
      mainnetUsdConversionRate != null &&
      mainnetUsdConversionRate > 0
    ) {
      return mainnetConversionRate / mainnetUsdConversionRate;
    }
    return 1;
  }, [mainnetConversionRate, mainnetUsdConversionRate]);

  const musdPriceFormatted = useMemo(() => {
    const currency = currentCurrency ?? 'usd';
    const value = Number(Number(oneUsdInUserFiat).toFixed(2));
    return getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [currentCurrency, oneUsdInUserFiat]);

  const canGetMusd = hasConvertibleTokens || isMusdBuyableOnAnyChain;

  const handleGetMusdPress = useCallback(async () => {
    const { EVENT_LOCATIONS, MUSD_CTA_TYPES } = MUSD_EVENTS_CONSTANTS;
    const getRedirectLocation = () => {
      if (hasConvertibleTokens) {
        if (!hasSeenConversionEducationScreen) {
          return EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;
        }

        return EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;
      }
      return EVENT_LOCATIONS.BUY_SCREEN;
    };
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
        .addProperties({
          location: isFullView
            ? EVENT_LOCATIONS.MOBILE_TOKEN_LIST_PAGE
            : EVENT_LOCATIONS.HOME_CASH_SECTION,
          redirects_to: getRedirectLocation(),
          cta_type: MUSD_CTA_TYPES.PRIMARY,
          cta_click_target: 'cta_button',
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
      goToBuy(rampIntent, { surface: RAMPS_BUY_CUF_SURFACE.CASH });
    }
  }, [
    isMusdBuyableOnAnyChain,
    hasConvertibleTokens,
    hasSeenConversionEducationScreen,
    isFullView,
    getPaymentTokenForSelectedNetwork,
    goToBuy,
    initiateCustomConversion,
    trackEvent,
    createEventBuilder,
    networkName,
  ]);

  return (
    <Box testID={CashGetMusdEmptyStateSelectors.CONTAINER} twClassName="gap-3">
      <View style={tw.style('flex-row items-center justify-between py-1')}>
        <Pressable
          testID={CashGetMusdEmptyStateSelectors.ROW}
          onPress={navigateToCash}
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
            <Box twClassName="flex-row gap-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {musdPriceFormatted} {'\u2022'}
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
        {canGetMusd && (
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
        )}
      </View>
    </Box>
  );
};

CashGetMusdEmptyState.displayName = 'CashGetMusdEmptyState';

export default CashGetMusdEmptyState;
export { CashGetMusdEmptyStateSelectors };
