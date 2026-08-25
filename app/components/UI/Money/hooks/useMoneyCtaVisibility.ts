import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMetaMaskPayTokensFlags } from '../../../../selectors/featureFlagController/confirmations';
import { TokenI } from '../../Tokens/types';
import { isEvmTokenAddress } from '../utils/erc20TokenAddressList';
import {
  getBlockedTokensForTransactionType,
  isTokenBlocked,
} from '../../../Views/confirmations/utils/transaction-pay';
import {
  selectIsMoneyAssetOverviewBalanceCtaEnabledFlag,
  selectIsMoneyAssetOverviewFooterCtaEnabledFlag,
  selectIsMoneyEarnBannerEnabledFlag,
  selectIsMoneyTokenListItemCtaEnabledFlag,
  selectMoneyDepositCtaTokenAddresses,
  selectMoneyDepositMinBalance,
} from '../selectors/featureFlags';
import { selectMoneyEarnBannerDismissedTokens } from '../../../../reducers/user/selectors';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';

const getTokenKey = (address: string, chainId: string) =>
  `${safeFormatChainIdToHex(chainId).toLowerCase()}-${address.toLowerCase()}`;

/**
 * Feature flags, geo, vault readiness, and CTA allowlist. Does not subscribe
 * to the full account token list, so Token Details can use it without
 * re-rendering on AssetsController updates for unrelated tokens.
 */
export const useMoneyCtaAllowlistState = () => {
  const isTokenListItemCtaEnabled = useSelector(
    selectIsMoneyTokenListItemCtaEnabledFlag,
  );
  const isAssetOverviewFooterCtaEnabled = useSelector(
    selectIsMoneyAssetOverviewFooterCtaEnabledFlag,
  );
  const isAssetOverviewBalanceCtaEnabled = useSelector(
    selectIsMoneyAssetOverviewBalanceCtaEnabledFlag,
  );
  const ctaTokenAddresses = useSelector(selectMoneyDepositCtaTokenAddresses);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isEarnBannerEnabled = useSelector(selectIsMoneyEarnBannerEnabledFlag);
  const earnBannerDismissedTokens = useSelector(
    selectMoneyEarnBannerDismissedTokens,
  );
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const minDepositBalanceUsd = useSelector(selectMoneyDepositMinBalance);

  const depositBlockedConfig = useMemo(
    () =>
      getBlockedTokensForTransactionType(
        payTokensFlags.blockedTokens,
        TransactionType.moneyAccountDeposit,
      ),
    [payTokensFlags.blockedTokens],
  );

  const configuredCtaTokenKeys = useMemo(
    () =>
      new Set(
        Object.entries(ctaTokenAddresses).flatMap(([chainId, addresses]) =>
          addresses.map((address) => getTokenKey(address, chainId)),
        ),
      ),
    [ctaTokenAddresses],
  );

  const isMoneyAccountReady = Boolean(
    vaultConfig && primaryMoneyAccount?.address,
  );

  return {
    configuredCtaTokenKeys,
    depositBlockedConfig,
    earnBannerDismissedTokens,
    isAssetOverviewBalanceCtaEnabled,
    isAssetOverviewFooterCtaEnabled,
    isEarnBannerEnabled,
    isGeoEligible,
    isMoneyAccountReady,
    isTokenListItemCtaEnabled,
    minDepositBalanceUsd,
  };
};

const isConfiguredCtaAsset = (
  asset: TokenI | undefined,
  configuredCtaTokenKeys: Set<string>,
) =>
  Boolean(
    asset?.address &&
      asset.chainId &&
      configuredCtaTokenKeys.has(getTokenKey(asset.address, asset.chainId)),
  );

/**
 * Asset Overview (Token Details) CTA eligibility for a single token. Takes
 * `hasBalance` directly instead of scanning every held asset via
 * useAccountTokens.
 *
 * The Balance CTA applies the same deposit-eligibility checks as
 * `useMoneyDepositTokens` (MM Pay deposit blocklist, minimum fiat balance),
 * just evaluated for this one asset instead of the user's full token list.
 */
export const useMoneyAssetOverviewCtaVisibility = (
  asset: TokenI,
  hasBalance: boolean,
  balanceFiatUsd?: number,
) => {
  const {
    configuredCtaTokenKeys,
    depositBlockedConfig,
    isAssetOverviewBalanceCtaEnabled,
    isAssetOverviewFooterCtaEnabled,
    isGeoEligible,
    isMoneyAccountReady,
    minDepositBalanceUsd,
  } = useMoneyCtaAllowlistState();

  const isAllowlistedEvmToken =
    isConfiguredCtaAsset(asset, configuredCtaTokenKeys) &&
    isEvmTokenAddress(asset.address);

  const isBaseEligible =
    isGeoEligible && isMoneyAccountReady && isAllowlistedEvmToken;

  const isDepositEligibleForBalance =
    hasBalance &&
    Number.isFinite(balanceFiatUsd) &&
    (balanceFiatUsd as number) >= minDepositBalanceUsd &&
    !isTokenBlocked(
      { address: asset.address, chainId: asset.chainId },
      depositBlockedConfig,
    );

  return {
    isBalanceCtaEligible:
      isAssetOverviewBalanceCtaEnabled &&
      isBaseEligible &&
      isDepositEligibleForBalance,
    isFooterCtaEligible: isAssetOverviewFooterCtaEnabled && isBaseEligible,
  };
};

/**
 * Source of truth for Money account CTAs displayed in shared token-list rows.
 */
export const useMoneyCtaVisibility = () => {
  const {
    configuredCtaTokenKeys,
    earnBannerDismissedTokens,
    isAssetOverviewBalanceCtaEnabled,
    isAssetOverviewFooterCtaEnabled,
    isEarnBannerEnabled,
    isGeoEligible,
    isMoneyAccountReady,
    isTokenListItemCtaEnabled,
  } = useMoneyCtaAllowlistState();
  const { tokens: depositTokens } = useMoneyDepositTokens();

  const ctaDepositTokenKeys = useMemo(
    () =>
      new Set(
        depositTokens.flatMap((token) => {
          if (
            !token.address ||
            !token.chainId ||
            !configuredCtaTokenKeys.has(
              getTokenKey(token.address, token.chainId),
            )
          ) {
            return [];
          }

          return [getTokenKey(token.address, token.chainId)];
        }),
      ),
    [configuredCtaTokenKeys, depositTokens],
  );

  const shouldShowMoneyTokenListItemCta = useCallback(
    (asset?: TokenI) => {
      if (
        !isTokenListItemCtaEnabled ||
        !isGeoEligible ||
        !isMoneyAccountReady ||
        !asset?.address ||
        !asset.chainId
      ) {
        return false;
      }

      return ctaDepositTokenKeys.has(getTokenKey(asset.address, asset.chainId));
    },
    [
      ctaDepositTokenKeys,
      isGeoEligible,
      isMoneyAccountReady,
      isTokenListItemCtaEnabled,
    ],
  );

  const shouldShowMoneyAssetOverviewFooterCta = useCallback(
    (asset?: TokenI) => {
      if (
        !isAssetOverviewFooterCtaEnabled ||
        !isGeoEligible ||
        !isMoneyAccountReady ||
        !asset?.address ||
        !asset?.chainId
      ) {
        return false;
      }

      return (
        isEvmTokenAddress(asset.address) &&
        configuredCtaTokenKeys.has(getTokenKey(asset.address, asset.chainId))
      );
    },
    [
      configuredCtaTokenKeys,
      isAssetOverviewFooterCtaEnabled,
      isGeoEligible,
      isMoneyAccountReady,
    ],
  );

  const shouldShowMoneyAssetOverviewBalanceCta = useCallback(
    (asset?: TokenI) => {
      if (
        !isAssetOverviewBalanceCtaEnabled ||
        !isGeoEligible ||
        !isMoneyAccountReady ||
        !asset?.address ||
        !asset.chainId
      ) {
        return false;
      }

      return ctaDepositTokenKeys.has(getTokenKey(asset.address, asset.chainId));
    },
    [
      ctaDepositTokenKeys,
      isAssetOverviewBalanceCtaEnabled,
      isGeoEligible,
      isMoneyAccountReady,
    ],
  );

  const shouldShowMoneyEarnBanner = useCallback(
    (asset?: TokenI) => {
      if (
        !isEarnBannerEnabled ||
        !isGeoEligible ||
        !isMoneyAccountReady ||
        !asset?.address ||
        !asset.chainId
      ) {
        return false;
      }

      if (
        earnBannerDismissedTokens[getTokenKey(asset.address, asset.chainId)]
      ) {
        return false;
      }

      return configuredCtaTokenKeys.has(
        getTokenKey(asset.address, asset.chainId),
      );
    },
    [
      configuredCtaTokenKeys,
      earnBannerDismissedTokens,
      isEarnBannerEnabled,
      isGeoEligible,
      isMoneyAccountReady,
    ],
  );

  return {
    shouldShowMoneyTokenListItemCta,
    shouldShowMoneyAssetOverviewFooterCta,
    shouldShowMoneyAssetOverviewBalanceCta,
    shouldShowMoneyEarnBanner,
  };
};
