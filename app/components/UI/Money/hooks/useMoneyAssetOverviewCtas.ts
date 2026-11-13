import { useCallback, useMemo } from 'react';
import { toHex } from '@metamask/controller-utils';
import BigNumber from 'bignumber.js';
import type { TokenI } from '../../Tokens/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import { calculateProjectedEarnings } from '../utils/projections';
import useMoneyVaultApy from './useMoneyVaultApy';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyAssetOverviewCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyCtaDepositNavigation } from './useMoneyDepositNavigation';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
} from '../../TokenDetails/components/abTestConfig';
import { STABLECOIN_TOKEN_SYMBOLS } from '../constants/moneyTokens';

const FOOTER_LABEL_KEY = 'money.asset_overview.cta.earn_apy';
const BALANCE_BUTTON_LABEL_KEY = 'money.asset_overview.cta.start_earning';

export interface UseMoneyAssetOverviewCtasArgs {
  asset: TokenI;
  balanceFiatUsd: number;
  hasBalance: boolean;
}

/**
 * Supplies the state and Money-account actions used by Asset Overview CTAs.
 * The hook subscribes once at the screen level so footer and balance content
 * share one APY query, visibility evaluation, and deposit handler.
 */
export const useMoneyAssetOverviewCtas = ({
  asset,
  balanceFiatUsd,
  hasBalance,
}: UseMoneyAssetOverviewCtasArgs) => {
  const isStablecoin = STABLECOIN_TOKEN_SYMBOLS.some(
    (symbol) => symbol === asset.symbol,
  );

  const {
    isBalanceCtaEligible,
    isFooterCtaEligible: isFooterCtaEligibleFromVisibility,
  } = useMoneyAssetOverviewCtaVisibility(asset, hasBalance, balanceFiatUsd);

  const isStablecoinFooterCtaEligible =
    isFooterCtaEligibleFromVisibility && isStablecoin;

  const { variant: stablecoinFooterCtaVariant } = useABTest(
    EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
    EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
    {
      ...EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
      trackExposure: isStablecoinFooterCtaEligible,
    },
  );
  const isStablecoinFooterCtaEnabled =
    isStablecoinFooterCtaEligible &&
    stablecoinFooterCtaVariant.showMoneyDepositFooterCta;

  const isATokenFooterCtaEligible =
    isFooterCtaEligibleFromVisibility && !isStablecoin;

  const isFooterCtaEligible =
    isStablecoinFooterCtaEnabled || isATokenFooterCtaEligible;

  const { navigateToMoneyDeposit } = useMoneyCtaDepositNavigation();
  const { apyDecimal, apyPercent, vaultApyQuery } = useMoneyVaultApy({
    enabled: isBalanceCtaEligible || isFooterCtaEligible,
  });
  const { trackTokenButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ASSET_DETAIL,
  });

  const hasApy = apyDecimal !== undefined && apyPercent !== undefined;
  const isApyLoading = vaultApyQuery.isLoading;

  const footerLabelLocalized = useMemo(
    () =>
      apyPercent === undefined
        ? undefined
        : strings(FOOTER_LABEL_KEY, { apy: apyPercent }),
    [apyPercent],
  );
  const footerEnglishLabel = useMemo(
    () =>
      apyPercent === undefined
        ? undefined
        : strings(FOOTER_LABEL_KEY, { apy: apyPercent, locale: 'en' }),
    [apyPercent],
  );

  const projectedEarnings = useMemo(() => {
    if (
      !Number.isFinite(balanceFiatUsd) ||
      balanceFiatUsd < 0 ||
      apyDecimal === undefined
    ) {
      return undefined;
    }

    return calculateProjectedEarnings(balanceFiatUsd, apyDecimal);
  }, [apyDecimal, balanceFiatUsd]);

  const projectedEarningsFormatted = useMemo(
    () =>
      projectedEarnings === undefined
        ? undefined
        : moneyFormatUsd(new BigNumber(projectedEarnings)),
    [projectedEarnings],
  );

  const startDeposit = useCallback(
    async (
      component: 'footer' | 'balance',
      labelKey: string,
      label: string | undefined,
    ) => {
      if (!asset.address || !asset.chainId || !label) {
        Logger.error(
          new Error('Asset address, chain ID, or CTA label is not set'),
          '[Money Account] Failed to initiate deposit from Asset Overview CTA',
        );
        return;
      }

      const preferredPaymentToken = {
        address: toHex(asset.address),
        chainId: toHex(asset.chainId),
      };
      try {
        await navigateToMoneyDeposit({
          preferredPaymentToken,
          track: ({ redirect_target, button_intent }) => {
            const trackingProperties = {
              button_type: MONEY_BUTTON_TYPES.TEXT,
              button_intent,
              component_name:
                component === 'footer'
                  ? COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_FOOTER_CTA
                  : COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_BALANCE_CTA,
              redirect_target,
              token_symbol: asset.symbol ?? '',
              token_position_in_list: 1,
              token_chain_id: asset.chainId ?? '',
              tokens_in_list: 1,
              token_has_balance: hasBalance,
            } as const;

            if (component === 'footer') {
              trackTokenButtonClicked({
                ...trackingProperties,
                label_en: footerEnglishLabel ?? label,
                label_localized: label,
              });
            } else {
              trackTokenButtonClicked({
                ...trackingProperties,
                label_key: labelKey,
              });
            }
          },
        });
      } catch (error) {
        Logger.error(
          error as Error,
          '[Money Account] Failed to initiate deposit from Asset Overview CTA',
        );
      }
    },
    [
      asset.address,
      asset.chainId,
      asset.symbol,
      footerEnglishLabel,
      hasBalance,
      navigateToMoneyDeposit,
      trackTokenButtonClicked,
    ],
  );

  const onFooterPress = useCallback(
    () => startDeposit('footer', FOOTER_LABEL_KEY, footerLabelLocalized),
    [footerLabelLocalized, startDeposit],
  );

  const onBalancePress = useCallback(
    () =>
      startDeposit(
        'balance',
        BALANCE_BUTTON_LABEL_KEY,
        strings(BALANCE_BUTTON_LABEL_KEY),
      ),
    [startDeposit],
  );

  return {
    footerLabelLocalized,
    isFooterCtaEligible,
    isBalanceCtaLoading: isBalanceCtaEligible && isApyLoading,
    isBalanceCtaVisible: isBalanceCtaEligible && hasApy,
    isFooterCtaLoading: isFooterCtaEligible && isApyLoading,
    isFooterCtaVisible: isFooterCtaEligible && hasApy,
    onBalancePress,
    onFooterPress,
    projectedEarningsFormatted,
    apyPercent,
  };
};
