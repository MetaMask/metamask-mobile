import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { TokenI } from '../../Tokens/types';
import { isEvmTokenAddress } from '../utils/erc20TokenAddressList';
import {
  selectIsMoneyAssetOverviewBalanceCtaEnabledFlag,
  selectIsMoneyAssetOverviewFooterCtaEnabledFlag,
  selectIsMoneyEarnBannerEnabledFlag,
  selectIsMoneyTokenListItemCtaEnabledFlag,
  selectMoneyDepositCtaTokenAddresses,
} from '../selectors/featureFlags';
import { selectMoneyEarnBannerDismissedTokens } from '../../../../reducers/user/selectors';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';

const getTokenKey = (address: string, chainId: string) =>
  `${safeFormatChainIdToHex(chainId).toLowerCase()}-${address.toLowerCase()}`;

/**
 * Source of truth for Money account CTAs displayed in shared token-list rows.
 */
export const useMoneyCtaVisibility = () => {
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
  const { tokens: depositTokens } = useMoneyDepositTokens();

  const configuredCtaTokenKeys = useMemo(
    () =>
      new Set(
        Object.entries(ctaTokenAddresses).flatMap(([chainId, addresses]) =>
          addresses.map((address) => getTokenKey(address, chainId)),
        ),
      ),
    [ctaTokenAddresses],
  );

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

  const isMoneyAccountReady = Boolean(
    vaultConfig && primaryMoneyAccount?.address,
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
