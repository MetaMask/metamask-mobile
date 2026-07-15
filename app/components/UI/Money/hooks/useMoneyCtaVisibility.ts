import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { TokenI } from '../../Tokens/types';
import { isTokenInWildcardList } from '../../Earn/utils/wildcardTokenList';
import {
  selectIsMoneyTokenListItemCtaEnabledFlag,
  selectMoneyDepositCtaTokens,
} from '../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';

const getTokenKey = (address: string, chainId: string) =>
  `${chainId.toLowerCase()}-${address.toLowerCase()}`;

/**
 * Source of truth for Money account CTAs displayed in shared token-list rows.
 */
export const useMoneyCtaVisibility = () => {
  const isTokenListItemCtaEnabled = useSelector(
    selectIsMoneyTokenListItemCtaEnabledFlag,
  );
  const ctaTokens = useSelector(selectMoneyDepositCtaTokens);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { tokens: depositTokens } = useMoneyDepositTokens();

  const ctaTokenKeys = useMemo(
    () =>
      new Set(
        depositTokens.flatMap((token) => {
          if (
            !token.address ||
            !token.chainId ||
            !isTokenInWildcardList(token.symbol, ctaTokens, token.chainId)
          ) {
            return [];
          }

          return [getTokenKey(token.address, token.chainId)];
        }),
      ),
    [ctaTokens, depositTokens],
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

      return ctaTokenKeys.has(getTokenKey(asset.address, asset.chainId));
    },
    [
      ctaTokenKeys,
      isGeoEligible,
      isMoneyAccountReady,
      isTokenListItemCtaEnabled,
    ],
  );

  return { shouldShowMoneyTokenListItemCta };
};
