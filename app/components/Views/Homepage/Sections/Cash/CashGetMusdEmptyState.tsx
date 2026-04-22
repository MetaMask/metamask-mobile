import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
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
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
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
import { formatWithThreshold } from '../../../../../util/assets';
import { getLocaleLanguageCode } from '../../../../hooks/useFormatters';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import {
  LINEA_MUSD_ASSET_FOR_MERKL,
  MUSD_MAINNET_ASSET_FOR_DETAILS,
} from './CashGetMusdEmptyState.constants';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';

interface CashGetMusdEmptyStateProps {
  isFullView?: boolean;
}

/**
 * Empty state for the Cash (mUSD) full view when the user has no mUSD.
 * Shows a "Get mUSD" card: token row (navigates to Mainnet mUSD Asset Details) + Get mUSD button.
 * Button routes to Buy flow (empty wallet + mUSD buyable) or Convert flow (non-empty + has convertible tokens).
 * When the user has a claimable Merkl bonus but no mUSD balance, shows a secondary "Claim bonus" button.
 */
const CashGetMusdEmptyState = ({
  isFullView = false,
}: CashGetMusdEmptyStateProps) => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const lastMerklClaimErrorToastRef = useRef<string | null>(null);
  const claimBonusAnalyticsLocation = isFullView
    ? MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.MOBILE_TOKEN_LIST_PAGE
    : MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION;
  const {
    claimableReward,
    hasPendingClaim,
    claimRewards,
    isClaiming,
    error: merklClaimError,
  } = useMerklBonusClaim(
    LINEA_MUSD_ASSET_FOR_MERKL,
    claimBonusAnalyticsLocation,
  );
  const hasClaimableBonus = !!claimableReward && !hasPendingClaim;
  const lineaNetworkName = useNetworkName(
    LINEA_MUSD_ASSET_FOR_MERKL.chainId as Hex,
  );

  useEffect(() => {
    if (!merklClaimError) {
      lastMerklClaimErrorToastRef.current = null;
      return;
    }
    if (merklClaimError === lastMerklClaimErrorToastRef.current) {
      return;
    }
    lastMerklClaimErrorToastRef.current = merklClaimError;
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [{ label: merklClaimError, isBold: false }],
      hasNoTimeout: false,
    });
  }, [merklClaimError, toastRef]);
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

  const claimBonusButtonLabel = useMemo(() => {
    if (!claimableReward) {
      return strings('earn.claim_bonus');
    }
    if (claimableReward.trimStart().startsWith('<')) {
      return strings('earn.claim_bonus');
    }
    const usdAmount = parseFloat(claimableReward);
    if (!Number.isFinite(usdAmount)) {
      return strings('earn.claim_bonus');
    }
    const currency = (currentCurrency ?? 'usd').toUpperCase();
    const amountInUserFiat = usdAmount * oneUsdInUserFiat;
    const formattedAmount = formatWithThreshold(
      amountInUserFiat,
      0.01,
      getLocaleLanguageCode(),
      {
        style: 'currency',
        currency,
      },
    );
    return strings('earn.claim_bonus_with_fiat', { amount: formattedAmount });
  }, [claimableReward, currentCurrency, oneUsdInUserFiat]);

  const canGetMusd = hasConvertibleTokens || isMusdBuyableOnAnyChain;

  const handleClaimBonusPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          action_type: 'claim_bonus',
          button_text: claimBonusButtonLabel,
          location: claimBonusAnalyticsLocation,
          network_chain_id: LINEA_MUSD_ASSET_FOR_MERKL.chainId,
          network_name: lineaNetworkName ?? undefined,
          asset_symbol: LINEA_MUSD_ASSET_FOR_MERKL.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [
    trackEvent,
    createEventBuilder,
    claimBonusButtonLabel,
    claimBonusAnalyticsLocation,
    lineaNetworkName,
    claimRewards,
  ]);

  const handleTokenRowPress = useCallback(() => {
    NavigationService.navigation.navigate('Asset', {
      ...MUSD_MAINNET_ASSET_FOR_DETAILS,
      source: TokenDetailsSource.MobileTokenListPage,
    });
  }, []);

  const handleGetMusdPress = useCallback(async () => {
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
          navigationOverride: isQuickConvertEnabled
            ? MUSD_CONVERSION_NAVIGATION_OVERRIDE.QUICK_CONVERT
            : undefined,
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
    hasSeenConversionEducationScreen,
    isFullView,
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
      <View style={tw.style('flex-row items-center justify-between py-1')}>
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
      {hasClaimableBonus ? (
        <Button
          testID={CashGetMusdEmptyStateSelectors.CLAIM_BONUS_BUTTON}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="w-full"
          onPress={handleClaimBonusPress}
          isDisabled={isClaiming || hasPendingClaim}
          isLoading={isClaiming}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {claimBonusButtonLabel}
          </Text>
        </Button>
      ) : null}
    </Box>
  );
};

CashGetMusdEmptyState.displayName = 'CashGetMusdEmptyState';

export default CashGetMusdEmptyState;
export { CashGetMusdEmptyStateSelectors };
