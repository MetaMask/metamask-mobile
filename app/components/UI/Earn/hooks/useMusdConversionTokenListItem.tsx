import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { useMusdConversion } from './useMusdConversion';
import useEarnTokens from './useEarnTokens';
import { useStablecoinLendingRedirect } from './useStablecoinLendingRedirect';
import { selectStablecoinLendingEnabledFlag } from '../selectors/featureFlags';
import { MUSD_EVENTS_CONSTANTS } from '../constants/events';
import { MUSD_CONVERSION_APY } from '../constants/musd';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EVENT_LOCATIONS } from '../constants/events/earnEvents';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import Routes from '../../../../constants/navigation/Routes';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { StakeButton } from '../../Stake/components/StakeButton';
import { selectIsStakeableToken } from '../../Stake/selectors/stakeableTokens';
import type { TokenI } from '../../Tokens/types';
import type { RootState } from '../../../../reducers';
import { useNetworkName } from '../../../Views/confirmations/hooks/useNetworkName';

export interface ConversionSecondaryBalance {
  text: string;
  color: TextColor;
  onPress: (() => void) | (() => Promise<void>) | undefined;
}

interface UseMusdConversionTokenListItemParams {
  asset: TokenI | undefined;
  chainId: Hex | undefined;
  shouldShowTokenListItemCta: (asset?: TokenI) => boolean;
}

/**
 * Encapsulates the mUSD conversion CTA state for a token list item.
 *
 * Covers two conversion entry points:
 * - Primary: the user holds a convertible stablecoin and can swap it to mUSD (tappable blue CTA text in the secondary balance row).
 * - Secondary: the token is eligible for stablecoin lending (Earn redirect).
 *
 * Also owns `renderEarnCta`, which renders the stake button next to the token
 * name — suppressed when the conversion CTA is already visible to avoid
 * competing calls-to-action.
 *
 * Returns null for `conversionSecondaryBalance` when neither conversion path
 * applies, signalling to the consumer to fall back to price/% change display.
 */
export const useMusdConversionTokenListItem = ({
  asset,
  chainId,
  shouldShowTokenListItemCta,
}: UseMusdConversionTokenListItemParams) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const networkName = useNetworkName(chainId ?? ('' as Hex));

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(asset as TokenI);

  const { initiateCustomConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();

  const isStakeable = useSelector((state: RootState) =>
    selectIsStakeableToken(state, asset as TokenI),
  );

  const shouldShowConvertToMusdCta = useMemo(
    () => shouldShowTokenListItemCta(asset),
    [asset, shouldShowTokenListItemCta],
  );

  const handleLendingRedirect = useStablecoinLendingRedirect({
    asset: asset as TokenI,
    location: EVENT_LOCATIONS.HOME_SCREEN,
  });

  const handleConvertToMUSD = useCallback(async () => {
    const submitCtaPressedEvent = () => {
      const { MUSD_CTA_TYPES, EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } =
        MUSD_EVENTS_CONSTANTS;

      const getRedirectLocation = () =>
        hasSeenConversionEducationScreen
          ? MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN
          : MUSD_EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
          .addProperties({
            location: MUSD_EVENT_LOCATIONS.TOKEN_LIST_ITEM,
            redirects_to: getRedirectLocation(),
            cta_type: MUSD_CTA_TYPES.SECONDARY,
            cta_text: strings(
              'earn.musd_conversion.get_a_percentage_musd_bonus',
              { percentage: MUSD_CONVERSION_APY },
            ),
            network_chain_id: chainId,
            network_name: networkName,
            asset_symbol: asset?.symbol,
          })
          .build(),
      );
    };

    try {
      submitCtaPressedEvent();

      if (!asset?.address || !asset?.chainId) {
        throw new Error('Asset address or chain ID is not set');
      }

      await initiateCustomConversion({
        preferredPaymentToken: {
          address: toHex(asset.address),
          chainId: toHex(asset.chainId),
        },
        navigationStack: Routes.EARN.ROOT,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion',
      );
    }
  }, [
    asset?.address,
    asset?.chainId,
    asset?.symbol,
    chainId,
    createEventBuilder,
    hasSeenConversionEducationScreen,
    initiateCustomConversion,
    networkName,
    trackEvent,
  ]);

  const conversionSecondaryBalance =
    useMemo((): ConversionSecondaryBalance | null => {
      if (shouldShowConvertToMusdCta) {
        return {
          text: strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
            percentage: MUSD_CONVERSION_APY,
          }),
          color: TextColor.Primary,
          onPress: handleConvertToMUSD,
        };
      }

      if (
        isStablecoinLendingEnabled &&
        earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ) {
        return {
          text: strings('stake.earn'),
          color: TextColor.Primary,
          onPress: handleLendingRedirect,
        };
      }

      return null;
    }, [
      shouldShowConvertToMusdCta,
      isStablecoinLendingEnabled,
      earnToken?.experience?.type,
      handleConvertToMUSD,
      handleLendingRedirect,
    ]);

  const renderEarnCta = useCallback((): React.ReactNode => {
    // Suppress the stake button when the conversion CTA is already shown in
    // the secondary balance row — avoid two competing calls-to-action.
    if (!asset || shouldShowConvertToMusdCta) {
      return null;
    }

    if (isStakeable && !asset.isStaked) {
      // TODO: Rename StakeButton to EarnCta
      return <StakeButton asset={asset} />;
    }

    return null;
  }, [asset, isStakeable, shouldShowConvertToMusdCta]);

  return { conversionSecondaryBalance, renderEarnCta };
};
